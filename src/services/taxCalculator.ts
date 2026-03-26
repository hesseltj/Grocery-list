/**
 * Tax calculation engine for FlowLedger.
 *
 * Implements IRS self-employment tax rules for 2024/2025:
 * - Self-employment tax: 15.3% on first $168,600 of net SE income (2024 cap)
 * - 2.9% Medicare tax on income above the cap
 * - SE deduction: 50% of SE tax is deductible from gross income
 * - Federal income tax: marginal brackets (2024)
 * - State income tax: flat-rate approximations by state
 *
 * DISCLAIMER: This is an estimation tool, not tax advice.
 * Always consult a qualified CPA for authoritative guidance.
 */

import type { FilingStatus, TaxEstimate, TaxQuarter, TaxSummary, QuarterlyPayment } from '../types';
import { getTaxQuarters, format } from '../utils/dates';

// ─── 2024 Tax Constants ───────────────────────────────────────────────────────

const SS_WAGE_BASE_2024 = 168_600; // Social Security wage base
const SS_RATE = 0.124; // 12.4% Social Security (employee + employer share)
const MEDICARE_RATE = 0.029; // 2.9% Medicare (employee + employer share)
const ADDITIONAL_MEDICARE_RATE = 0.009; // 0.9% additional Medicare above threshold
const ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = 200_000;
const ADDITIONAL_MEDICARE_THRESHOLD_MARRIED = 250_000;
const SE_DEDUCTION_FACTOR = 0.5; // 50% of SE tax is deductible
const SE_NET_FACTOR = 0.9235; // 92.35% of net income subject to SE tax

// ─── 2024 Federal Brackets (Taxable Income) ──────────────────────────────────

interface TaxBracket {
  rate: number;
  min: number;
  max: number;
}

const FEDERAL_BRACKETS_2024: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { rate: 0.10, min: 0, max: 11_600 },
    { rate: 0.12, min: 11_600, max: 47_150 },
    { rate: 0.22, min: 47_150, max: 100_525 },
    { rate: 0.24, min: 100_525, max: 191_950 },
    { rate: 0.32, min: 191_950, max: 243_725 },
    { rate: 0.35, min: 243_725, max: 609_350 },
    { rate: 0.37, min: 609_350, max: Infinity },
  ],
  married_jointly: [
    { rate: 0.10, min: 0, max: 23_200 },
    { rate: 0.12, min: 23_200, max: 94_300 },
    { rate: 0.22, min: 94_300, max: 201_050 },
    { rate: 0.24, min: 201_050, max: 383_900 },
    { rate: 0.32, min: 383_900, max: 487_450 },
    { rate: 0.35, min: 487_450, max: 731_200 },
    { rate: 0.37, min: 731_200, max: Infinity },
  ],
  married_separately: [
    { rate: 0.10, min: 0, max: 11_600 },
    { rate: 0.12, min: 11_600, max: 47_150 },
    { rate: 0.22, min: 47_150, max: 100_525 },
    { rate: 0.24, min: 100_525, max: 191_950 },
    { rate: 0.32, min: 191_950, max: 243_725 },
    { rate: 0.35, min: 243_725, max: 365_600 },
    { rate: 0.37, min: 365_600, max: Infinity },
  ],
  head_of_household: [
    { rate: 0.10, min: 0, max: 16_550 },
    { rate: 0.12, min: 16_550, max: 63_100 },
    { rate: 0.22, min: 63_100, max: 100_500 },
    { rate: 0.24, min: 100_500, max: 191_950 },
    { rate: 0.32, min: 191_950, max: 243_700 },
    { rate: 0.35, min: 243_700, max: 609_350 },
    { rate: 0.37, min: 609_350, max: Infinity },
  ],
};

const STANDARD_DEDUCTIONS_2024: Record<FilingStatus, number> = {
  single: 14_600,
  married_jointly: 29_200,
  married_separately: 14_600,
  head_of_household: 21_900,
};

// ─── State Tax Rates (Simplified flat approximations) ────────────────────────

const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.05, AK: 0.00, AZ: 0.025, AR: 0.044,
  CA: 0.093, CO: 0.044, CT: 0.065, DE: 0.066,
  FL: 0.00, GA: 0.055, HI: 0.082, ID: 0.058,
  IL: 0.0495, IN: 0.0323, IA: 0.06, KS: 0.057,
  KY: 0.045, LA: 0.0425, ME: 0.075, MD: 0.0575,
  MA: 0.05, MI: 0.0425, MN: 0.0985, MS: 0.05,
  MO: 0.054, MT: 0.069, NE: 0.0684, NV: 0.00,
  NH: 0.00, NJ: 0.1075, NM: 0.059, NY: 0.109,
  NC: 0.0475, ND: 0.029, OH: 0.04, OK: 0.0475,
  OR: 0.099, PA: 0.0307, RI: 0.0599, SC: 0.07,
  SD: 0.00, TN: 0.00, TX: 0.00, UT: 0.0485,
  VT: 0.0875, VA: 0.0575, WA: 0.00, WV: 0.065,
  WI: 0.0765, WY: 0.00, DC: 0.1075,
};

// ─── Core Calculation Functions ───────────────────────────────────────────────

/**
 * Calculates self-employment tax (both employee and employer portions).
 */
export function calculateSelfEmploymentTax(
  netSelfEmploymentIncome: number
): {
  seTaxableIncome: number;
  socialSecurityTax: number;
  medicareTax: number;
  totalSETax: number;
  seDeduction: number;
} {
  if (netSelfEmploymentIncome <= 0) {
    return {
      seTaxableIncome: 0,
      socialSecurityTax: 0,
      medicareTax: 0,
      totalSETax: 0,
      seDeduction: 0,
    };
  }

  const seTaxableIncome = netSelfEmploymentIncome * SE_NET_FACTOR;

  // Social Security: capped at $168,600
  const ssCappedIncome = Math.min(seTaxableIncome, SS_WAGE_BASE_2024);
  const socialSecurityTax = ssCappedIncome * SS_RATE;

  // Medicare: uncapped
  const medicareTax = seTaxableIncome * MEDICARE_RATE;

  const totalSETax = socialSecurityTax + medicareTax;
  const seDeduction = totalSETax * SE_DEDUCTION_FACTOR;

  return { seTaxableIncome, socialSecurityTax, medicareTax, totalSETax, seDeduction };
}

/**
 * Calculates federal income tax using 2024 brackets.
 */
export function calculateFederalIncomeTax(
  taxableIncome: number,
  filingStatus: FilingStatus
): number {
  if (taxableIncome <= 0) return 0;

  const brackets = FEDERAL_BRACKETS_2024[filingStatus];
  let tax = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxableAtRate = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += taxableAtRate * bracket.rate;
  }

  return Math.max(0, tax);
}

/**
 * Calculates estimated state income tax.
 */
export function calculateStateIncomeTax(
  taxableIncome: number,
  stateCode: string
): number {
  const rate = STATE_TAX_RATES[stateCode.toUpperCase()] ?? 0.05;
  return Math.max(0, taxableIncome * rate);
}

/**
 * Calculates the marginal (effective) federal tax rate.
 */
export function calculateEffectiveFederalRate(
  federalTax: number,
  grossIncome: number
): number {
  if (grossIncome <= 0) return 0;
  return federalTax / grossIncome;
}

/**
 * Full tax estimate for a given year and YTD data.
 */
export function calculateFullTaxEstimate(params: {
  grossIncome: number;
  businessExpenses: number;
  filingStatus: FilingStatus;
  stateCode: string;
  year?: number;
  ytdPaid?: number;
}): {
  netSelfEmploymentIncome: number;
  seTax: number;
  seDeduction: number;
  adjustedGrossIncome: number;
  standardDeduction: number;
  taxableIncome: number;
  federalIncomeTax: number;
  stateIncomeTax: number;
  totalTax: number;
  effectiveRate: number;
  quarterlyPayment: number;
  remainingDue: number;
} {
  const {
    grossIncome,
    businessExpenses,
    filingStatus,
    stateCode,
    year = new Date().getFullYear(),
    ytdPaid = 0,
  } = params;

  const netSelfEmploymentIncome = Math.max(0, grossIncome - businessExpenses);
  const { totalSETax: seTax, seDeduction } = calculateSelfEmploymentTax(netSelfEmploymentIncome);

  const adjustedGrossIncome = Math.max(0, grossIncome - businessExpenses - seDeduction);
  const standardDeduction = STANDARD_DEDUCTIONS_2024[filingStatus];
  const taxableIncome = Math.max(0, adjustedGrossIncome - standardDeduction);

  const federalIncomeTax = calculateFederalIncomeTax(taxableIncome, filingStatus);
  const stateIncomeTax = calculateStateIncomeTax(taxableIncome, stateCode);

  const totalTax = seTax + federalIncomeTax + stateIncomeTax;
  const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;

  // Quarterly payment = total expected tax divided by 4 (annualized)
  const quarterlyPayment = totalTax / 4;
  const remainingDue = Math.max(0, totalTax - ytdPaid);

  return {
    netSelfEmploymentIncome,
    seTax,
    seDeduction,
    adjustedGrossIncome,
    standardDeduction,
    taxableIncome,
    federalIncomeTax,
    stateIncomeTax,
    totalTax,
    effectiveRate,
    quarterlyPayment,
    remainingDue,
  };
}

/**
 * Generates a full tax estimate object for a specific quarter.
 */
export function generateQuarterlyTaxEstimate(params: {
  quarter: TaxQuarter;
  year: number;
  grossIncome: number;
  businessExpenses: number;
  filingStatus: FilingStatus;
  stateCode: string;
  ytdPaid?: number;
}): TaxEstimate {
  const { quarter, year, ytdPaid = 0 } = params;
  const quarters = getTaxQuarters(year);
  const quarterData = quarters.find((q) => q.quarter === quarter)!;

  // Annualize YTD income based on quarter
  const quarterIndex = ['Q1', 'Q2', 'Q3', 'Q4'].indexOf(quarter);
  const completedQuarters = quarterIndex + 1;
  const annualizationFactor = 4 / completedQuarters;

  const annualizedIncome = params.grossIncome * annualizationFactor;
  const annualizedExpenses = params.businessExpenses * annualizationFactor;

  const estimate = calculateFullTaxEstimate({
    grossIncome: annualizedIncome,
    businessExpenses: annualizedExpenses,
    filingStatus: params.filingStatus,
    stateCode: params.stateCode,
    year,
    ytdPaid,
  });

  const quarterlyPaymentDue = estimate.totalTax / 4;

  return {
    year,
    quarter,
    grossIncome: params.grossIncome,
    businessExpenses: params.businessExpenses,
    netSelfEmploymentIncome: estimate.netSelfEmploymentIncome,
    selfEmploymentTax: estimate.seTax,
    federalIncomeTax: estimate.federalIncomeTax / 4,
    stateIncomeTax: estimate.stateIncomeTax / 4,
    totalEstimatedTax: estimate.totalTax,
    effectiveRate: estimate.effectiveRate,
    quarterlyPaymentDue,
    dueDate: format(quarterData.dueDate, 'yyyy-MM-dd'),
    ytdPaid,
    remainingDue: estimate.remainingDue,
  };
}

/**
 * Returns the recommended tax withholding percentage for a freelancer.
 * General rule of thumb: 25–30% for most freelancers.
 */
export function getRecommendedWithholdingRate(
  annualIncome: number,
  filingStatus: FilingStatus
): number {
  const estimate = calculateFullTaxEstimate({
    grossIncome: annualIncome,
    businessExpenses: annualIncome * 0.15, // assume ~15% expenses
    filingStatus,
    stateCode: 'CA', // conservative estimate
  });
  // Round up to nearest 5%
  const rawRate = estimate.effectiveRate + 0.03; // add 3% buffer
  return Math.ceil(rawRate * 20) / 20; // round to nearest 5%
}

/**
 * Returns human-readable tax bracket info for a given income.
 */
export function getTaxBracketInfo(
  taxableIncome: number,
  filingStatus: FilingStatus
): { bracketRate: number; nextBracketAt: number | null } {
  const brackets = FEDERAL_BRACKETS_2024[filingStatus];
  for (const bracket of brackets) {
    if (taxableIncome >= bracket.min && taxableIncome < bracket.max) {
      const nextBracket = brackets.find((b) => b.min === bracket.max);
      return {
        bracketRate: bracket.rate,
        nextBracketAt: nextBracket ? bracket.max - taxableIncome : null,
      };
    }
  }
  return { bracketRate: 0.37, nextBracketAt: null };
}
