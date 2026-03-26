/**
 * Currency formatting utilities for FlowLedger.
 * All monetary values stored as cents internally, displayed as dollars.
 */

/**
 * Formats a dollar amount as a localized currency string.
 * @param amount - Amount in dollars (decimal)
 * @param options - Intl.NumberFormat options override
 */
export function formatCurrency(
  amount: number,
  options?: Partial<Intl.NumberFormatOptions>
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

/**
 * Formats a currency value compactly (e.g. $1.2K, $3.4M).
 */
export function formatCurrencyCompact(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

/**
 * Formats a percentage (0–1 input → "12.5%" output).
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Returns the absolute value of an amount for display purposes.
 */
export function absAmount(amount: number): number {
  return Math.abs(amount);
}

/**
 * Parses a user-entered string (e.g. "$1,234.56" or "1234.56") into a number.
 * Returns NaN if unparseable.
 */
export function parseCurrencyInput(input: string): number {
  const cleaned = input.replace(/[$,\s]/g, '');
  const value = parseFloat(cleaned);
  return value;
}

/**
 * Calculates the percentage change between two values.
 * Returns null if previous is zero (can't divide by zero).
 */
export function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

/**
 * Returns a color (green/red) based on whether a value is positive or negative.
 */
export function getAmountColor(
  amount: number,
  positiveColor = '#10C4A0',
  negativeColor = '#E74C3C'
): string {
  return amount >= 0 ? positiveColor : negativeColor;
}

/**
 * Formats a transaction amount with a + or – prefix.
 */
export function formatTransactionAmount(amount: number): string {
  const prefix = amount >= 0 ? '+' : '';
  return `${prefix}${formatCurrency(amount)}`;
}
