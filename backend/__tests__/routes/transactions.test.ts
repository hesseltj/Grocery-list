import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createTestDb, createTestApp, resetTables } from '../helpers';
import { getDb } from '../../src/db/client';
import type Database from 'better-sqlite3';

let db: Database.Database;
let app: ReturnType<typeof createTestApp>;
let token: string;
let userId: string;
let accountId: string;

beforeAll(() => {
  db = createTestDb();
  app = createTestApp();
});

beforeEach(async () => {
  resetTables(db);

  // Create a user
  const res = await request(app).post('/v1/auth/register').send({
    email: 'txuser@example.com',
    name: 'Tx User',
    password: 'password123',
  });
  token = res.body.token;
  userId = res.body.user.id;

  // Seed a bank account directly (bypassing Plaid)
  const db2 = getDb();
  const plaidItemId = uuidv4();
  db2.prepare(`
    INSERT INTO plaid_items (id, user_id, access_token, item_id)
    VALUES (?, ?, 'tok_test', 'item_test')
  `).run(plaidItemId, userId);

  accountId = uuidv4();
  db2.prepare(`
    INSERT INTO accounts (id, user_id, plaid_item_id, plaid_account_id, name, institution_name, type, mask)
    VALUES (?, ?, ?, 'plaid_acct_1', 'Checking', 'Test Bank', 'checking', '1234')
  `).run(accountId, userId, plaidItemId);
});

// ─── GET /v1/transactions ─────────────────────────────────────────────────────

describe('GET /v1/transactions', () => {
  beforeEach(() => {
    const db2 = getDb();
    db2.prepare(`
      INSERT INTO transactions (id, user_id, account_id, date, amount, description, category, type)
      VALUES (?, ?, ?, '2024-03-01', 2500, 'Client payment', 'client_payment', 'income')
    `).run(uuidv4(), userId, accountId);
    db2.prepare(`
      INSERT INTO transactions (id, user_id, account_id, date, amount, description, category, type)
      VALUES (?, ?, ?, '2024-03-05', -150, 'Figma', 'software_tools', 'expense')
    `).run(uuidv4(), userId, accountId);
  });

  it('returns transactions for current user', async () => {
    const res = await request(app)
      .get('/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .query({ start_date: '2024-01-01', end_date: '2024-12-31' });
    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(2);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/v1/transactions');
    expect(res.status).toBe(401);
  });

  it('paginates results', async () => {
    const res = await request(app)
      .get('/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .query({ start_date: '2024-01-01', end_date: '2024-12-31', limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.has_more).toBe(true);
    expect(res.body.total).toBe(2);
  });

  it('does not return transactions from other users', async () => {
    // Register a second user with their own transaction
    const res2 = await request(app).post('/v1/auth/register').send({
      email: 'other@example.com', name: 'Other', password: 'password123',
    });
    const otherUserId = res2.body.user.id;
    getDb().prepare(`
      INSERT INTO transactions (id, user_id, account_id, date, amount, description, category, type)
      VALUES (?, ?, ?, '2024-03-10', 999, 'Other income', 'other_income', 'income')
    `).run(uuidv4(), otherUserId, accountId);

    const res = await request(app)
      .get('/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .query({ start_date: '2024-01-01', end_date: '2024-12-31' });
    expect(res.body.transactions.every((t: { id: string }) => {
      const tx = getDb().prepare('SELECT user_id FROM transactions WHERE id = ?').get(t.id) as any;
      return tx.user_id === userId;
    })).toBe(true);
  });
});

// ─── POST /v1/transactions ────────────────────────────────────────────────────

describe('POST /v1/transactions', () => {
  const validTx = {
    date: '2024-03-15',
    amount: 3500,
    description: 'Website project',
    category: 'client_payment',
    isBusinessExpense: false,
    isTaxDeductible: false,
  };

  it('creates a transaction and returns it', async () => {
    const res = await request(app)
      .post('/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validTx, accountId });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(3500);
    expect(res.body.description).toBe('Website project');
  });

  it('returns 404 for unknown account', async () => {
    const res = await request(app)
      .post('/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validTx, accountId: uuidv4() });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid date format', async () => {
    const res = await request(app)
      .post('/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validTx, accountId, date: '15-03-2024' });
    expect(res.status).toBe(400);
  });

  it('infers type from amount sign', async () => {
    const res = await request(app)
      .post('/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validTx, accountId, amount: -200, description: 'Office supplies' });
    expect(res.body.type).toBe('expense');
  });
});

// ─── PATCH /v1/transactions/:id ───────────────────────────────────────────────

describe('PATCH /v1/transactions/:id', () => {
  let txId: string;

  beforeEach(() => {
    txId = uuidv4();
    getDb().prepare(`
      INSERT INTO transactions (id, user_id, account_id, date, amount, description, category, type)
      VALUES (?, ?, ?, '2024-03-01', -99, 'Slack', 'uncategorized', 'expense')
    `).run(txId, userId, accountId);
  });

  it('updates category and business flag', async () => {
    const res = await request(app)
      .patch(`/v1/transactions/${txId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'software_tools', isBusinessExpense: true, isTaxDeductible: true });
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('software_tools');
    expect(res.body.isBusinessExpense).toBe(true);
  });

  it('returns 404 for unknown transaction', async () => {
    const res = await request(app)
      .patch(`/v1/transactions/${uuidv4()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'software_tools' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for empty update', async () => {
    const res = await request(app)
      .patch(`/v1/transactions/${txId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /v1/transactions/:id ──────────────────────────────────────────────

describe('DELETE /v1/transactions/:id', () => {
  let txId: string;

  beforeEach(() => {
    txId = uuidv4();
    getDb().prepare(`
      INSERT INTO transactions (id, user_id, account_id, date, amount, description, category, type)
      VALUES (?, ?, ?, '2024-03-01', 1000, 'Payment', 'client_payment', 'income')
    `).run(txId, userId, accountId);
  });

  it('deletes the transaction', async () => {
    const res = await request(app)
      .delete(`/v1/transactions/${txId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);

    const check = getDb().prepare('SELECT id FROM transactions WHERE id = ?').get(txId);
    expect(check).toBeUndefined();
  });

  it('returns 404 for unknown transaction', async () => {
    const res = await request(app)
      .delete(`/v1/transactions/${uuidv4()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
