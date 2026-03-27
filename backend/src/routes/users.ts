/**
 * GDPR / user data routes.
 *
 * GET  /v1/users/export  — returns a JSON dump of everything stored for the user
 * DELETE /v1/users/me    — permanently deletes all user data (cascade deletes apply)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDb } from '../db/client';
import type { AuthRequest } from '../types';

export const usersRouter = Router();
usersRouter.use(requireAuth);

// ─── GET /v1/users/export ─────────────────────────────────────────────────────

usersRouter.get('/export', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user.userId;
    const db = getDb();

    const user = db.prepare(
      'SELECT id, email, name, freelancer_type, state_code, filing_status, subscription_status, onboarding_completed, created_at FROM users WHERE id = ?'
    ).get(userId);

    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId) as Record<string, unknown>[];
    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all(userId) as Record<string, unknown>[];
    const invoices = db.prepare('SELECT * FROM invoices WHERE user_id = ?').all(userId) as Record<string, unknown>[];
    const lineItems: Record<string, unknown>[] = invoices.length
      ? db.prepare(
          `SELECT ili.* FROM invoice_line_items ili
           JOIN invoices i ON ili.invoice_id = i.id
           WHERE i.user_id = ?`
        ).all(userId) as Record<string, unknown>[]
      : [];
    const subscription = db.prepare(
      'SELECT plan_id, status, current_period_start, current_period_end, trial_end, cancel_at_period_end FROM subscriptions WHERE user_id = ?'
    ).get(userId);

    res.setHeader('Content-Disposition', 'attachment; filename="flowledger-data-export.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      user,
      subscription: subscription ?? null,
      accounts,
      transactions,
      invoices: invoices.map((inv) => ({
        ...inv,
        lineItems: lineItems.filter((li) => li.invoice_id === inv.id),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /v1/users/me ──────────────────────────────────────────────────────

usersRouter.delete('/me', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user.userId;
    const db = getDb();

    // Cascade deletes handle: plaid_items, accounts, transactions, invoices,
    // invoice_line_items, subscriptions — all defined with ON DELETE CASCADE in schema
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
