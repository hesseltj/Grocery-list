/**
 * Stripe subscription service for FlowLedger.
 *
 * Uses RevenueCat as the subscription management layer on top of Stripe,
 * which handles cross-platform subscriptions (iOS App Store + Google Play + web).
 *
 * For direct Stripe integration (web billing), we call our backend.
 */

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.flowledger.com/v1';

export type PlanId = 'pro_monthly' | 'pro_annual';

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  price: number;
  interval: 'month' | 'year';
  description: string;
  features: string[];
  savingsVsMonthly?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: 12.99,
    interval: 'month',
    description: 'Full access, billed monthly',
    features: [
      'Unlimited bank account connections',
      'AI cash flow forecasting',
      'Quarterly tax estimation',
      'Invoice tracking (unlimited)',
      'CSV/PDF exports',
      'Priority support',
    ],
  },
  {
    id: 'pro_annual',
    name: 'Pro Annual',
    price: 99,
    interval: 'year',
    description: 'Full access, billed annually',
    features: [
      'Everything in Pro Monthly',
      'Schedule C-ready tax summary',
      'Advanced multi-client reporting',
      'Early access to new features',
      '2 months free vs monthly',
    ],
    savingsVsMonthly: 'Save $56.88/year (37% off)',
  },
];

// ─── Subscription Status ──────────────────────────────────────────────────────

export interface CustomerSubscription {
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';
  planId?: PlanId;
  currentPeriodEnd?: string;
  trialEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Fetches the current user's subscription status from the backend.
 */
export async function getSubscriptionStatus(userToken: string): Promise<CustomerSubscription> {
  const res = await fetch(`${API_BASE}/subscription`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch subscription status');
  }

  return res.json();
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

/**
 * Creates a Stripe Checkout session URL for web billing.
 * Used when a user upgrades on web or when in-app purchase is unavailable.
 */
export async function createCheckoutSession(params: {
  planId: PlanId;
  userToken: string;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<{ checkoutUrl: string }> {
  const res = await fetch(`${API_BASE}/subscription/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.userToken}`,
    },
    body: JSON.stringify({
      plan_id: params.planId,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? 'Failed to create checkout session');
  }

  return res.json();
}

/**
 * Creates a Stripe Customer Portal session for managing existing subscription.
 */
export async function createPortalSession(userToken: string): Promise<{ portalUrl: string }> {
  const res = await fetch(`${API_BASE}/subscription/portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to create portal session');
  }

  return res.json();
}

/**
 * Cancels the user's subscription at the end of the current period.
 */
export async function cancelSubscription(userToken: string): Promise<void> {
  const res = await fetch(`${API_BASE}/subscription/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to cancel subscription');
  }
}

// ─── Trial ────────────────────────────────────────────────────────────────────

/**
 * Starts the 14-day free trial (requires payment method upfront).
 */
export async function startFreeTrial(params: {
  planId: PlanId;
  userToken: string;
}): Promise<{ trialEnd: string }> {
  const res = await fetch(`${API_BASE}/subscription/trial`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.userToken}`,
    },
    body: JSON.stringify({ plan_id: params.planId }),
  });

  if (!res.ok) {
    throw new Error('Failed to start trial');
  }

  return res.json();
}
