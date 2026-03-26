import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  absAmount,
  parseCurrencyInput,
  percentageChange,
  getAmountColor,
  formatTransactionAmount,
} from '../../src/utils/currency';

describe('formatCurrency', () => {
  it('formats positive dollar amounts', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative amounts with minus sign', () => {
    expect(formatCurrency(-500)).toBe('-$500.00');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(9.999)).toBe('$10.00');
  });

  it('formats large amounts with commas', () => {
    expect(formatCurrency(1_000_000)).toBe('$1,000,000.00');
  });
});

describe('formatCurrencyCompact', () => {
  it('formats amounts < 1000 as full currency', () => {
    expect(formatCurrencyCompact(500)).toBe('$500.00');
  });

  it('formats amounts in thousands as K', () => {
    expect(formatCurrencyCompact(1500)).toBe('$1.5K');
    expect(formatCurrencyCompact(10_000)).toBe('$10.0K');
  });

  it('formats amounts in millions as M', () => {
    expect(formatCurrencyCompact(1_500_000)).toBe('$1.5M');
  });

  it('handles negative thousands', () => {
    expect(formatCurrencyCompact(-2500)).toBe('-$2.5K');
  });
});

describe('formatPercent', () => {
  it('formats 0.25 as 25.0%', () => {
    expect(formatPercent(0.25)).toBe('25.0%');
  });

  it('formats 0 as 0.0%', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('formats 1 as 100.0%', () => {
    expect(formatPercent(1)).toBe('100.0%');
  });

  it('respects decimals parameter', () => {
    expect(formatPercent(0.1234, 2)).toBe('12.34%');
    expect(formatPercent(0.1234, 0)).toBe('12%');
  });
});

describe('absAmount', () => {
  it('returns positive value for negative input', () => {
    expect(absAmount(-500)).toBe(500);
  });

  it('returns positive value for positive input', () => {
    expect(absAmount(500)).toBe(500);
  });

  it('returns 0 for 0', () => {
    expect(absAmount(0)).toBe(0);
  });
});

describe('parseCurrencyInput', () => {
  it('parses plain number strings', () => {
    expect(parseCurrencyInput('1234.56')).toBe(1234.56);
  });

  it('strips dollar signs', () => {
    expect(parseCurrencyInput('$1234.56')).toBe(1234.56);
  });

  it('strips commas', () => {
    expect(parseCurrencyInput('$1,234.56')).toBe(1234.56);
  });

  it('strips whitespace', () => {
    expect(parseCurrencyInput(' 500 ')).toBe(500);
  });

  it('returns NaN for invalid input', () => {
    expect(parseCurrencyInput('abc')).toBeNaN();
  });

  it('returns 0 for "0"', () => {
    expect(parseCurrencyInput('0')).toBe(0);
  });
});

describe('percentageChange', () => {
  it('calculates positive change correctly', () => {
    expect(percentageChange(120, 100)).toBeCloseTo(0.20, 5);
  });

  it('calculates negative change correctly', () => {
    expect(percentageChange(80, 100)).toBeCloseTo(-0.20, 5);
  });

  it('returns null when previous is 0', () => {
    expect(percentageChange(100, 0)).toBeNull();
  });

  it('handles negative previous value', () => {
    const result = percentageChange(-50, -100);
    expect(result).toBeCloseTo(0.50, 5); // moved toward 0 by 50%
  });
});

describe('getAmountColor', () => {
  it('returns green for positive amounts', () => {
    expect(getAmountColor(100)).toBe('#10C4A0');
  });

  it('returns red for negative amounts', () => {
    expect(getAmountColor(-100)).toBe('#E74C3C');
  });

  it('returns green for zero', () => {
    expect(getAmountColor(0)).toBe('#10C4A0');
  });

  it('accepts custom colors', () => {
    expect(getAmountColor(100, 'blue', 'red')).toBe('blue');
    expect(getAmountColor(-100, 'blue', 'red')).toBe('red');
  });
});

describe('formatTransactionAmount', () => {
  it('prefixes positive amounts with +', () => {
    expect(formatTransactionAmount(500)).toBe('+$500.00');
  });

  it('negative amounts show minus from formatCurrency', () => {
    expect(formatTransactionAmount(-300)).toBe('-$300.00');
  });

  it('zero gets + prefix', () => {
    expect(formatTransactionAmount(0)).toBe('+$0.00');
  });
});
