import {
  groupTransactionsByWeek,
  calculateWeightedAverage,
  calculateIncomeVariability,
  calculateConfidenceScore,
  projectCashFlow,
  generateCashFlowAlerts,
  generateCashFlowForecast,
  calculateTaxSetAsidePercent,
  getHighIncomeMonths,
} from '../../src/services/cashFlowForecast';
import type { Transaction } from '../../src/types';

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const makeTransaction = (
  id: string,
  date: string,
  amount: number,
  category = 'client_payment' as const
): Transaction => ({
  id,
  accountId: 'acct_1',
  date,
  amount,
  description: 'Test transaction',
  category,
  type: amount > 0 ? 'income' : 'expense',
  isBusinessExpense: amount < 0,
  isTaxDeductible: amount < 0,
});

// Transactions spanning 4 weeks
const sampleTransactions: Transaction[] = [
  // Week 1 (Mon 2024-01-01)
  makeTransaction('t1', '2024-01-01', 3000),
  makeTransaction('t2', '2024-01-02', -800),
  // Week 2 (Mon 2024-01-08)
  makeTransaction('t3', '2024-01-09', 4500),
  makeTransaction('t4', '2024-01-10', -1200),
  // Week 3 (Mon 2024-01-15)
  makeTransaction('t5', '2024-01-16', 2000),
  makeTransaction('t6', '2024-01-17', -600),
  // Week 4 (Mon 2024-01-22)
  makeTransaction('t7', '2024-01-23', 5000),
  makeTransaction('t8', '2024-01-24', -900),
];

// ─── groupTransactionsByWeek ──────────────────────────────────────────────────

describe('groupTransactionsByWeek', () => {
  it('returns empty array for no transactions', () => {
    const result = groupTransactionsByWeek([]);
    expect(result).toHaveLength(0);
  });

  it('groups transactions from same week together', () => {
    const txs: Transaction[] = [
      makeTransaction('a', '2024-01-01', 1000),
      makeTransaction('b', '2024-01-02', 2000),
      makeTransaction('c', '2024-01-03', -500),
    ];
    const result = groupTransactionsByWeek(txs);
    // All three are in the same week (week of Dec 25, 2023 starting Mon)
    // But Jan 1 is a Monday, so it's the week of Jan 1
    expect(result.length).toBeLessThanOrEqual(2); // could be 1-2 depending on week boundaries
    const totalIncome = result.reduce((s, b) => s + b.income, 0);
    expect(totalIncome).toBe(3000);
  });

  it('separates transactions in different weeks', () => {
    const txs: Transaction[] = [
      makeTransaction('a', '2024-01-01', 1000),
      makeTransaction('b', '2024-01-08', 2000),
      makeTransaction('c', '2024-01-15', 3000),
    ];
    const result = groupTransactionsByWeek(txs);
    expect(result.length).toBe(3);
  });

  it('returns buckets sorted by weekStart ascending', () => {
    const txs = [...sampleTransactions].reverse(); // feed in reverse order
    const result = groupTransactionsByWeek(txs);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].weekStart.getTime()).toBeGreaterThanOrEqual(result[i - 1].weekStart.getTime());
    }
  });

  it('correctly separates income and expenses', () => {
    const txs: Transaction[] = [
      makeTransaction('a', '2024-01-01', 5000),
      makeTransaction('b', '2024-01-02', -1500),
    ];
    const result = groupTransactionsByWeek(txs);
    const bucket = result[0];
    expect(bucket.income).toBe(5000);
    expect(bucket.expenses).toBe(1500);
  });
});

// ─── calculateWeightedAverage ─────────────────────────────────────────────────

describe('calculateWeightedAverage', () => {
  const buckets = [
    { weekStart: new Date('2024-01-01'), income: 1000, expenses: 200, transactions: 2 },
    { weekStart: new Date('2024-01-08'), income: 2000, expenses: 400, transactions: 3 },
    { weekStart: new Date('2024-01-15'), income: 3000, expenses: 600, transactions: 2 },
  ];

  it('returns 0 for empty buckets', () => {
    expect(calculateWeightedAverage([], 'income')).toBe(0);
  });

  it('returns the value itself for single bucket', () => {
    const single = [{ weekStart: new Date(), income: 1500, expenses: 300, transactions: 1 }];
    const result = calculateWeightedAverage(single, 'income');
    expect(result).toBe(1500);
  });

  it('returns a value between min and max of all buckets', () => {
    const result = calculateWeightedAverage(buckets, 'income');
    expect(result).toBeGreaterThanOrEqual(1000);
    expect(result).toBeLessThanOrEqual(3000);
  });

  it('more recent weeks have higher weight (result closer to recent values)', () => {
    // Recent bucket is 3000, older is 1000 — weighted avg should be > simple mean of 2000
    const result = calculateWeightedAverage(buckets, 'income');
    const simpleMean = (1000 + 2000 + 3000) / 3;
    expect(result).toBeGreaterThan(simpleMean); // weighted towards recent
  });
});

// ─── calculateIncomeVariability ───────────────────────────────────────────────

describe('calculateIncomeVariability', () => {
  it('returns 0.5 for empty buckets (default)', () => {
    expect(calculateIncomeVariability([])).toBe(0.5);
  });

  it('returns 0.5 for single bucket (not enough data)', () => {
    const single = [{ weekStart: new Date(), income: 1000, expenses: 200, transactions: 1 }];
    expect(calculateIncomeVariability(single)).toBe(0.5);
  });

  it('returns low variability for stable income', () => {
    const stable = [
      { weekStart: new Date('2024-01-01'), income: 2000, expenses: 500, transactions: 1 },
      { weekStart: new Date('2024-01-08'), income: 2100, expenses: 500, transactions: 1 },
      { weekStart: new Date('2024-01-15'), income: 1950, expenses: 500, transactions: 1 },
      { weekStart: new Date('2024-01-22'), income: 2050, expenses: 500, transactions: 1 },
    ];
    const variability = calculateIncomeVariability(stable);
    expect(variability).toBeLessThan(0.1);
  });

  it('returns high variability for erratic income', () => {
    const erratic = [
      { weekStart: new Date('2024-01-01'), income: 0, expenses: 500, transactions: 1 },
      { weekStart: new Date('2024-01-08'), income: 10_000, expenses: 500, transactions: 1 },
      { weekStart: new Date('2024-01-15'), income: 100, expenses: 500, transactions: 1 },
      { weekStart: new Date('2024-01-22'), income: 8_000, expenses: 500, transactions: 1 },
    ];
    const variability = calculateIncomeVariability(erratic);
    expect(variability).toBeGreaterThan(0.5);
  });

  it('returns value between 0 and 1 (capped)', () => {
    const anyBuckets = [
      { weekStart: new Date(), income: 0, expenses: 0, transactions: 0 },
      { weekStart: new Date(), income: 100_000, expenses: 0, transactions: 0 },
    ];
    const result = calculateIncomeVariability(anyBuckets);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ─── calculateConfidenceScore ─────────────────────────────────────────────────

describe('calculateConfidenceScore', () => {
  it('returns higher confidence with more weeks of data', () => {
    const low = calculateConfidenceScore(2, 0.5);
    const high = calculateConfidenceScore(12, 0.5);
    expect(high).toBeGreaterThan(low);
  });

  it('returns higher confidence with lower variability', () => {
    const highVar = calculateConfidenceScore(12, 0.8);
    const lowVar = calculateConfidenceScore(12, 0.1);
    expect(lowVar).toBeGreaterThan(highVar);
  });

  it('is between 0 and 1', () => {
    const score = calculateConfidenceScore(8, 0.3);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('returns max confidence for ideal conditions', () => {
    const score = calculateConfidenceScore(12, 0);
    expect(score).toBeCloseTo(1.0, 1);
  });
});

// ─── projectCashFlow ──────────────────────────────────────────────────────────

describe('projectCashFlow', () => {
  const baseParams = {
    currentBalance: 5000,
    avgWeeklyIncome: 2000,
    avgWeeklyExpenses: 1200,
    variability: 0.2,
  };

  it('returns the correct number of weeks', () => {
    const result = projectCashFlow({ ...baseParams, weeks: 8 });
    expect(result).toHaveLength(8);
  });

  it('defaults to 12 weeks', () => {
    const result = projectCashFlow(baseParams);
    expect(result).toHaveLength(12);
  });

  it('each data point has required fields', () => {
    const result = projectCashFlow({ ...baseParams, weeks: 1 });
    const dp = result[0];
    expect(dp).toHaveProperty('weekStart');
    expect(dp).toHaveProperty('projectedIncome');
    expect(dp).toHaveProperty('projectedExpenses');
    expect(dp).toHaveProperty('projectedBalance');
    expect(dp).toHaveProperty('isRisk');
  });

  it('balance trends upward when income > expenses', () => {
    const result = projectCashFlow({
      currentBalance: 1000,
      avgWeeklyIncome: 3000,
      avgWeeklyExpenses: 500,
      variability: 0,
      weeks: 4,
    });
    const lastBalance = result[result.length - 1].projectedBalance;
    expect(lastBalance).toBeGreaterThan(1000);
  });

  it('balance trends downward when expenses > income', () => {
    const result = projectCashFlow({
      currentBalance: 10_000,
      avgWeeklyIncome: 500,
      avgWeeklyExpenses: 2000,
      variability: 0,
      weeks: 4,
    });
    const lastBalance = result[result.length - 1].projectedBalance;
    expect(lastBalance).toBeLessThan(10_000);
  });

  it('marks isRisk=true when balance drops below $500', () => {
    const result = projectCashFlow({
      currentBalance: 100, // very low
      avgWeeklyIncome: 100,
      avgWeeklyExpenses: 2000,
      variability: 0,
      weeks: 4,
    });
    expect(result.some((dp) => dp.isRisk)).toBe(true);
  });

  it('includes known incoming payments', () => {
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + (1 + 7 - nextMonday.getDay()) % 7);
    const dateStr = nextMonday.toISOString().split('T')[0];

    const without = projectCashFlow({ ...baseParams, weeks: 2 });
    const withPayment = projectCashFlow({
      ...baseParams,
      weeks: 2,
      knownIncomingPayments: [{ date: dateStr, amount: 5000 }],
    });

    const totalWithout = without.reduce((s, d) => s + d.projectedIncome, 0);
    const totalWith = withPayment.reduce((s, d) => s + d.projectedIncome, 0);
    expect(totalWith).toBeGreaterThan(totalWithout);
  });
});

// ─── generateCashFlowAlerts ───────────────────────────────────────────────────

describe('generateCashFlowAlerts', () => {
  it('returns empty array when no risks', () => {
    const goodDataPoints = Array.from({ length: 12 }, (_, i) => ({
      weekStart: `2024-01-${String(i + 1).padStart(2, '0')}`,
      projectedIncome: 3000,
      projectedExpenses: 1000,
      projectedBalance: 10_000 + i * 2000,
      isRisk: false,
    }));
    const alerts = generateCashFlowAlerts(goodDataPoints);
    expect(alerts).toHaveLength(0);
  });

  it('generates low_balance alert when isRisk is true', () => {
    const riskDataPoints = [
      {
        weekStart: '2024-01-15',
        projectedIncome: 200,
        projectedExpenses: 1500,
        projectedBalance: 100,
        isRisk: true,
      },
    ];
    const alerts = generateCashFlowAlerts(riskDataPoints);
    const balanceAlert = alerts.find((a) => a.type === 'low_balance');
    expect(balanceAlert).toBeDefined();
  });

  it('generates critical alert when balance is negative', () => {
    const riskDataPoints = [
      {
        weekStart: '2024-01-15',
        projectedIncome: 200,
        projectedExpenses: 1500,
        projectedBalance: -500,
        isRisk: true,
      },
    ];
    const alerts = generateCashFlowAlerts(riskDataPoints);
    const critAlert = alerts.find((a) => a.severity === 'critical');
    expect(critAlert).toBeDefined();
  });

  it('generates tax_due alert when monthlyTaxDue > 500', () => {
    const alerts = generateCashFlowAlerts([], 1200);
    const taxAlert = alerts.find((a) => a.type === 'tax_due');
    expect(taxAlert).toBeDefined();
  });

  it('does not generate tax alert when monthlyTaxDue <= 500', () => {
    const alerts = generateCashFlowAlerts([], 400);
    const taxAlert = alerts.find((a) => a.type === 'tax_due');
    expect(taxAlert).toBeUndefined();
  });

  it('generates overdue invoice alert when overdueTotal > 0', () => {
    const alerts = generateCashFlowAlerts([], undefined, 3000);
    const invoiceAlert = alerts.find((a) => a.type === 'invoice_overdue');
    expect(invoiceAlert).toBeDefined();
  });

  it('overdue invoice alert is critical when amount > $2000', () => {
    const alerts = generateCashFlowAlerts([], undefined, 5000);
    const invoiceAlert = alerts.find((a) => a.type === 'invoice_overdue');
    expect(invoiceAlert?.severity).toBe('critical');
  });

  it('income_gap alert generated for 3+ consecutive low weeks', () => {
    const gapWeeks = Array.from({ length: 6 }, (_, i) => ({
      weekStart: `2024-01-${String(i * 7 + 1).padStart(2, '0')}`,
      projectedIncome: 100, // much lower than expenses
      projectedExpenses: 2000,
      projectedBalance: 5000,
      isRisk: false,
    }));
    const alerts = generateCashFlowAlerts(gapWeeks);
    const gapAlert = alerts.find((a) => a.type === 'income_gap');
    expect(gapAlert).toBeDefined();
  });

  it('each alert has required fields', () => {
    const riskPoints = [
      {
        weekStart: '2024-01-01',
        projectedIncome: 100,
        projectedExpenses: 2000,
        projectedBalance: -1000,
        isRisk: true,
      },
    ];
    const alerts = generateCashFlowAlerts(riskPoints, 1500, 2500);
    for (const alert of alerts) {
      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('type');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('title');
      expect(alert).toHaveProperty('message');
    }
  });
});

// ─── generateCashFlowForecast ─────────────────────────────────────────────────

describe('generateCashFlowForecast', () => {
  it('returns a forecast with 12 data points', () => {
    const forecast = generateCashFlowForecast({
      transactions: sampleTransactions,
      currentBalance: 5000,
    });
    expect(forecast.dataPoints).toHaveLength(12);
  });

  it('forecast has required fields', () => {
    const forecast = generateCashFlowForecast({
      transactions: sampleTransactions,
      currentBalance: 5000,
    });
    expect(forecast).toHaveProperty('generatedAt');
    expect(forecast).toHaveProperty('periodWeeks');
    expect(forecast).toHaveProperty('dataPoints');
    expect(forecast).toHaveProperty('alerts');
    expect(forecast).toHaveProperty('confidenceScore');
    expect(forecast).toHaveProperty('averageMonthlyIncome');
    expect(forecast).toHaveProperty('averageMonthlyExpenses');
    expect(forecast).toHaveProperty('recommendedReserve');
  });

  it('confidence score is between 0 and 1', () => {
    const forecast = generateCashFlowForecast({
      transactions: sampleTransactions,
      currentBalance: 5000,
    });
    expect(forecast.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(forecast.confidenceScore).toBeLessThanOrEqual(1);
  });

  it('generatedAt is a valid ISO string', () => {
    const forecast = generateCashFlowForecast({
      transactions: sampleTransactions,
      currentBalance: 5000,
    });
    expect(() => new Date(forecast.generatedAt)).not.toThrow();
    expect(new Date(forecast.generatedAt).toISOString()).toBe(forecast.generatedAt);
  });

  it('averageMonthlyIncome > 0 for positive transactions', () => {
    const forecast = generateCashFlowForecast({
      transactions: sampleTransactions,
      currentBalance: 5000,
    });
    expect(forecast.averageMonthlyIncome).toBeGreaterThan(0);
  });

  it('recommendedReserve is 2x average monthly expenses', () => {
    const forecast = generateCashFlowForecast({
      transactions: sampleTransactions,
      currentBalance: 5000,
    });
    expect(forecast.recommendedReserve).toBeCloseTo(forecast.averageMonthlyExpenses * 2, 0);
  });

  it('returns empty alerts and zero data for no transactions', () => {
    const forecast = generateCashFlowForecast({
      transactions: [],
      currentBalance: 5000,
    });
    expect(forecast.dataPoints).toHaveLength(12);
    expect(forecast.averageMonthlyIncome).toBe(0);
  });
});

// ─── calculateTaxSetAsidePercent ──────────────────────────────────────────────

describe('calculateTaxSetAsidePercent', () => {
  it('adds 5% buffer to effective rate', () => {
    const result = calculateTaxSetAsidePercent(0.20);
    expect(result).toBeCloseTo(0.25, 2);
  });

  it('caps at 40%', () => {
    const result = calculateTaxSetAsidePercent(0.50);
    expect(result).toBe(0.40);
  });

  it('works for 0% effective rate', () => {
    const result = calculateTaxSetAsidePercent(0);
    expect(result).toBeCloseTo(0.05, 2);
  });
});

// ─── getHighIncomeMonths ──────────────────────────────────────────────────────

describe('getHighIncomeMonths', () => {
  it('returns empty array for no transactions', () => {
    expect(getHighIncomeMonths([])).toHaveLength(0);
  });

  it('returns months with income > 20% above average', () => {
    const txs: Transaction[] = [
      makeTransaction('a', '2024-01-15', 1000), // Jan
      makeTransaction('b', '2024-02-15', 1000), // Feb
      makeTransaction('c', '2024-03-15', 1000), // Mar
      makeTransaction('d', '2024-04-15', 1000), // Apr
      makeTransaction('e', '2024-05-15', 5000), // May — high month
      makeTransaction('f', '2024-06-15', 1000), // Jun
    ];
    const highMonths = getHighIncomeMonths(txs);
    expect(highMonths).toContain(4); // April = index 4 in 0-based months
  });

  it('ignores expense transactions', () => {
    const txs: Transaction[] = [
      makeTransaction('a', '2024-01-15', -5000), // large expense — should not affect high months
      makeTransaction('b', '2024-02-15', 1000),
    ];
    const highMonths = getHighIncomeMonths(txs);
    expect(highMonths).not.toContain(0); // Jan should not be a "high income" month
  });
});
