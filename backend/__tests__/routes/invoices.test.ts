import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createTestDb, createTestApp, resetTables } from '../helpers';
import type Database from 'better-sqlite3';

let db: Database.Database;
let app: ReturnType<typeof createTestApp>;
let token: string;

const validInvoice = {
  clientName: 'Acme Corp',
  clientEmail: 'billing@acme.com',
  invoiceNumber: 'INV-001',
  issueDate: '2024-03-01',
  dueDate: '2024-03-31',
  lineItems: [
    { description: 'Web development', quantity: 10, rate: 150 },
    { description: 'Design work', quantity: 5, rate: 100 },
  ],
  taxRate: 10,
  notes: 'Thank you for your business',
  currency: 'USD',
};

beforeAll(() => {
  db = createTestDb();
  app = createTestApp();
});

beforeEach(async () => {
  resetTables(db);

  const res = await request(app).post('/v1/auth/register').send({
    email: 'invoiceuser@example.com',
    name: 'Invoice User',
    password: 'password123',
  });
  token = res.body.token;
});

// ─── GET /v1/invoices ─────────────────────────────────────────────────────────

describe('GET /v1/invoices', () => {
  beforeEach(async () => {
    await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send(validInvoice);
    await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validInvoice, invoiceNumber: 'INV-002', status: 'sent' });
  });

  it('returns all invoices for current user', async () => {
    const res = await request(app)
      .get('/v1/invoices')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/v1/invoices');
    expect(res.status).toBe(401);
  });

  it('filters by status', async () => {
    // Mark one invoice as paid
    const allRes = await request(app)
      .get('/v1/invoices')
      .set('Authorization', `Bearer ${token}`);
    const invoiceId = allRes.body[0].id;

    await request(app)
      .patch(`/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid', paidDate: '2024-03-15' });

    const paidRes = await request(app)
      .get('/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .query({ status: 'paid' });
    expect(paidRes.status).toBe(200);
    expect(paidRes.body).toHaveLength(1);
    expect(paidRes.body[0].status).toBe('paid');
  });

  it('does not return invoices from other users', async () => {
    const res2 = await request(app).post('/v1/auth/register').send({
      email: 'other@example.com',
      name: 'Other User',
      password: 'password123',
    });
    const otherToken = res2.body.token;

    await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ ...validInvoice, invoiceNumber: 'OTHER-001' });

    const res = await request(app)
      .get('/v1/invoices')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body).toHaveLength(2);
    res.body.forEach((inv: { invoiceNumber: string }) => {
      expect(inv.invoiceNumber).not.toBe('OTHER-001');
    });
  });
});

// ─── GET /v1/invoices/:id ─────────────────────────────────────────────────────

describe('GET /v1/invoices/:id', () => {
  let invoiceId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send(validInvoice);
    invoiceId = res.body.id;
  });

  it('returns invoice with line items', async () => {
    const res = await request(app)
      .get(`/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(invoiceId);
    expect(res.body.lineItems).toHaveLength(2);
    expect(res.body.clientName).toBe('Acme Corp');
  });

  it('returns 404 for unknown invoice', async () => {
    const res = await request(app)
      .get(`/v1/invoices/${uuidv4()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for another user\'s invoice', async () => {
    const res2 = await request(app).post('/v1/auth/register').send({
      email: 'other2@example.com',
      name: 'Other User',
      password: 'password123',
    });
    const otherToken = res2.body.token;

    const res = await request(app)
      .get(`/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});

// ─── POST /v1/invoices ────────────────────────────────────────────────────────

describe('POST /v1/invoices', () => {
  it('creates invoice and calculates totals', async () => {
    const res = await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send(validInvoice);
    expect(res.status).toBe(201);
    expect(res.body.clientName).toBe('Acme Corp');
    expect(res.body.subtotal).toBe(2000); // 10*150 + 5*100
    expect(res.body.taxAmount).toBeCloseTo(200); // 10% of 2000
    expect(res.body.total).toBeCloseTo(2200);
    expect(res.body.status).toBe('draft');
    expect(res.body.lineItems).toHaveLength(2);
  });

  it('creates invoice without tax rate', async () => {
    const { taxRate, ...noTax } = validInvoice;
    const res = await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send(noTax);
    expect(res.status).toBe(201);
    expect(res.body.taxRate).toBeNull();
    expect(res.body.taxAmount).toBeNull();
    expect(res.body.total).toBe(2000);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientName: 'Acme' }); // missing lineItems, invoiceNumber, dates
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty line items array', async () => {
    const res = await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validInvoice, lineItems: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid date format', async () => {
    const res = await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validInvoice, issueDate: '01/03/2024' });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/v1/invoices').send(validInvoice);
    expect(res.status).toBe(401);
  });

  it('creates invoice without optional clientEmail', async () => {
    const { clientEmail, ...noEmail } = validInvoice;
    const res = await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send(noEmail);
    expect(res.status).toBe(201);
    expect(res.body.clientEmail).toBeNull();
  });
});

// ─── PATCH /v1/invoices/:id ───────────────────────────────────────────────────

describe('PATCH /v1/invoices/:id', () => {
  let invoiceId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send(validInvoice);
    invoiceId = res.body.id;
  });

  it('updates status to sent', async () => {
    const res = await request(app)
      .patch(`/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'sent' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('sent');
  });

  it('marks invoice as paid with paidDate', async () => {
    const res = await request(app)
      .patch(`/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid', paidDate: '2024-03-20' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paid');
    expect(res.body.paidDate).toBe('2024-03-20');
  });

  it('updates notes', async () => {
    const res = await request(app)
      .patch(`/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Updated payment terms' });
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('Updated payment terms');
  });

  it('returns 404 for unknown invoice', async () => {
    const res = await request(app)
      .patch(`/v1/invoices/${uuidv4()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'sent' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .patch(`/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invalid_status' });
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /v1/invoices/:id ──────────────────────────────────────────────────

describe('DELETE /v1/invoices/:id', () => {
  let invoiceId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send(validInvoice);
    invoiceId = res.body.id;
  });

  it('deletes the invoice and its line items', async () => {
    const res = await request(app)
      .delete(`/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);

    const check = await request(app)
      .get(`/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(check.status).toBe(404);
  });

  it('returns 404 for unknown invoice', async () => {
    const res = await request(app)
      .delete(`/v1/invoices/${uuidv4()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when deleting another user\'s invoice', async () => {
    const res2 = await request(app).post('/v1/auth/register').send({
      email: 'other3@example.com',
      name: 'Other User',
      password: 'password123',
    });
    const otherToken = res2.body.token;

    const res = await request(app)
      .delete(`/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});
