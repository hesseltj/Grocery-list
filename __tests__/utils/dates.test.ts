import {
  formatDate,
  formatShortDate,
  formatMonthYear,
  formatRelativeDate,
  getTaxQuarters,
  getCurrentTaxQuarter,
  getDaysUntilDue,
  getCurrentMonthRange,
  isDateInRange,
  isOverdue,
  getNetTermsDate,
} from '../../src/utils/dates';

describe('formatDate', () => {
  it('formats ISO date string', () => {
    expect(formatDate('2024-04-15')).toBe('Apr 15, 2024');
  });

  it('formats Date object', () => {
    expect(formatDate(new Date('2024-12-25'))).toBe('Dec 25, 2024');
  });

  it('accepts custom pattern', () => {
    expect(formatDate('2024-04-15', 'yyyy-MM-dd')).toBe('2024-04-15');
  });
});

describe('formatShortDate', () => {
  it('returns month and day without year', () => {
    expect(formatShortDate('2024-04-15')).toBe('Apr 15');
  });
});

describe('formatMonthYear', () => {
  it('returns full month and year', () => {
    expect(formatMonthYear('2024-04-15')).toBe('April 2024');
  });
});

describe('getTaxQuarters', () => {
  it('returns 4 quarters for a given year', () => {
    const quarters = getTaxQuarters(2024);
    expect(quarters).toHaveLength(4);
  });

  it('Q1 starts January 1 and ends March 31', () => {
    const quarters = getTaxQuarters(2024);
    const q1 = quarters[0];
    expect(q1.quarter).toBe('Q1');
    expect(q1.start.getMonth()).toBe(0); // January
    expect(q1.end.getMonth()).toBe(2); // March
  });

  it('Q2 starts April 1 and ends May 31', () => {
    const quarters = getTaxQuarters(2024);
    const q2 = quarters[1];
    expect(q2.quarter).toBe('Q2');
    expect(q2.start.getMonth()).toBe(3); // April
    expect(q2.end.getMonth()).toBe(4); // May
  });

  it('Q4 due date is January 15 of following year', () => {
    const quarters = getTaxQuarters(2024);
    const q4 = quarters[3];
    expect(q4.dueDate.getFullYear()).toBe(2025);
    expect(q4.dueDate.getMonth()).toBe(0); // January
    expect(q4.dueDate.getDate()).toBe(15);
  });

  it('Q1 due date is April 15', () => {
    const quarters = getTaxQuarters(2024);
    const q1 = quarters[0];
    expect(q1.dueDate.getMonth()).toBe(3); // April
    expect(q1.dueDate.getDate()).toBe(15);
  });

  it('Q2 due date is June 15', () => {
    const quarters = getTaxQuarters(2024);
    const q2 = quarters[1];
    expect(q2.dueDate.getMonth()).toBe(5); // June
    expect(q2.dueDate.getDate()).toBe(15);
  });

  it('Q3 due date is September 15', () => {
    const quarters = getTaxQuarters(2024);
    const q3 = quarters[2];
    expect(q3.dueDate.getMonth()).toBe(8); // September
    expect(q3.dueDate.getDate()).toBe(15);
  });

  it('all quarters have label strings', () => {
    const quarters = getTaxQuarters(2024);
    for (const q of quarters) {
      expect(q.label).toBeTruthy();
      expect(q.label).toContain('2024');
    }
  });
});

describe('getCurrentTaxQuarter', () => {
  it('returns Q1 for dates in January–March', () => {
    expect(getCurrentTaxQuarter(new Date(2024, 0, 15)).quarter).toBe('Q1'); // Jan
    expect(getCurrentTaxQuarter(new Date(2024, 1, 28)).quarter).toBe('Q1'); // Feb
    expect(getCurrentTaxQuarter(new Date(2024, 2, 31)).quarter).toBe('Q1'); // Mar
  });

  it('returns Q2 for dates in April–May', () => {
    expect(getCurrentTaxQuarter(new Date(2024, 3, 1)).quarter).toBe('Q2'); // Apr
    expect(getCurrentTaxQuarter(new Date(2024, 4, 31)).quarter).toBe('Q2'); // May
  });

  it('returns Q3 for dates in June–August', () => {
    expect(getCurrentTaxQuarter(new Date(2024, 5, 1)).quarter).toBe('Q3'); // Jun
    expect(getCurrentTaxQuarter(new Date(2024, 7, 31)).quarter).toBe('Q3'); // Aug
  });

  it('returns Q4 for dates in September–December', () => {
    expect(getCurrentTaxQuarter(new Date(2024, 8, 1)).quarter).toBe('Q4'); // Sep
    expect(getCurrentTaxQuarter(new Date(2024, 11, 31)).quarter).toBe('Q4'); // Dec
  });

  it('returns the correct year', () => {
    const result = getCurrentTaxQuarter(new Date(2024, 6, 1));
    expect(result.year).toBe(2024);
  });
});

describe('getDaysUntilDue', () => {
  it('returns positive days for future dates', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const days = getDaysUntilDue(futureDate);
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(30);
  });

  it('returns negative days for past dates', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const days = getDaysUntilDue(pastDate);
    expect(days).toBeLessThan(0);
  });

  it('returns approximately 0 for today', () => {
    const today = new Date();
    const days = getDaysUntilDue(today);
    expect(Math.abs(days)).toBeLessThanOrEqual(1);
  });

  it('accepts ISO string', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const isoString = future.toISOString().split('T')[0];
    const days = getDaysUntilDue(isoString);
    expect(days).toBeGreaterThan(0);
  });
});

describe('getCurrentMonthRange', () => {
  it('start is the first day of the current month', () => {
    const range = getCurrentMonthRange();
    expect(range.start.getDate()).toBe(1);
    expect(range.start.getMonth()).toBe(new Date().getMonth());
  });

  it('end is the last day of the current month', () => {
    const range = getCurrentMonthRange();
    const nextDay = new Date(range.end);
    nextDay.setDate(nextDay.getDate() + 1);
    expect(nextDay.getMonth()).not.toBe(range.end.getMonth());
  });
});

describe('isDateInRange', () => {
  const range = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };

  it('returns true for date within range', () => {
    expect(isDateInRange('2024-01-15', range)).toBe(true);
  });

  it('returns true for date on start boundary', () => {
    expect(isDateInRange('2024-01-01', range)).toBe(true);
  });

  it('returns true for date on end boundary', () => {
    expect(isDateInRange('2024-01-31', range)).toBe(true);
  });

  it('returns false for date before range', () => {
    expect(isDateInRange('2023-12-31', range)).toBe(false);
  });

  it('returns false for date after range', () => {
    expect(isDateInRange('2024-02-01', range)).toBe(false);
  });
});

describe('isOverdue', () => {
  it('returns true for past due dates', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    expect(isOverdue(pastDate)).toBe(true);
  });

  it('returns false for future due dates', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    expect(isOverdue(futureDate)).toBe(false);
  });
});

describe('getNetTermsDate', () => {
  it('adds the correct number of days', () => {
    const issue = '2024-01-01';
    const netDate = getNetTermsDate(issue, 30);
    expect(netDate.getDate()).toBe(31);
    expect(netDate.getMonth()).toBe(0); // January
  });

  it('crosses month boundaries correctly', () => {
    const issue = '2024-01-15';
    const netDate = getNetTermsDate(issue, 30);
    expect(netDate.getMonth()).toBe(1); // February
    expect(netDate.getDate()).toBe(14);
  });
});
