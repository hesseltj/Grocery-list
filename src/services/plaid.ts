/**
 * Plaid integration service for FlowLedger.
 *
 * In production, all Plaid API calls go through your backend server
 * (never from the mobile app directly) to protect your client_secret.
 * This service wraps your backend API endpoints.
 *
 * Environment: set EXPO_PUBLIC_API_BASE_URL in .env
 */

import type { BankAccount, PlaidLinkToken, Transaction, TransactionCategory } from '../types';
import { autoClassifyTransaction } from '../utils/categories';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.flowledger.com/v1';

// ─── Auth Headers ─────────────────────────────────────────────────────────────

async function getAuthHeaders(userToken: string): Promise<Record<string, string>> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userToken}`,
  };
}

// ─── Link Token ───────────────────────────────────────────────────────────────

/**
 * Requests a Plaid Link token from your backend.
 * This is used to initialize the Plaid Link SDK on-device.
 */
export async function createLinkToken(userToken: string): Promise<PlaidLinkToken> {
  const headers = await getAuthHeaders(userToken);
  const res = await fetch(`${API_BASE}/plaid/link-token`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? 'Failed to create Plaid link token');
  }

  return res.json();
}

/**
 * Exchanges a Plaid public_token (from Link SDK success callback)
 * for an access token via your backend.
 */
export async function exchangePublicToken(
  publicToken: string,
  userToken: string
): Promise<{ accountId: string; institutionName: string }> {
  const headers = await getAuthHeaders(userToken);
  const res = await fetch(`${API_BASE}/plaid/exchange`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ public_token: publicToken }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? 'Failed to exchange Plaid token');
  }

  return res.json();
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

/**
 * Fetches all linked bank accounts for the current user.
 */
export async function fetchLinkedAccounts(userToken: string): Promise<BankAccount[]> {
  const headers = await getAuthHeaders(userToken);
  const res = await fetch(`${API_BASE}/accounts`, { headers });

  if (!res.ok) {
    throw new Error('Failed to fetch linked accounts');
  }

  return res.json();
}

// ─── Transactions ─────────────────────────────────────────────────────────────

interface FetchTransactionsParams {
  userToken: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  accountIds?: string[];
  cursor?: string; // for pagination
}

interface FetchTransactionsResult {
  transactions: Transaction[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Fetches transactions from your backend (which fetches from Plaid).
 * Returns normalized Transaction objects with auto-classification applied.
 */
export async function fetchTransactions(
  params: FetchTransactionsParams
): Promise<FetchTransactionsResult> {
  const headers = await getAuthHeaders(params.userToken);
  const query = new URLSearchParams({
    start_date: params.startDate,
    end_date: params.endDate,
    ...(params.cursor && { cursor: params.cursor }),
    ...(params.accountIds && { account_ids: params.accountIds.join(',') }),
  });

  const res = await fetch(`${API_BASE}/transactions?${query}`, { headers });

  if (!res.ok) {
    throw new Error('Failed to fetch transactions');
  }

  const raw = await res.json();
  const transactions: Transaction[] = (raw.transactions ?? []).map(normalizeTransaction);

  return {
    transactions,
    nextCursor: raw.next_cursor,
    hasMore: raw.has_more ?? false,
  };
}

/**
 * Normalizes a raw Plaid transaction into our internal Transaction type.
 */
function normalizeTransaction(raw: {
  transaction_id: string;
  account_id: string;
  date: string;
  amount: number;
  name: string;
  merchant_name?: string;
  category?: string[];
}): Transaction {
  // Plaid uses negative amounts for debits; we flip the sign for clarity
  // In FlowLedger: positive = income, negative = expense
  const amount = -raw.amount; // Plaid convention: positive = outflow

  const { category, isBusinessExpense } = autoClassifyTransaction(
    raw.merchant_name ?? raw.name,
    amount
  );

  return {
    id: raw.transaction_id,
    accountId: raw.account_id,
    date: raw.date,
    amount,
    description: raw.name,
    merchantName: raw.merchant_name,
    category: category as TransactionCategory,
    type: amount > 0 ? 'income' : 'expense',
    isBusinessExpense,
    isTaxDeductible: isBusinessExpense,
  };
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

/**
 * Triggers a manual transaction sync for all linked accounts.
 */
export async function syncTransactions(userToken: string): Promise<{ synced: number }> {
  const headers = await getAuthHeaders(userToken);
  const res = await fetch(`${API_BASE}/plaid/sync`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    throw new Error('Failed to sync transactions');
  }

  return res.json();
}

/**
 * Removes a linked account (revokes Plaid access).
 */
export async function removeLinkedAccount(
  accountId: string,
  userToken: string
): Promise<void> {
  const headers = await getAuthHeaders(userToken);
  const res = await fetch(`${API_BASE}/accounts/${accountId}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    throw new Error('Failed to remove linked account');
  }
}
