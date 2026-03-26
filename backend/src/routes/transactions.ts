import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ApiError } from '../middleware/errorHandler';
import { fetchTransactions } from '../services/plaid';
import { getDb } from '../db/client';
import type { AuthRequest, TransactionRow } from '../types';

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

// ─── GET /v1/transactions ─────────────────────────────────────────────────────

transactionsRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user.userId;
    const { start_date, end_date, account_ids, limit, offset } = req.query;

    // Default: current year to today
    const defaultStart = `${new Date().getFullYear()}-01-01`;
    const defaultEnd = new Date().toISOString().split('T')[0];

    const result = fetchTransactions({
      userId,
      startDate: (start_date as string) || defaultStart,
      endDate: (end_date as string) || defaultEnd,
      accountIds: account_ids ? (account_ids as string).split(',') : undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json({
      transactions: result.transactions.map(serializeTransaction),
      total: result.total,
      has_more: result.hasMore,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /v1/transactions (manual add) ──────────────────────────────────────

const createTransactionSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  amount: z.number(),
  description: z.string().min(1).max(500),
  merchantName: z.string().max(200).optional(),
  category: z.string().optional(),
  isBusinessExpense: z.boolean().optional(),
  isTaxDeductible: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

transactionsRouter.post(
  '/',
  validate(createTransactionSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthRequest).user.userId;
      const db = getDb();

      // Verify account belongs to user
      const account = db
        .prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
        .get(req.body.accountId, userId);
      if (!account) throw new ApiError(404, 'Account not found');

      const id = uuidv4();
      const { accountId, date, amount, description, merchantName, category, isBusinessExpense, isTaxDeductible, notes } = req.body;

      db.prepare(`
        INSERT INTO transactions (id, user_id, account_id, date, amount, description,
          merchant_name, category, type, is_business_expense, is_tax_deductible, notes)
        VALUES (@id, @userId, @accountId, @date, @amount, @description,
          @merchantName, @category, @type, @isBusiness, @isTaxDeductible, @notes)
      `).run({
        id, userId, accountId, date, amount, description,
        merchantName: merchantName ?? null,
        category: category ?? 'uncategorized',
        type: amount > 0 ? 'income' : 'expense',
        isBusiness: isBusinessExpense ? 1 : 0,
        isTaxDeductible: isTaxDeductible ? 1 : 0,
        notes: notes ?? null,
      });

      const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as TransactionRow;
      res.status(201).json(serializeTransaction(tx));
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /v1/transactions/:id ───────────────────────────────────────────────

const updateTransactionSchema = z.object({
  category: z.string().optional(),
  isBusinessExpense: z.boolean().optional(),
  isTaxDeductible: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
  merchantName: z.string().max(200).optional(),
});

transactionsRouter.patch(
  '/:id',
  validate(updateTransactionSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthRequest).user.userId;
      const db = getDb();

      const existing = db
        .prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
        .get(req.params.id, userId) as TransactionRow | undefined;
      if (!existing) throw new ApiError(404, 'Transaction not found');

      const updates: string[] = [];
      const values: Record<string, unknown> = { id: req.params.id, now: new Date().toISOString() };

      if (req.body.category !== undefined) { updates.push('category = @category'); values.category = req.body.category; }
      if (req.body.isBusinessExpense !== undefined) { updates.push('is_business_expense = @isBusiness'); values.isBusiness = req.body.isBusinessExpense ? 1 : 0; }
      if (req.body.isTaxDeductible !== undefined) { updates.push('is_tax_deductible = @isTaxDeductible'); values.isTaxDeductible = req.body.isTaxDeductible ? 1 : 0; }
      if (req.body.notes !== undefined) { updates.push('notes = @notes'); values.notes = req.body.notes; }
      if (req.body.merchantName !== undefined) { updates.push('merchant_name = @merchantName'); values.merchantName = req.body.merchantName; }

      if (updates.length === 0) throw new ApiError(400, 'No update fields provided');

      db.prepare(`UPDATE transactions SET ${updates.join(', ')}, updated_at = @now WHERE id = @id`).run(values);

      const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id) as TransactionRow;
      res.json(serializeTransaction(updated));
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /v1/transactions/:id ──────────────────────────────────────────────

transactionsRouter.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user.userId;
    const db = getDb();
    const result = db
      .prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
      .run(req.params.id, userId);
    if (result.changes === 0) throw new ApiError(404, 'Transaction not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

function serializeTransaction(row: TransactionRow) {
  return {
    id: row.id,
    accountId: row.account_id,
    plaidTransactionId: row.plaid_transaction_id,
    date: row.date,
    amount: row.amount,
    description: row.description,
    merchantName: row.merchant_name,
    category: row.category,
    subcategory: row.subcategory,
    type: row.type,
    isBusinessExpense: row.is_business_expense === 1,
    isTaxDeductible: row.is_tax_deductible === 1,
    notes: row.notes,
    receiptUrl: row.receipt_url,
  };
}
