/**
 * Cash flow forecasting engine for FlowLedger.
 *
 * Uses a weighted moving average + seasonal adjustment model to project
 * income and expenses for the next N weeks. Generates alerts for
 * predicted cash flow gaps.
 */

import type {
  CashFlowAlert,
  CashFlowForecast,
  ForecastDataPoint,
  Transaction,
} from '../types';
import { addWeeks, startOfWeek, format, parseISO } from '../utils/dates';

// ─── Configuration ────────────────────────────────────────────────────────────

const FORECAST_WEEKS = 12;
const MINIMUM_SAFE_BALANCE = 500; // alert threshold
const WEEKS_HISTORY_FOR_AVERAGE = 12;

// Weights for weighted moving average (most recent weeks weighted higher)
const WEEK_WEIGHTS = [3, 3, 2, 2, 2, 1, 1, 1, 1, 1, 0.5, 0.5];

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeeklyBucket {
  weekStart: Date;
  income: number;
  expenses: number;
  transactions: number;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Groups transactions into weekly buckets.
 */
export function groupTransactionsByWeek(transactions: Transaction[]): WeeklyBucket[] {
  const bucketMap = new Map<string, WeeklyBucket>();

  for (const tx of transactions) {
    const txDate = parseISO(tx.date);
    const weekStart = startOfWeek(txDate, { weekStartsOn: 1 }); // Monday
    const key = format(weekStart, 'yyyy-MM-dd');

    if (!bucketMap.has(key)) {
      bucketMap.set(key, { weekStart, income: 0, expenses: 0, transactions: 0 });
    }

    const bucket = bucketMap.get(key)!;
    if (tx.amount > 0) {
      bucket.income += tx.amount;
    } else {
      bucket.expenses += Math.abs(tx.amount);
    }
    bucket.transactions++;
  }

  return Array.from(bucketMap.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
  );
}

/**
 * Calculates a weighted moving average of weekly income/expenses.
 */
export function calculateWeightedAverage(
  buckets: WeeklyBucket[],
  field: 'income' | 'expenses',
  numWeeks = WEEKS_HISTORY_FOR_AVERAGE
): number {
  const recentBuckets = buckets.slice(-numWeeks);
  if (recentBuckets.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  recentBuckets.forEach((bucket, idx) => {
    const weight = WEEK_WEIGHTS[recentBuckets.length - 1 - idx] ?? 0.5;
    weightedSum += bucket[field] * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Calculates income variability (coefficient of variation).
 * Higher = more unpredictable income.
 */
export function calculateIncomeVariability(buckets: WeeklyBucket[]): number {
  if (buckets.length < 2) return 0.5; // assume moderate variability with no data

  const incomes = buckets.map((b) => b.income);
  const mean = incomes.reduce((a, b) => a + b, 0) / incomes.length;
  if (mean === 0) return 1;

  const variance = incomes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / incomes.length;
  const stdDev = Math.sqrt(variance);

  return Math.min(1, stdDev / mean); // coefficient of variation, capped at 1
}

/**
 * Calculates a confidence score for the forecast based on data availability.
 * More historical data → higher confidence.
 */
export function calculateConfidenceScore(
  numWeeksOfData: number,
  variability: number
): number {
  const dataMaturyScore = Math.min(1, numWeeksOfData / WEEKS_HISTORY_FOR_AVERAGE);
  const stabilityScore = 1 - variability;
  return Math.round((dataMaturyScore * 0.6 + stabilityScore * 0.4) * 100) / 100;
}

/**
 * Projects the balance forward over N weeks using historical averages.
 */
export function projectCashFlow(params: {
  currentBalance: number;
  avgWeeklyIncome: number;
  avgWeeklyExpenses: number;
  variability: number;
  weeks?: number;
  knownIncomingPayments?: Array<{ date: string; amount: number }>;
}): ForecastDataPoint[] {
  const {
    currentBalance,
    avgWeeklyIncome,
    avgWeeklyExpenses,
    variability,
    weeks = FORECAST_WEEKS,
    knownIncomingPayments = [],
  } = params;

  const dataPoints: ForecastDataPoint[] = [];
  let runningBalance = currentBalance;
  const today = new Date();
  const forecastStart = startOfWeek(today, { weekStartsOn: 1 });

  for (let i = 0; i < weeks; i++) {
    const weekStart = addWeeks(forecastStart, i);
    const weekKey = format(weekStart, 'yyyy-MM-dd');

    // Add any known incoming payments this week
    const knownIncoming = knownIncomingPayments
      .filter((p) => {
        const pDate = parseISO(p.date);
        const weekEnd = addWeeks(weekStart, 1);
        return pDate >= weekStart && pDate < weekEnd;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    // Apply slight downward adjustment for variability in projected income
    // (conservative estimate: income may be lower than average in dry spells)
    const conservatism = 1 - variability * 0.3;
    const projectedIncome = avgWeeklyIncome * conservatism + knownIncoming;
    const projectedExpenses = avgWeeklyExpenses;
    const netCashFlow = projectedIncome - projectedExpenses;

    runningBalance += netCashFlow;

    dataPoints.push({
      weekStart: weekKey,
      projectedIncome,
      projectedExpenses,
      projectedBalance: runningBalance,
      isRisk: runningBalance < MINIMUM_SAFE_BALANCE,
    });
  }

  return dataPoints;
}

/**
 * Generates cash flow alerts based on forecast data.
 */
export function generateCashFlowAlerts(
  dataPoints: ForecastDataPoint[],
  monthlyTaxDue?: number,
  overdueInvoiceTotal?: number
): CashFlowAlert[] {
  const alerts: CashFlowAlert[] = [];

  // Check for low balance weeks
  const riskWeeks = dataPoints.filter((d) => d.isRisk);
  if (riskWeeks.length > 0) {
    const firstRiskWeek = riskWeeks[0];
    alerts.push({
      id: `low-balance-${firstRiskWeek.weekStart}`,
      type: 'low_balance',
      severity: firstRiskWeek.projectedBalance < 0 ? 'critical' : 'warning',
      title: 'Projected Cash Gap',
      message: `Your balance is projected to drop to $${Math.round(firstRiskWeek.projectedBalance).toLocaleString()} the week of ${firstRiskWeek.weekStart}. Consider building your reserve now.`,
      weekStart: firstRiskWeek.weekStart,
      actionLabel: 'View Forecast',
    });
  }

  // Check for consecutive income gaps (3+ weeks below average)
  let incomeGapStreak = 0;
  for (const dp of dataPoints) {
    if (dp.projectedIncome < dp.projectedExpenses * 0.7) {
      incomeGapStreak++;
    } else {
      incomeGapStreak = 0;
    }
    if (incomeGapStreak >= 3) {
      alerts.push({
        id: `income-gap-${dp.weekStart}`,
        type: 'income_gap',
        severity: 'warning',
        title: 'Projected Income Gap',
        message:
          'Your projected income is expected to be significantly below expenses for 3+ consecutive weeks. Consider reaching out to clients or taking on new projects.',
        weekStart: dp.weekStart,
        actionLabel: 'Review Invoices',
      });
      break;
    }
  }

  // Tax due alert
  if (monthlyTaxDue && monthlyTaxDue > 500) {
    alerts.push({
      id: 'tax-reserve',
      type: 'tax_due',
      severity: 'info',
      title: 'Quarterly Tax Payment Due',
      message: `Set aside $${monthlyTaxDue.toLocaleString()} per month to cover your next quarterly estimated tax payment.`,
      actionLabel: 'View Tax Estimate',
    });
  }

  // Overdue invoices alert
  if (overdueInvoiceTotal && overdueInvoiceTotal > 0) {
    alerts.push({
      id: 'overdue-invoices',
      type: 'invoice_overdue',
      severity: overdueInvoiceTotal > 2000 ? 'critical' : 'warning',
      title: `$${overdueInvoiceTotal.toLocaleString()} in Overdue Invoices`,
      message: `You have overdue invoices totaling $${overdueInvoiceTotal.toLocaleString()}. Following up could improve your near-term cash flow.`,
      actionLabel: 'View Invoices',
    });
  }

  return alerts;
}

/**
 * Main function: generates a complete cash flow forecast.
 */
export function generateCashFlowForecast(params: {
  transactions: Transaction[];
  currentBalance: number;
  knownIncomingPayments?: Array<{ date: string; amount: number }>;
  monthlyTaxDue?: number;
  overdueInvoiceTotal?: number;
}): CashFlowForecast {
  const { transactions, currentBalance, knownIncomingPayments, monthlyTaxDue, overdueInvoiceTotal } =
    params;

  const weeklyBuckets = groupTransactionsByWeek(transactions);
  const avgWeeklyIncome = calculateWeightedAverage(weeklyBuckets, 'income');
  const avgWeeklyExpenses = calculateWeightedAverage(weeklyBuckets, 'expenses');
  const variability = calculateIncomeVariability(weeklyBuckets);
  const confidence = calculateConfidenceScore(weeklyBuckets.length, variability);

  const dataPoints = projectCashFlow({
    currentBalance,
    avgWeeklyIncome,
    avgWeeklyExpenses,
    variability,
    knownIncomingPayments,
  });

  const alerts = generateCashFlowAlerts(dataPoints, monthlyTaxDue, overdueInvoiceTotal);

  // Recommend a reserve equal to 2x average monthly expenses
  const avgMonthlyExpenses = avgWeeklyExpenses * 4.33;
  const recommendedReserve = avgMonthlyExpenses * 2;

  return {
    generatedAt: new Date().toISOString(),
    periodWeeks: FORECAST_WEEKS,
    dataPoints,
    alerts,
    confidenceScore: confidence,
    averageMonthlyIncome: avgWeeklyIncome * 4.33,
    averageMonthlyExpenses: avgMonthlyExpenses,
    recommendedReserve,
  };
}

/**
 * Calculates what percentage of income should be set aside for taxes.
 * Used for the "tax savings bucket" auto-fill recommendation.
 */
export function calculateTaxSetAsidePercent(effectiveTaxRate: number): number {
  // Add a small buffer above the effective rate
  return Math.min(0.40, effectiveTaxRate + 0.05);
}

/**
 * Returns the months with historically high income for a freelancer.
 * Used to suggest proactive saving during strong months.
 */
export function getHighIncomeMonths(transactions: Transaction[]): number[] {
  const monthlyIncome: Record<number, number> = {};

  for (const tx of transactions) {
    if (tx.amount <= 0) continue;
    const month = parseISO(tx.date).getMonth();
    monthlyIncome[month] = (monthlyIncome[month] ?? 0) + tx.amount;
  }

  if (Object.keys(monthlyIncome).length === 0) return [];

  const values = Object.values(monthlyIncome);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  return Object.entries(monthlyIncome)
    .filter(([, income]) => income > avg * 1.2)
    .map(([month]) => parseInt(month, 10));
}
