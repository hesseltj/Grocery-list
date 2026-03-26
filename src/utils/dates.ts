import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  subMonths,
  differenceInDays,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  isWithinInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  startOfWeek,
  endOfWeek,
  getQuarter,
  getYear,
} from 'date-fns';

import type { TaxQuarter } from '../types';

// ─── Basic Formatting ─────────────────────────────────────────────────────────

export function formatDate(date: Date | string, pattern = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern);
}

export function formatShortDate(date: Date | string): string {
  return formatDate(date, 'MMM d');
}

export function formatMonthYear(date: Date | string): string {
  return formatDate(date, 'MMMM yyyy');
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  const diffDays = differenceInCalendarDays(today, d);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays === -1) return 'Tomorrow';
  if (diffDays > 0 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 0 && diffDays > -7) return `In ${Math.abs(diffDays)} days`;
  return formatDate(d, 'MMM d, yyyy');
}

// ─── Tax Quarter Utilities ────────────────────────────────────────────────────

export interface TaxQuarterDates {
  quarter: TaxQuarter;
  year: number;
  start: Date;
  end: Date;
  dueDate: Date;
  label: string;
}

/**
 * Returns the IRS estimated tax payment quarters for a given year.
 * Q1: Jan 1 – Mar 31, due Apr 15
 * Q2: Apr 1 – May 31, due Jun 15
 * Q3: Jun 1 – Aug 31, due Sep 15
 * Q4: Sep 1 – Dec 31, due Jan 15 (following year)
 */
export function getTaxQuarters(year: number): TaxQuarterDates[] {
  return [
    {
      quarter: 'Q1',
      year,
      start: new Date(year, 0, 1),
      end: new Date(year, 2, 31),
      dueDate: new Date(year, 3, 15),
      label: `Q1 ${year} (Jan–Mar)`,
    },
    {
      quarter: 'Q2',
      year,
      start: new Date(year, 3, 1),
      end: new Date(year, 4, 31),
      dueDate: new Date(year, 5, 15),
      label: `Q2 ${year} (Apr–May)`,
    },
    {
      quarter: 'Q3',
      year,
      start: new Date(year, 5, 1),
      end: new Date(year, 7, 31),
      dueDate: new Date(year, 8, 15),
      label: `Q3 ${year} (Jun–Aug)`,
    },
    {
      quarter: 'Q4',
      year,
      start: new Date(year, 8, 1),
      end: new Date(year, 11, 31),
      dueDate: new Date(year + 1, 0, 15),
      label: `Q4 ${year} (Sep–Dec)`,
    },
  ];
}

export function getCurrentTaxQuarter(date = new Date()): { quarter: TaxQuarter; year: number } {
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();
  if (month <= 2) return { quarter: 'Q1', year };
  if (month <= 4) return { quarter: 'Q2', year };
  if (month <= 7) return { quarter: 'Q3', year };
  return { quarter: 'Q4', year };
}

export function getDaysUntilDue(dueDate: Date | string): number {
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  return differenceInCalendarDays(due, new Date());
}

// ─── Date Range Helpers ───────────────────────────────────────────────────────

export interface DateRange {
  start: Date;
  end: Date;
}

export function getCurrentMonthRange(): DateRange {
  const now = new Date();
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export function getPreviousMonthRange(): DateRange {
  const prev = subMonths(new Date(), 1);
  return { start: startOfMonth(prev), end: endOfMonth(prev) };
}

export function getCurrentYearRange(): DateRange {
  const now = new Date();
  return { start: startOfYear(now), end: endOfYear(now) };
}

export function getLast12MonthsRange(): DateRange {
  const end = endOfMonth(new Date());
  const start = startOfMonth(subMonths(new Date(), 11));
  return { start, end };
}

export function isDateInRange(date: Date | string, range: DateRange): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isWithinInterval(d, range);
}

// ─── Week Helpers ─────────────────────────────────────────────────────────────

export function getWeeksInRange(range: DateRange): Date[] {
  return eachWeekOfInterval(range, { weekStartsOn: 1 }); // Monday
}

export function getMonthsInRange(range: DateRange): Date[] {
  return eachMonthOfInterval(range);
}

// ─── Invoice Due Date Helpers ─────────────────────────────────────────────────

export function isOverdue(dueDate: Date | string): boolean {
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  return isBefore(due, new Date()) ;
}

export function getNetTermsDate(issueDate: Date | string, netDays: number): Date {
  const issue = typeof issueDate === 'string' ? parseISO(issueDate) : issueDate;
  return addDays(issue, netDays);
}

// ─── Re-exports ───────────────────────────────────────────────────────────────
export {
  parseISO,
  format,
  addDays,
  addWeeks,
  addMonths,
  subMonths,
  differenceInDays,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getQuarter,
  getYear,
};
