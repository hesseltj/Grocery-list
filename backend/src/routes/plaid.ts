import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createLinkToken,
  exchangePublicToken,
  syncTransactionsForUser,
  getAccountsForUser,
  fetchTransactions,
  removeItem,
} from '../services/plaid';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ApiError } from '../middleware/errorHandler';
import type { AuthRequest } from '../types';

export const plaidRouter = Router();
plaidRouter.use(requireAuth);

// ─── POST /v1/plaid/link-token ────────────────────────────────────────────────

plaidRouter.post('/link-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user.userId;
    const linkToken = await createLinkToken(userId);
    res.json({ linkToken, expiration: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() });
  } catch (err) {
    next(err);
  }
});

// ─── POST /v1/plaid/exchange ──────────────────────────────────────────────────

const exchangeSchema = z.object({
  public_token: z.string().min(1, 'public_token is required'),
});

plaidRouter.post(
  '/exchange',
  validate(exchangeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthRequest).user.userId;
      const result = await exchangePublicToken(req.body.public_token, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /v1/plaid/sync ──────────────────────────────────────────────────────

plaidRouter.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user.userId;
    const result = await syncTransactionsForUser(userId);
    res.json({ synced: result.added + result.modified, ...result });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /v1/plaid/items/:itemId ───────────────────────────────────────────

plaidRouter.delete('/items/:itemId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user.userId;
    removeItem(userId, req.params.itemId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
