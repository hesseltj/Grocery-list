import { Router, Request, Response } from 'express';
import { constructWebhookEvent, handleSubscriptionEvent } from '../services/stripe';

export const webhooksRouter = Router();

/**
 * POST /v1/webhooks/stripe
 *
 * Stripe sends events here. The body must be the raw buffer (not parsed JSON)
 * for signature verification to work — ensure express.raw() is applied upstream.
 */
webhooksRouter.post('/stripe', (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event;
  try {
    event = constructWebhookEvent(req.body as Buffer, signature as string);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification failed';
    console.error('[stripe webhook] verification failed:', msg);
    res.status(400).json({ error: msg });
    return;
  }

  try {
    handleSubscriptionEvent(event);
  } catch (err) {
    console.error('[stripe webhook] handler error:', err);
    // Still return 200 — Stripe retries on non-2xx, which we don't want for handler errors
  }

  res.json({ received: true });
});
