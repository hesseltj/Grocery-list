-- FlowLedger initial schema
-- Run via: ts-node src/db/migrate.ts

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                   TEXT PRIMARY KEY,
  email                TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  password_hash        TEXT NOT NULL,
  freelancer_type      TEXT NOT NULL DEFAULT 'other',
  state_code           TEXT NOT NULL DEFAULT 'CA',
  filing_status        TEXT NOT NULL DEFAULT 'single',
  subscription_status  TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id   TEXT,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

-- ─── Plaid Items (linked institutions) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS plaid_items (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token     TEXT NOT NULL,
  item_id          TEXT NOT NULL UNIQUE,
  institution_id   TEXT,
  institution_name TEXT,
  cursor           TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plaid_items_user ON plaid_items(user_id);

-- ─── Bank Accounts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plaid_item_id     TEXT NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  plaid_account_id  TEXT NOT NULL,
  name              TEXT NOT NULL,
  institution_name  TEXT NOT NULL,
  type              TEXT NOT NULL,
  subtype           TEXT NOT NULL DEFAULT '',
  balance_current   REAL NOT NULL DEFAULT 0,
  balance_available REAL,
  balance_limit     REAL,
  mask              TEXT NOT NULL DEFAULT '',
  is_connected      INTEGER NOT NULL DEFAULT 1,
  last_synced       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_plaid_id ON accounts(plaid_account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- ─── Transactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id           TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plaid_transaction_id TEXT UNIQUE,
  date                 TEXT NOT NULL,
  amount               REAL NOT NULL,
  description          TEXT NOT NULL,
  merchant_name        TEXT,
  category             TEXT NOT NULL DEFAULT 'uncategorized',
  subcategory          TEXT,
  type                 TEXT NOT NULL DEFAULT 'expense',
  is_business_expense  INTEGER NOT NULL DEFAULT 0,
  is_tax_deductible    INTEGER NOT NULL DEFAULT 0,
  notes                TEXT,
  receipt_url          TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_user     ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account  ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_plaid_id ON transactions(plaid_transaction_id);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name    TEXT NOT NULL,
  client_email   TEXT,
  invoice_number TEXT NOT NULL,
  issue_date     TEXT NOT NULL,
  due_date       TEXT NOT NULL,
  paid_date      TEXT,
  subtotal       REAL NOT NULL DEFAULT 0,
  tax_rate       REAL,
  tax_amount     REAL,
  total          REAL NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'draft',
  notes          TEXT,
  currency       TEXT NOT NULL DEFAULT 'USD',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_user   ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(user_id, status);

-- ─── Invoice Line Items ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    REAL NOT NULL DEFAULT 1,
  rate        REAL NOT NULL DEFAULT 0,
  amount      REAL NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON invoice_line_items(invoice_id);

-- ─── Subscriptions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     TEXT PRIMARY KEY,
  user_id                TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id     TEXT NOT NULL,
  plan_id                TEXT NOT NULL,
  status                 TEXT NOT NULL,
  current_period_start   TEXT NOT NULL,
  current_period_end     TEXT NOT NULL,
  trial_end              TEXT,
  cancel_at_period_end   INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user   ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- ─── Schema version tracking ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO schema_migrations(version) VALUES ('001_initial_schema');
