import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ApiError } from '../middleware/errorHandler';
import { getDb } from '../db/client';
import type { AuthRequest, InvoiceRow, InvoiceLineItemRow } from '../types';

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
});

const createInvoiceSchema = z.object({
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().email().optional(),
  invoiceNumber: z.string().min(1).max(50),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
  currency: z.string().length(3).default('USD'),
});

const updateInvoiceSchema = z.object({
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled']).optional(),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
});

// ─── GET /v1/invoices ─────────────────────────────────────────────────────────

invoicesRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user.userId;
    const { status } = req.query;
    const db = getDb();

    let query = 'SELECT * FROM invoices WHERE user_id = ?';
    const params: unknown[] = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY issue_date DESC';
    const invoices = db.prepare(query).all(...params) as InvoiceRow[];

    const result = invoices.map((inv) => {
      const lineItems = db
        .prepare('SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order')
        .all(inv.id) as InvoiceLineItemRow[];
      return serializeInvoice(inv, lineItems);
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /v1/invoices/:id ─────────────────────────────────────────────────────

invoicesRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user.userId;
    const db = getDb();

    const invoice = db
      .prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?')
      .get(req.params.id, userId) as InvoiceRow | undefined;
    if (!invoice) throw new ApiError(404, 'Invoice not found');

    const lineItems = db
      .prepare('SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order')
      .all(invoice.id) as InvoiceLineItemRow[];

    res.json(serializeInvoice(invoice, lineItems));
  } catch (err) {
    next(err);
  }
});

// ─── POST /v1/invoices ────────────────────────────────────────────────────────

invoicesRouter.post(
  '/',
  validate(createInvoiceSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthRequest).user.userId;
      const db = getDb();
      const { clientName, clientEmail, invoiceNumber, issueDate, dueDate, lineItems, taxRate, notes, currency } = req.body;

      // Calculate totals
      const computedItems = lineItems.map((item: z.infer<typeof lineItemSchema>) => ({
        ...item,
        amount: item.quantity * item.rate,
      }));
      const subtotal = computedItems.reduce((s: number, i: { amount: number }) => s + i.amount, 0);
      const taxAmount = taxRate ? subtotal * (taxRate / 100) : null;
      const total = subtotal + (taxAmount ?? 0);

      const invoiceId = uuidv4();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO invoices (id, user_id, client_name, client_email, invoice_number,
          issue_date, due_date, subtotal, tax_rate, tax_amount, total, notes, currency, created_at, updated_at)
        VALUES (@id, @userId, @clientName, @clientEmail, @invoiceNumber,
          @issueDate, @dueDate, @subtotal, @taxRate, @taxAmount, @total, @notes, @currency, @now, @now)
      `).run({
        id: invoiceId, userId, clientName, clientEmail: clientEmail ?? null,
        invoiceNumber, issueDate, dueDate, subtotal, taxRate: taxRate ?? null,
        taxAmount, total, notes: notes ?? null, currency, now,
      });

      // Insert line items
      computedItems.forEach((item: { description: string; quantity: number; rate: number; amount: number }, idx: number) => {
        db.prepare(`
          INSERT INTO invoice_line_items (id, invoice_id, description, quantity, rate, amount, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), invoiceId, item.description, item.quantity, item.rate, item.amount, idx);
      });

      const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as InvoiceRow;
      const storedItems = db
        .prepare('SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order')
        .all(invoiceId) as InvoiceLineItemRow[];

      res.status(201).json(serializeInvoice(invoice, storedItems));
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /v1/invoices/:id ───────────────────────────────────────────────────

invoicesRouter.patch(
  '/:id',
  validate(updateInvoiceSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthRequest).user.userId;
      const db = getDb();

      const existing = db
        .prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?')
        .get(req.params.id, userId) as InvoiceRow | undefined;
      if (!existing) throw new ApiError(404, 'Invoice not found');

      const updates: string[] = [];
      const values: Record<string, unknown> = { id: req.params.id, now: new Date().toISOString() };

      if (req.body.status !== undefined) { updates.push('status = @status'); values.status = req.body.status; }
      if (req.body.paidDate !== undefined) { updates.push('paid_date = @paidDate'); values.paidDate = req.body.paidDate; }
      if (req.body.notes !== undefined) { updates.push('notes = @notes'); values.notes = req.body.notes; }

      if (updates.length > 0) {
        db.prepare(`UPDATE invoices SET ${updates.join(', ')}, updated_at = @now WHERE id = @id`).run(values);
      }

      const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as InvoiceRow;
      const lineItems = db
        .prepare('SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order')
        .all(req.params.id) as InvoiceLineItemRow[];

      res.json(serializeInvoice(updated, lineItems));
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /v1/invoices/:id ──────────────────────────────────────────────────

invoicesRouter.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user.userId;
    const db = getDb();
    const result = db
      .prepare('DELETE FROM invoices WHERE id = ? AND user_id = ?')
      .run(req.params.id, userId);
    if (result.changes === 0) throw new ApiError(404, 'Invoice not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

function serializeInvoice(row: InvoiceRow, lineItems: InvoiceLineItemRow[]) {
  return {
    id: row.id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    invoiceNumber: row.invoice_number,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    paidDate: row.paid_date,
    lineItems: lineItems.map((li) => ({
      id: li.id,
      description: li.description,
      quantity: li.quantity,
      rate: li.rate,
      amount: li.amount,
    })),
    subtotal: row.subtotal,
    taxRate: row.tax_rate,
    taxAmount: row.tax_amount,
    total: row.total,
    status: row.status,
    notes: row.notes,
    currency: row.currency,
  };
}
