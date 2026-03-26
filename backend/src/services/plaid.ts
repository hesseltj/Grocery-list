import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  Transaction as PlaidTransaction,
} from 'plaid';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client';
import { config } from '../config';
import type { PlaidItemRow, AccountRow, TransactionRow } from '../types';

// ─── Plaid Client ─────────────────────────────────────────────────────────────

function getPlaidClient(): PlaidApi {
  const cfg = new Configuration({
    basePath: PlaidEnvironments[config.plaid.env],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': config.plaid.clientId,
        'PLAID-SECRET': config.plaid.secret,
      },
    },
  });
  return new PlaidApi(cfg);
}

// ─── Link Token ───────────────────────────────────────────────────────────────

export async function createLinkToken(userId: string): Promise<string> {
  const plaid = getPlaidClient();
  const response = await plaid.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'FlowLedger',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
  });
  return response.data.link_token;
}

// ─── Token Exchange ───────────────────────────────────────────────────────────

export interface ExchangeResult {
  plaidItemId: string;
  institutionName: string;
}

export async function exchangePublicToken(
  publicToken: string,
  userId: string
): Promise<ExchangeResult> {
  const plaid = getPlaidClient();

  const exchangeRes = await plaid.itemPublicTokenExchange({ public_token: publicToken });
  const { access_token, item_id } = exchangeRes.data;

  // Fetch institution info
  const itemRes = await plaid.itemGet({ access_token });
  const institutionId = itemRes.data.item.institution_id ?? '';
  let institutionName = '';

  if (institutionId) {
    try {
      const instRes = await plaid.institutionsGetById({
        institution_id: institutionId,
        country_codes: [CountryCode.Us],
      });
      institutionName = instRes.data.institution.name;
    } catch {
      // Non-critical — continue without institution name
    }
  }

  // Store the item
  const db = getDb();
  const itemDbId = uuidv4();
  db.prepare(`
    INSERT INTO plaid_items (id, user_id, access_token, item_id, institution_id, institution_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(itemDbId, userId, access_token, item_id, institutionId, institutionName);

  // Fetch and store accounts
  await syncAccounts(itemDbId, userId, access_token, institutionName);

  return { plaidItemId: itemDbId, institutionName };
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

async function syncAccounts(
  plaidItemId: string,
  userId: string,
  accessToken: string,
  institutionName: string
): Promise<void> {
  const plaid = getPlaidClient();
  const db = getDb();

  const res = await plaid.accountsGet({ access_token: accessToken });

  const upsert = db.prepare(`
    INSERT INTO accounts (id, user_id, plaid_item_id, plaid_account_id, name, institution_name,
      type, subtype, balance_current, balance_available, balance_limit, mask, last_synced)
    VALUES (@id, @userId, @plaidItemId, @plaidAccountId, @name, @institutionName,
      @type, @subtype, @balanceCurrent, @balanceAvailable, @balanceLimit, @mask, @now)
    ON CONFLICT(plaid_account_id) DO UPDATE SET
      balance_current   = @balanceCurrent,
      balance_available = @balanceAvailable,
      balance_limit     = @balanceLimit,
      last_synced       = @now
  `);

  const now = new Date().toISOString();
  for (const acct of res.data.accounts) {
    upsert.run({
      id: uuidv4(),
      userId,
      plaidItemId,
      plaidAccountId: acct.account_id,
      name: acct.name,
      institutionName,
      type: acct.type,
      subtype: acct.subtype ?? '',
      balanceCurrent: acct.balances.current ?? 0,
      balanceAvailable: acct.balances.available ?? null,
      balanceLimit: acct.balances.limit ?? null,
      mask: acct.mask ?? '',
      now,
    });
  }
}

export function getAccountsForUser(userId: string): AccountRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY name').all(userId) as AccountRow[];
}

export function removeItem(userId: string, plaidItemId: string): void {
  const db = getDb();
  // Verify ownership before deleting
  const item = db
    .prepare('SELECT id FROM plaid_items WHERE id = ? AND user_id = ?')
    .get(plaidItemId, userId);
  if (!item) return;
  db.prepare('DELETE FROM plaid_items WHERE id = ?').run(plaidItemId);
}

// ─── Transaction Sync ─────────────────────────────────────────────────────────

export interface SyncResult {
  added: number;
  modified: number;
  removed: number;
}

export async function syncTransactionsForUser(userId: string): Promise<SyncResult> {
  const db = getDb();
  const items = db
    .prepare('SELECT * FROM plaid_items WHERE user_id = ?')
    .all(userId) as PlaidItemRow[];

  let totalAdded = 0;
  let totalModified = 0;
  let totalRemoved = 0;

  for (const item of items) {
    const result = await syncItemTransactions(item, userId);
    totalAdded += result.added;
    totalModified += result.modified;
    totalRemoved += result.removed;
  }

  return { added: totalAdded, modified: totalModified, removed: totalRemoved };
}

async function syncItemTransactions(
  item: PlaidItemRow,
  userId: string
): Promise<SyncResult> {
  const plaid = getPlaidClient();
  const db = getDb();

  let cursor = item.cursor ?? undefined;
  let added = 0;
  let modified = 0;
  let removed = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await plaid.transactionsSync({
      access_token: item.access_token,
      cursor,
    });

    const { added: newTxs, modified: modTxs, removed: removedTxs, next_cursor, has_more } = res.data;

    // Upsert added/modified
    for (const tx of [...newTxs, ...modTxs]) {
      upsertTransaction(db, userId, tx);
      if (newTxs.includes(tx)) added++;
      else modified++;
    }

    // Remove deleted transactions
    for (const removed_tx of removedTxs) {
      db.prepare('DELETE FROM transactions WHERE plaid_transaction_id = ?').run(
        removed_tx.transaction_id
      );
      removed++;
    }

    cursor = next_cursor;
    hasMore = has_more;
  }

  // Update cursor
  db.prepare('UPDATE plaid_items SET cursor = ?, updated_at = ? WHERE id = ?').run(
    cursor ?? null,
    new Date().toISOString(),
    item.id
  );

  return { added, modified, removed };
}

function upsertTransaction(
  db: ReturnType<typeof getDb>,
  userId: string,
  tx: PlaidTransaction
): void {
  // Get internal account ID
  const account = db
    .prepare('SELECT id FROM accounts WHERE plaid_account_id = ?')
    .get(tx.account_id) as { id: string } | undefined;
  if (!account) return;

  // Plaid: positive = outflow (debit), negative = inflow (credit)
  // FlowLedger: positive = income, negative = expense
  const amount = -(tx.amount);
  const type = amount > 0 ? 'income' : 'expense';
  const category = inferCategory(tx);

  db.prepare(`
    INSERT INTO transactions
      (id, user_id, account_id, plaid_transaction_id, date, amount, description,
       merchant_name, category, type, is_business_expense, is_tax_deductible)
    VALUES
      (@id, @userId, @accountId, @plaidId, @date, @amount, @description,
       @merchantName, @category, @type, @isBusiness, @isTaxDeductible)
    ON CONFLICT(plaid_transaction_id) DO UPDATE SET
      amount       = @amount,
      description  = @description,
      merchant_name = @merchantName,
      category     = @category,
      updated_at   = datetime('now')
  `).run({
    id: uuidv4(),
    userId,
    accountId: account.id,
    plaidId: tx.transaction_id,
    date: tx.date,
    amount,
    description: tx.name,
    merchantName: tx.merchant_name ?? null,
    category,
    type,
    isBusiness: 0,
    isTaxDeductible: 0,
  });
}

function inferCategory(tx: PlaidTransaction): string {
  const name = (tx.merchant_name ?? tx.name ?? '').toLowerCase();
  const plaidCat = (tx.personal_finance_category?.primary ?? '').toLowerCase();

  if (plaidCat === 'income' || name.includes('paypal') || name.includes('stripe') || name.includes('upwork'))
    return tx.amount < 0 ? 'client_payment' : 'other_income';
  if (name.includes('adobe') || name.includes('figma') || name.includes('github') || name.includes('notion') || name.includes('slack') || name.includes('zoom'))
    return 'software_tools';
  if (plaidCat === 'food_and_drink' || name.includes('doordash') || name.includes('uber eats') || name.includes('grubhub'))
    return 'meals_entertainment';
  if (plaidCat === 'travel' || name.includes('uber') || name.includes('lyft') || name.includes('airbnb') || name.includes('airline'))
    return 'travel';
  if (name.includes('apple store') || name.includes('best buy') || name.includes('b&h'))
    return 'equipment';
  if (name.includes('insurance') || name.includes('cigna') || name.includes('aetna'))
    return 'health_insurance';

  return tx.amount > 0 ? 'uncategorized' : 'personal';
}

// ─── Fetch Transactions ───────────────────────────────────────────────────────

export interface FetchTransactionsOptions {
  userId: string;
  startDate: string;
  endDate: string;
  accountIds?: string[];
  limit?: number;
  offset?: number;
}

export interface FetchTransactionsResult {
  transactions: TransactionRow[];
  total: number;
  hasMore: boolean;
}

export function fetchTransactions(opts: FetchTransactionsOptions): FetchTransactionsResult {
  const db = getDb();
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  let where = `user_id = ? AND date >= ? AND date <= ?`;
  const params: unknown[] = [opts.userId, opts.startDate, opts.endDate];

  if (opts.accountIds?.length) {
    where += ` AND account_id IN (${opts.accountIds.map(() => '?').join(',')})`;
    params.push(...opts.accountIds);
  }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM transactions WHERE ${where}`).get(...params) as { cnt: number }).cnt;
  const transactions = db
    .prepare(`SELECT * FROM transactions WHERE ${where} ORDER BY date DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as TransactionRow[];

  return { transactions, total, hasMore: offset + transactions.length < total };
}
