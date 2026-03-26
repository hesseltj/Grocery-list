import {
  CATEGORY_META,
  getIncomeCategories,
  getExpenseCategories,
  getDeductibleCategories,
  autoClassifyTransaction,
} from '../../src/utils/categories';

describe('CATEGORY_META', () => {
  it('has an entry for every category type', () => {
    const expectedKeys = [
      'client_payment', 'freelance_income', 'other_income',
      'software_tools', 'home_office', 'equipment', 'marketing',
      'professional_services', 'travel', 'meals_entertainment',
      'health_insurance', 'retirement', 'taxes_paid',
      'transfer', 'personal', 'uncategorized',
    ];
    for (const key of expectedKeys) {
      expect(CATEGORY_META).toHaveProperty(key);
    }
  });

  it('every category has required fields', () => {
    for (const [key, meta] of Object.entries(CATEGORY_META)) {
      expect(meta).toHaveProperty('label');
      expect(meta).toHaveProperty('icon');
      expect(meta).toHaveProperty('type');
      expect(meta).toHaveProperty('isBusinessExpense');
      expect(meta).toHaveProperty('isTaxDeductible');
      expect(meta).toHaveProperty('color');
    }
  });

  it('income categories have isBusinessExpense=false', () => {
    const incomeCategories = ['client_payment', 'freelance_income', 'other_income'];
    for (const cat of incomeCategories) {
      expect(CATEGORY_META[cat as keyof typeof CATEGORY_META].isBusinessExpense).toBe(false);
    }
  });

  it('deductible categories have isTaxDeductible=true', () => {
    const deductible = ['software_tools', 'equipment', 'marketing', 'travel'];
    for (const cat of deductible) {
      expect(CATEGORY_META[cat as keyof typeof CATEGORY_META].isTaxDeductible).toBe(true);
    }
  });
});

describe('getIncomeCategories', () => {
  it('returns only income-type categories', () => {
    const income = getIncomeCategories();
    for (const cat of income) {
      expect(CATEGORY_META[cat].type).toBe('income');
    }
  });

  it('includes expected income categories', () => {
    const income = getIncomeCategories();
    expect(income).toContain('client_payment');
    expect(income).toContain('freelance_income');
    expect(income).toContain('other_income');
  });

  it('does not include expense categories', () => {
    const income = getIncomeCategories();
    expect(income).not.toContain('software_tools');
    expect(income).not.toContain('equipment');
  });
});

describe('getExpenseCategories', () => {
  it('returns only expense-type categories', () => {
    const expenses = getExpenseCategories();
    for (const cat of expenses) {
      expect(CATEGORY_META[cat].type).toBe('expense');
    }
  });

  it('does not include income categories', () => {
    const expenses = getExpenseCategories();
    expect(expenses).not.toContain('client_payment');
    expect(expenses).not.toContain('freelance_income');
  });
});

describe('getDeductibleCategories', () => {
  it('returns categories where isTaxDeductible=true', () => {
    const deductible = getDeductibleCategories();
    for (const cat of deductible) {
      expect(CATEGORY_META[cat].isTaxDeductible).toBe(true);
    }
  });

  it('does not include non-deductible categories', () => {
    const deductible = getDeductibleCategories();
    expect(deductible).not.toContain('personal');
    expect(deductible).not.toContain('taxes_paid');
    expect(deductible).not.toContain('transfer');
  });
});

describe('autoClassifyTransaction', () => {
  // Income classification
  it('classifies PayPal credit as client_payment', () => {
    const result = autoClassifyTransaction('PAYPAL *DESIGN', 2500);
    expect(result.category).toBe('client_payment');
  });

  it('classifies Stripe incoming payment as client_payment', () => {
    const result = autoClassifyTransaction('Stripe payout', 3000);
    expect(result.category).toBe('client_payment');
  });

  // Software tools
  it('classifies Adobe as software_tools', () => {
    const result = autoClassifyTransaction('Adobe Creative Cloud', -54.99);
    expect(result.category).toBe('software_tools');
  });

  it('classifies GitHub as software_tools', () => {
    const result = autoClassifyTransaction('GITHUB', -4);
    expect(result.category).toBe('software_tools');
  });

  it('classifies Figma as software_tools', () => {
    const result = autoClassifyTransaction('Figma subscription', -12);
    expect(result.category).toBe('software_tools');
  });

  // Meals
  it('classifies restaurant as meals_entertainment', () => {
    const result = autoClassifyTransaction('Local Restaurant', -45);
    expect(result.category).toBe('meals_entertainment');
  });

  it('classifies DoorDash as meals_entertainment', () => {
    const result = autoClassifyTransaction('DOORDASH ORDER', -30);
    expect(result.category).toBe('meals_entertainment');
  });

  // Travel
  it('classifies Uber as travel', () => {
    const result = autoClassifyTransaction('UBER TRIP', -18);
    expect(result.category).toBe('travel');
  });

  it('classifies Airbnb as travel', () => {
    const result = autoClassifyTransaction('Airbnb stay', -150);
    expect(result.category).toBe('travel');
  });

  // Equipment
  it('classifies Apple Store as equipment', () => {
    const result = autoClassifyTransaction('Apple Store purchase', -1299);
    expect(result.category).toBe('equipment');
  });

  // Health
  it('classifies health insurance as health_insurance', () => {
    const result = autoClassifyTransaction('Cigna Health Insurance', -450);
    expect(result.category).toBe('health_insurance');
  });

  // Default fallback
  it('classifies unknown income as other_income', () => {
    const result = autoClassifyTransaction('Unknown deposit xyz', 1000);
    expect(result.category).toBe('other_income');
  });

  it('classifies unknown expense as uncategorized', () => {
    const result = autoClassifyTransaction('Random merchant 123', -50);
    expect(result.category).toBe('uncategorized');
  });

  // Business flag
  it('marks software as isBusinessExpense=true', () => {
    const result = autoClassifyTransaction('Notion subscription', -16);
    expect(result.isBusinessExpense).toBe(true);
  });

  it('marks personal income as isBusinessExpense=false', () => {
    const result = autoClassifyTransaction('Venmo from friend', 50);
    expect(result.isBusinessExpense).toBe(false);
  });
});
