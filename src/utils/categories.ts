import type { TransactionCategory, TransactionType } from '../types';

export interface CategoryMeta {
  label: string;
  icon: string;
  type: TransactionType;
  isBusinessExpense: boolean;
  isTaxDeductible: boolean;
  color: string;
}

export const CATEGORY_META: Record<TransactionCategory, CategoryMeta> = {
  client_payment: {
    label: 'Client Payment',
    icon: 'briefcase',
    type: 'income',
    isBusinessExpense: false,
    isTaxDeductible: false,
    color: '#10C4A0',
  },
  freelance_income: {
    label: 'Freelance Income',
    icon: 'laptop',
    type: 'income',
    isBusinessExpense: false,
    isTaxDeductible: false,
    color: '#2ECC71',
  },
  other_income: {
    label: 'Other Income',
    icon: 'cash',
    type: 'income',
    isBusinessExpense: false,
    isTaxDeductible: false,
    color: '#3498DB',
  },
  software_tools: {
    label: 'Software & Tools',
    icon: 'code-braces',
    type: 'expense',
    isBusinessExpense: true,
    isTaxDeductible: true,
    color: '#9B59B6',
  },
  home_office: {
    label: 'Home Office',
    icon: 'home',
    type: 'expense',
    isBusinessExpense: true,
    isTaxDeductible: true,
    color: '#E67E22',
  },
  equipment: {
    label: 'Equipment',
    icon: 'monitor',
    type: 'expense',
    isBusinessExpense: true,
    isTaxDeductible: true,
    color: '#E74C3C',
  },
  marketing: {
    label: 'Marketing & Ads',
    icon: 'bullhorn',
    type: 'expense',
    isBusinessExpense: true,
    isTaxDeductible: true,
    color: '#F39C12',
  },
  professional_services: {
    label: 'Professional Services',
    icon: 'account-tie',
    type: 'expense',
    isBusinessExpense: true,
    isTaxDeductible: true,
    color: '#1ABC9C',
  },
  travel: {
    label: 'Business Travel',
    icon: 'airplane',
    type: 'expense',
    isBusinessExpense: true,
    isTaxDeductible: true,
    color: '#3498DB',
  },
  meals_entertainment: {
    label: 'Meals & Entertainment',
    icon: 'food',
    type: 'expense',
    isBusinessExpense: true,
    isTaxDeductible: true, // 50% deductible
    color: '#E91E63',
  },
  health_insurance: {
    label: 'Health Insurance',
    icon: 'heart-pulse',
    type: 'expense',
    isBusinessExpense: true,
    isTaxDeductible: true,
    color: '#00BCD4',
  },
  retirement: {
    label: 'Retirement (SEP-IRA)',
    icon: 'piggy-bank',
    type: 'expense',
    isBusinessExpense: true,
    isTaxDeductible: true,
    color: '#795548',
  },
  taxes_paid: {
    label: 'Estimated Taxes Paid',
    icon: 'file-document',
    type: 'expense',
    isBusinessExpense: false,
    isTaxDeductible: false,
    color: '#607D8B',
  },
  transfer: {
    label: 'Transfer',
    icon: 'bank-transfer',
    type: 'transfer',
    isBusinessExpense: false,
    isTaxDeductible: false,
    color: '#9E9E9E',
  },
  personal: {
    label: 'Personal',
    icon: 'account',
    type: 'expense',
    isBusinessExpense: false,
    isTaxDeductible: false,
    color: '#FF9800',
  },
  uncategorized: {
    label: 'Uncategorized',
    icon: 'help-circle',
    type: 'expense',
    isBusinessExpense: false,
    isTaxDeductible: false,
    color: '#BDBDBD',
  },
};

/**
 * Returns all income categories.
 */
export function getIncomeCategories(): TransactionCategory[] {
  return (Object.keys(CATEGORY_META) as TransactionCategory[]).filter(
    (key) => CATEGORY_META[key].type === 'income'
  );
}

/**
 * Returns all expense categories.
 */
export function getExpenseCategories(): TransactionCategory[] {
  return (Object.keys(CATEGORY_META) as TransactionCategory[]).filter(
    (key) => CATEGORY_META[key].type === 'expense'
  );
}

/**
 * Returns all tax-deductible expense categories.
 */
export function getDeductibleCategories(): TransactionCategory[] {
  return (Object.keys(CATEGORY_META) as TransactionCategory[]).filter(
    (key) => CATEGORY_META[key].isTaxDeductible
  );
}

/**
 * Attempts to auto-classify a transaction based on merchant name / description.
 */
export function autoClassifyTransaction(
  description: string,
  amount: number
): { category: TransactionCategory; isBusinessExpense: boolean } {
  const lower = description.toLowerCase();

  // Income patterns
  if (
    lower.includes('paypal') ||
    lower.includes('stripe') ||
    lower.includes('wise') ||
    lower.includes('upwork') ||
    lower.includes('fiverr') ||
    lower.includes('direct deposit')
  ) {
    if (amount > 0) {
      return { category: 'client_payment', isBusinessExpense: false };
    }
  }

  // Software / SaaS
  if (
    lower.includes('adobe') ||
    lower.includes('figma') ||
    lower.includes('github') ||
    lower.includes('notion') ||
    lower.includes('slack') ||
    lower.includes('zoom') ||
    lower.includes('dropbox') ||
    lower.includes('google workspace') ||
    lower.includes('microsoft 365') ||
    lower.includes('1password')
  ) {
    return { category: 'software_tools', isBusinessExpense: true };
  }

  // Meals
  if (
    lower.includes('restaurant') ||
    lower.includes('doordash') ||
    lower.includes('uber eats') ||
    lower.includes('grubhub') ||
    lower.includes('coffee') ||
    lower.includes('starbucks')
  ) {
    return { category: 'meals_entertainment', isBusinessExpense: true };
  }

  // Travel
  if (
    lower.includes('airline') ||
    lower.includes('delta') ||
    lower.includes('united') ||
    lower.includes('american airlines') ||
    lower.includes('airbnb') ||
    lower.includes('hotel') ||
    lower.includes('hilton') ||
    lower.includes('marriott') ||
    lower.includes('uber') ||
    lower.includes('lyft')
  ) {
    return { category: 'travel', isBusinessExpense: true };
  }

  // Equipment
  if (
    lower.includes('apple store') ||
    lower.includes('best buy') ||
    lower.includes('amazon') ||
    lower.includes('b&h') ||
    lower.includes('bhphotovideo')
  ) {
    return { category: 'equipment', isBusinessExpense: true };
  }

  // Health
  if (
    lower.includes('health insurance') ||
    lower.includes('cigna') ||
    lower.includes('aetna') ||
    lower.includes('blue cross')
  ) {
    return { category: 'health_insurance', isBusinessExpense: true };
  }

  // Default
  if (amount > 0) {
    return { category: 'other_income', isBusinessExpense: false };
  }

  return { category: 'uncategorized', isBusinessExpense: false };
}
