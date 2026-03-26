import {
  calculateSelfEmploymentTax,
  calculateFederalIncomeTax,
  calculateStateIncomeTax,
  calculateFullTaxEstimate,
  generateQuarterlyTaxEstimate,
  getRecommendedWithholdingRate,
  getTaxBracketInfo,
} from '../../src/services/taxCalculator';

// ─── Self-Employment Tax Tests ─────────────────────────────────────────────────

describe('calculateSelfEmploymentTax', () => {
  it('returns zeros for zero income', () => {
    const result = calculateSelfEmploymentTax(0);
    expect(result.totalSETax).toBe(0);
    expect(result.seDeduction).toBe(0);
  });

  it('returns zeros for negative income', () => {
    const result = calculateSelfEmploymentTax(-1000);
    expect(result.totalSETax).toBe(0);
  });

  it('calculates correct SE tax for $50,000 income', () => {
    const result = calculateSelfEmploymentTax(50_000);
    // seTaxableIncome = 50000 * 0.9235 = 46175
    expect(result.seTaxableIncome).toBeCloseTo(46_175, 0);
    // SS = 46175 * 0.124 = 5725.7
    expect(result.socialSecurityTax).toBeCloseTo(5725.7, 0);
    // Medicare = 46175 * 0.029 = 1339.075
    expect(result.medicareTax).toBeCloseTo(1339.075, 0);
    // Total = 7064.775
    expect(result.totalSETax).toBeCloseTo(7064.775, 0);
    // Deduction = totalSETax * 0.5
    expect(result.seDeduction).toBeCloseTo(result.totalSETax * 0.5, 2);
  });

  it('caps Social Security at the wage base ($168,600)', () => {
    const result = calculateSelfEmploymentTax(200_000);
    // seTaxableIncome = 200000 * 0.9235 = 184700
    // SS should be capped: 168600 * 0.124
    const expectedSS = 168_600 * 0.124;
    expect(result.socialSecurityTax).toBeCloseTo(expectedSS, 0);
    // Medicare is uncapped: 184700 * 0.029
    expect(result.medicareTax).toBeCloseTo(184_700 * 0.029, 0);
  });

  it('SE deduction is exactly 50% of total SE tax', () => {
    const result = calculateSelfEmploymentTax(80_000);
    expect(result.seDeduction).toBeCloseTo(result.totalSETax * 0.5, 2);
  });

  it('handles very small income amounts', () => {
    const result = calculateSelfEmploymentTax(100);
    expect(result.totalSETax).toBeGreaterThan(0);
    expect(result.totalSETax).toBeLessThan(100);
  });
});

// ─── Federal Income Tax Tests ─────────────────────────────────────────────────

describe('calculateFederalIncomeTax', () => {
  it('returns 0 for zero taxable income', () => {
    expect(calculateFederalIncomeTax(0, 'single')).toBe(0);
  });

  it('returns 0 for negative taxable income', () => {
    expect(calculateFederalIncomeTax(-500, 'single')).toBe(0);
  });

  it('taxes $10,000 at 10% for single filer', () => {
    // 10% bracket: $0–$11,600
    const tax = calculateFederalIncomeTax(10_000, 'single');
    expect(tax).toBeCloseTo(10_000 * 0.10, 0);
  });

  it('crosses brackets correctly for $50,000 single', () => {
    // 10% on first 11600 = 1160
    // 12% on 47150-11600 = 35550 * 0.12 = 4266
    // 22% on 50000-47150 = 2850 * 0.22 = 627
    const tax = calculateFederalIncomeTax(50_000, 'single');
    const expected = (11_600 * 0.10) + ((47_150 - 11_600) * 0.12) + ((50_000 - 47_150) * 0.22);
    expect(tax).toBeCloseTo(expected, 0);
  });

  it('married jointly has higher bracket thresholds', () => {
    const singleTax = calculateFederalIncomeTax(50_000, 'single');
    const marriedTax = calculateFederalIncomeTax(50_000, 'married_jointly');
    expect(marriedTax).toBeLessThan(singleTax);
  });

  it('head of household has lower tax than single at same income', () => {
    const singleTax = calculateFederalIncomeTax(60_000, 'single');
    const hohTax = calculateFederalIncomeTax(60_000, 'head_of_household');
    expect(hohTax).toBeLessThan(singleTax);
  });

  it('correctly handles income in the 37% bracket', () => {
    const tax = calculateFederalIncomeTax(700_000, 'single');
    expect(tax).toBeGreaterThan(700_000 * 0.30); // definitely paying > 30%
  });
});

// ─── State Tax Tests ──────────────────────────────────────────────────────────

describe('calculateStateIncomeTax', () => {
  it('returns 0 for no-income-tax states', () => {
    const noTaxStates = ['FL', 'TX', 'NV', 'WA', 'WY', 'SD', 'TN', 'AK'];
    for (const state of noTaxStates) {
      expect(calculateStateIncomeTax(50_000, state)).toBe(0);
    }
  });

  it('applies California rate (9.3%) for CA', () => {
    const tax = calculateStateIncomeTax(50_000, 'CA');
    expect(tax).toBeCloseTo(50_000 * 0.093, 0);
  });

  it('applies New York rate (10.9%) for NY', () => {
    const tax = calculateStateIncomeTax(100_000, 'NY');
    expect(tax).toBeCloseTo(100_000 * 0.109, 0);
  });

  it('handles lowercase state codes', () => {
    const taxUpper = calculateStateIncomeTax(50_000, 'CA');
    const taxLower = calculateStateIncomeTax(50_000, 'ca');
    expect(taxLower).toBeCloseTo(taxUpper, 2);
  });

  it('falls back to 5% for unknown state', () => {
    const tax = calculateStateIncomeTax(40_000, 'XX');
    expect(tax).toBeCloseTo(40_000 * 0.05, 2);
  });

  it('returns 0 for zero or negative income', () => {
    expect(calculateStateIncomeTax(0, 'CA')).toBe(0);
    expect(calculateStateIncomeTax(-100, 'CA')).toBe(0);
  });
});

// ─── Full Tax Estimate Tests ──────────────────────────────────────────────────

describe('calculateFullTaxEstimate', () => {
  const baseParams = {
    grossIncome: 80_000,
    businessExpenses: 12_000,
    filingStatus: 'single' as const,
    stateCode: 'TX', // no state tax for clean math
  };

  it('calculates positive net SE income', () => {
    const result = calculateFullTaxEstimate(baseParams);
    expect(result.netSelfEmploymentIncome).toBe(80_000 - 12_000);
  });

  it('total tax > 0 for positive income', () => {
    const result = calculateFullTaxEstimate(baseParams);
    expect(result.totalTax).toBeGreaterThan(0);
  });

  it('effective rate is between 0 and 1', () => {
    const result = calculateFullTaxEstimate(baseParams);
    expect(result.effectiveRate).toBeGreaterThan(0);
    expect(result.effectiveRate).toBeLessThan(1);
  });

  it('state tax is 0 for TX', () => {
    const result = calculateFullTaxEstimate(baseParams);
    expect(result.stateIncomeTax).toBe(0);
  });

  it('quarterly payment is totalTax / 4', () => {
    const result = calculateFullTaxEstimate(baseParams);
    expect(result.quarterlyPayment).toBeCloseTo(result.totalTax / 4, 2);
  });

  it('remaining due decreases with ytdPaid', () => {
    const noPay = calculateFullTaxEstimate({ ...baseParams, ytdPaid: 0 });
    const withPay = calculateFullTaxEstimate({ ...baseParams, ytdPaid: 5000 });
    expect(withPay.remainingDue).toBeLessThan(noPay.remainingDue);
  });

  it('no negative remaining due (clamps at 0)', () => {
    const result = calculateFullTaxEstimate({ ...baseParams, ytdPaid: 999_999 });
    expect(result.remainingDue).toBe(0);
  });

  it('higher income = higher tax', () => {
    const low = calculateFullTaxEstimate({ ...baseParams, grossIncome: 40_000, businessExpenses: 0 });
    const high = calculateFullTaxEstimate({ ...baseParams, grossIncome: 200_000, businessExpenses: 0 });
    expect(high.totalTax).toBeGreaterThan(low.totalTax);
  });

  it('higher expenses = lower tax', () => {
    const lowExp = calculateFullTaxEstimate({ ...baseParams, businessExpenses: 0 });
    const highExp = calculateFullTaxEstimate({ ...baseParams, businessExpenses: 40_000 });
    expect(highExp.totalTax).toBeLessThan(lowExp.totalTax);
  });

  it('SE deduction reduces taxable income', () => {
    const result = calculateFullTaxEstimate(baseParams);
    expect(result.seDeduction).toBeGreaterThan(0);
    expect(result.adjustedGrossIncome).toBeLessThan(result.netSelfEmploymentIncome);
  });
});

// ─── Quarterly Estimate Tests ─────────────────────────────────────────────────

describe('generateQuarterlyTaxEstimate', () => {
  const params = {
    quarter: 'Q2' as const,
    year: 2024,
    grossIncome: 30_000,
    businessExpenses: 4_000,
    filingStatus: 'single' as const,
    stateCode: 'CA',
  };

  it('returns TaxEstimate with correct quarter', () => {
    const result = generateQuarterlyTaxEstimate(params);
    expect(result.quarter).toBe('Q2');
    expect(result.year).toBe(2024);
  });

  it('due date is in the correct format', () => {
    const result = generateQuarterlyTaxEstimate(params);
    expect(result.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('Q2 is due on June 15', () => {
    const result = generateQuarterlyTaxEstimate(params);
    expect(result.dueDate).toBe('2024-06-15');
  });

  it('Q4 is due on January 15 of following year', () => {
    const result = generateQuarterlyTaxEstimate({ ...params, quarter: 'Q4' });
    expect(result.dueDate).toBe('2025-01-15');
  });

  it('quarterly payment due is positive', () => {
    const result = generateQuarterlyTaxEstimate(params);
    expect(result.quarterlyPaymentDue).toBeGreaterThan(0);
  });
});

// ─── Recommended Withholding Rate Tests ──────────────────────────────────────

describe('getRecommendedWithholdingRate', () => {
  it('returns a rate between 0.15 and 0.40 for typical freelance income', () => {
    const rate = getRecommendedWithholdingRate(60_000, 'single');
    expect(rate).toBeGreaterThanOrEqual(0.15);
    expect(rate).toBeLessThanOrEqual(0.40);
  });

  it('returns higher rate for higher income', () => {
    const lowRate = getRecommendedWithholdingRate(30_000, 'single');
    const highRate = getRecommendedWithholdingRate(250_000, 'single');
    expect(highRate).toBeGreaterThan(lowRate);
  });

  it('returns rate as multiple of 5%', () => {
    const rate = getRecommendedWithholdingRate(80_000, 'single');
    expect((rate * 100) % 5).toBeCloseTo(0, 1);
  });
});

// ─── Tax Bracket Info Tests ───────────────────────────────────────────────────

describe('getTaxBracketInfo', () => {
  it('returns 10% bracket for income in lowest bracket', () => {
    const info = getTaxBracketInfo(5_000, 'single');
    expect(info.bracketRate).toBe(0.10);
  });

  it('returns correct bracket for $50,000 single (22%)', () => {
    const info = getTaxBracketInfo(50_000, 'single');
    expect(info.bracketRate).toBe(0.22);
  });

  it('nextBracketAt tells how far to next bracket', () => {
    // For single filer in 10% bracket (up to $11,600)
    const info = getTaxBracketInfo(10_000, 'single');
    expect(info.nextBracketAt).toBe(11_600 - 10_000);
  });

  it('nextBracketAt is null for top bracket', () => {
    const info = getTaxBracketInfo(1_000_000, 'single');
    expect(info.nextBracketAt).toBeNull();
  });
});
