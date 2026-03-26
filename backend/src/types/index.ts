import { Request } from 'express';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user: JwtPayload;
}

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  freelancer_type: string;
  state_code: string;
  filing_status: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  onboarding_completed: number; // SQLite boolean (0/1)
  created_at: string;
  updated_at: string;
}

export interface PlaidItemRow {
  id: string;
  user_id: string;
  access_token: string;
  item_id: string;
  institution_id: string | null;
  institution_name: string | null;
  cursor: string | null; // Plaid sync cursor
  created_at: string;
  updated_at: string;
}

export interface AccountRow {
  id: string;
  user_id: string;
  plaid_item_id: string;
  plaid_account_id: string;
  name: string;
  institution_name: string;
  type: string;
  subtype: string;
  balance_current: number;
  balance_available: number | null;
  balance_limit: number | null;
  mask: string;
  is_connected: number;
  last_synced: string | null;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  account_id: string;
  plaid_transaction_id: string | null;
  date: string;
  amount: number;
  description: string;
  merchant_name: string | null;
  category: string;
  subcategory: string | null;
  type: string;
  is_business_expense: number;
  is_tax_deductible: number;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceRow {
  id: string;
  user_id: string;
  client_name: string;
  client_email: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number | null;
  total: number;
  status: string;
  notes: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItemRow {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  sort_order: number;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  cancel_at_period_end: number;
  created_at: string;
  updated_at: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export type FilingStatus =
  | 'single'
  | 'married_jointly'
  | 'married_separately'
  | 'head_of_household';

export type FreelancerType =
  | 'designer'
  | 'developer'
  | 'writer'
  | 'consultant'
  | 'photographer'
  | 'coach'
  | 'other';
