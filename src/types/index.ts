// ─── User & Auth ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  freelancerType: FreelancerType;
  stateCode: string; // e.g. 'CA', 'NY'
  filingStatus: FilingStatus;
  subscription: SubscriptionStatus;
  createdAt: string;
  onboardingCompleted: boolean;
}

export type FreelancerType =
  | 'designer'
  | 'developer'
  | 'writer'
  | 'consultant'
  | 'photographer'
  | 'coach'
  | 'other';

export type FilingStatus = 'single' | 'married_jointly' | 'married_separately' | 'head_of_household';

export type SubscriptionStatus = 'free' | 'trial' | 'pro' | 'expired';

// ─── Transactions ────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // ISO 8601
  amount: number; // positive = income, negative = expense
  description: string;
  merchantName?: string;
  category: TransactionCategory;
  subcategory?: string;
  type: TransactionType;
  isBusinessExpense: boolean;
  isTaxDeductible: boolean;
  notes?: string;
  receiptUrl?: string;
  plaidTransactionId?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionCategory =
  | 'client_payment'
  | 'freelance_income'
  | 'other_income'
  | 'software_tools'
  | 'home_office'
  | 'equipment'
  | 'marketing'
  | 'professional_services'
  | 'travel'
  | 'meals_entertainment'
  | 'health_insurance'
  | 'retirement'
  | 'taxes_paid'
  | 'transfer'
  | 'personal'
  | 'uncategorized';

// ─── Bank Accounts ───────────────────────────────────────────────────────────

export interface BankAccount {
  id: string;
  plaidAccountId?: string;
  name: string;
  institutionName: string;
  type: BankAccountType;
  subtype: string;
  balance: AccountBalance;
  mask: string; // last 4 digits
  isConnected: boolean;
  lastSynced?: string;
}

export type BankAccountType = 'checking' | 'savings' | 'credit' | 'investment';

export interface AccountBalance {
  current: number;
  available?: number;
  limit?: number;
  isoCurrencyCode: string;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  clientName: string;
  clientEmail?: string;
  invoiceNumber: string;
  issueDate: string; // ISO 8601
  dueDate: string; // ISO 8601
  paidDate?: string; // ISO 8601
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  status: InvoiceStatus;
  notes?: string;
  currency: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';

// ─── Tax ─────────────────────────────────────────────────────────────────────

export interface TaxEstimate {
  year: number;
  quarter: TaxQuarter;
  grossIncome: number;
  businessExpenses: number;
  netSelfEmploymentIncome: number;
  selfEmploymentTax: number;
  federalIncomeTax: number;
  stateIncomeTax: number;
  totalEstimatedTax: number;
  effectiveRate: number;
  quarterlyPaymentDue: number;
  dueDate: string;
  ytdPaid: number;
  remainingDue: number;
}

export type TaxQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface TaxSummary {
  year: number;
  totalIncome: number;
  totalBusinessExpenses: number;
  netIncome: number;
  estimatedTotalTax: number;
  quarterlyPayments: QuarterlyPayment[];
  effectiveRate: number;
}

export interface QuarterlyPayment {
  quarter: TaxQuarter;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  isPaid: boolean;
}

// ─── Cash Flow Forecast ──────────────────────────────────────────────────────

export interface CashFlowForecast {
  generatedAt: string;
  periodWeeks: number;
  dataPoints: ForecastDataPoint[];
  alerts: CashFlowAlert[];
  confidenceScore: number; // 0–1
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  recommendedReserve: number;
}

export interface ForecastDataPoint {
  weekStart: string; // ISO 8601
  projectedIncome: number;
  projectedExpenses: number;
  projectedBalance: number;
  isRisk: boolean; // balance dips below safe threshold
}

export interface CashFlowAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  weekStart?: string;
  actionLabel?: string;
}

export type AlertType =
  | 'low_balance'
  | 'tax_due'
  | 'invoice_overdue'
  | 'income_gap'
  | 'high_expenses'
  | 'reserve_low';

export type AlertSeverity = 'info' | 'warning' | 'critical';

// ─── Savings Buckets ─────────────────────────────────────────────────────────

export interface SavingsBucket {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color: string;
  icon: string;
  type: BucketType;
}

export type BucketType = 'tax_reserve' | 'emergency_fund' | 'equipment' | 'custom';

// ─── Plaid ───────────────────────────────────────────────────────────────────

export interface PlaidLinkToken {
  linkToken: string;
  expiration: string;
}

export interface PlaidExchangeResult {
  accessToken: string;
  itemId: string;
  institutionId?: string;
  institutionName?: string;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Onboarding: { step: number };
  SignUp: undefined;
  SignIn: undefined;
};

export type AppTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Invoices: undefined;
  Tax: undefined;
  Settings: undefined;
};

export type TransactionsStackParamList = {
  TransactionsList: undefined;
  TransactionDetail: { transactionId: string };
};

export type InvoicesStackParamList = {
  InvoicesList: undefined;
  InvoiceDetail: { invoiceId: string };
  CreateInvoice: { invoiceId?: string };
};

// ─── API / Store ─────────────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  statusCode?: number;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
