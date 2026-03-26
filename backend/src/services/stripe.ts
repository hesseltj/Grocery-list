import Stripe from 'stripe';
import { config } from '../config';
import { getDb } from '../db/client';
import { updateUser } from './auth';
import type { SubscriptionRow } from '../types';

function getStripe(): Stripe {
  return new Stripe(config.stripe.secretKey, { apiVersion: '2024-06-20' });
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export async function getOrCreateStripeCustomer(userId: string, email: string, name: string): Promise<string> {
  const db = getDb();
  const user = db.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').get(userId) as { stripe_customer_id: string | null };

  if (user.stripe_customer_id) return user.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create({ email, name, metadata: { userId } });
  updateUser(userId, { stripe_customer_id: customer.id });
  return customer.id;
}

// ─── Checkout Session ─────────────────────────────────────────────────────────

export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  name: string;
  planId: 'pro_monthly' | 'pro_annual';
}): Promise<string> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(params.userId, params.email, params.name);

  const priceId = params.planId === 'pro_annual'
    ? config.stripe.annualPriceId
    : config.stripe.monthlyPriceId;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId: params.userId },
    },
    success_url: config.urls.stripeSuccess + '?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: config.urls.stripeCancel,
    metadata: { userId: params.userId },
  });

  return session.url!;
}

// ─── Customer Portal ──────────────────────────────────────────────────────────

export async function createPortalSession(userId: string): Promise<string> {
  const db = getDb();
  const user = db
    .prepare('SELECT stripe_customer_id FROM users WHERE id = ?')
    .get(userId) as { stripe_customer_id: string | null };

  if (!user.stripe_customer_id) {
    throw new Error('No Stripe customer found for this user');
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: config.urls.app + '/settings',
  });

  return session.url;
}

// ─── Subscription Status ──────────────────────────────────────────────────────

export function getSubscriptionForUser(userId: string): SubscriptionRow | null {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(userId) as SubscriptionRow | null;
}

// ─── Webhook Handling ─────────────────────────────────────────────────────────

export function constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
}

export function handleSubscriptionEvent(event: Stripe.Event): void {
  const db = getDb();

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated'
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata.userId;
    if (!userId) return;

    const now = new Date().toISOString();
    const status = sub.status; // active, trialing, past_due, canceled, etc.

    // Map Stripe status to our subscription_status
    const internalStatus =
      status === 'active' ? 'pro' :
      status === 'trialing' ? 'trial' :
      status === 'past_due' ? 'pro' : // still give access while past_due
      'free';

    // Upsert subscription record
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, stripe_subscription_id, stripe_customer_id,
        plan_id, status, current_period_start, current_period_end, trial_end, cancel_at_period_end, created_at, updated_at)
      VALUES (@id, @userId, @stripeSubId, @stripeCustomerId,
        @planId, @status, @periodStart, @periodEnd, @trialEnd, @cancelAtEnd, @now, @now)
      ON CONFLICT(stripe_subscription_id) DO UPDATE SET
        status                = @status,
        current_period_start  = @periodStart,
        current_period_end    = @periodEnd,
        trial_end             = @trialEnd,
        cancel_at_period_end  = @cancelAtEnd,
        updated_at            = @now
    `).run({
      id: uuidv4_simple(),
      userId,
      stripeSubId: sub.id,
      stripeCustomerId: sub.customer as string,
      planId: sub.items.data[0]?.price.id ?? '',
      status,
      periodStart: new Date(sub.current_period_start * 1000).toISOString(),
      periodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      cancelAtEnd: sub.cancel_at_period_end ? 1 : 0,
      now,
    });

    updateUser(userId, { subscription_status: internalStatus });
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata.userId;
    if (!userId) return;
    updateUser(userId, { subscription_status: 'expired' });
    db.prepare(`UPDATE subscriptions SET status = 'canceled', updated_at = ? WHERE stripe_subscription_id = ?`)
      .run(new Date().toISOString(), sub.id);
  }
}

/** Minimal UUID v4 generator — avoids importing uuid in this file. */
function uuidv4_simple(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
