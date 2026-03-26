import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionForUser,
} from '../services/stripe';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ApiError } from '../middleware/errorHandler';
import { getUserById } from '../services/auth';
import type { AuthRequest } from '../types';

export const subscriptionRouter = Router();
subscriptionRouter.use(requireAuth);

// ─── GET /v1/subscription ─────────────────────────────────────────────────────

subscriptionRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user.userId;
    const sub = getSubscriptionForUser(userId);
    const user = getUserById(userId);

    if (!sub) {
      res.json({ status: user?.subscription_status ?? 'free' });
      return;
    }

    res.json({
      status: sub.status,
      planId: sub.plan_id,
      currentPeriodEnd: sub.current_period_end,
      trialEnd: sub.trial_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end === 1,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /v1/subscription/checkout ──────────────────────────────────────────

const checkoutSchema = z.object({
  plan_id: z.enum(['pro_monthly', 'pro_annual']),
});

subscriptionRouter.post(
  '/checkout',
  validate(checkoutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, email } = (req as AuthRequest).user;
      const user = getUserById(userId);
      if (!user) throw new ApiError(404, 'User not found');

      const checkoutUrl = await createCheckoutSession({
        userId,
        email,
        name: user.name,
        planId: req.body.plan_id,
      });

      res.json({ checkoutUrl });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /v1/subscription/portal ────────────────────────────────────────────

subscriptionRouter.post('/portal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user.userId;
    const portalUrl = await createPortalSession(userId);
    res.json({ portalUrl });
  } catch (err) {
    next(err);
  }
});
