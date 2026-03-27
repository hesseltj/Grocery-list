/**
 * Analytics event tracking for FlowLedger using PostHog.
 *
 * Setup: npm install posthog-react-native
 * Then add EXPO_PUBLIC_POSTHOG_KEY and EXPO_PUBLIC_POSTHOG_HOST to .env.local
 *
 * Key events to track for product analytics:
 *   Onboarding funnel → Core activation → Monetization
 */

let posthog: { capture: (event: string, props?: Record<string, unknown>) => void; identify: (id: string, props?: Record<string, unknown>) => void; reset: () => void } | null = null;

try {
  const { PostHog } = require('posthog-react-native');
  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';
  if (key) {
    posthog = new PostHog(key, { host });
  }
} catch {
  // posthog-react-native not installed — analytics disabled
}

function track(event: string, properties?: Record<string, unknown>): void {
  posthog?.capture(event, properties);
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export const Analytics = {
  // Onboarding funnel
  onboardingStarted: () => track('onboarding_started'),
  onboardingStepCompleted: (step: number, stepName: string) =>
    track('onboarding_step_completed', { step, step_name: stepName }),
  onboardingCompleted: (freelancerType: string) =>
    track('onboarding_completed', { freelancer_type: freelancerType }),

  // Core activation (north star events)
  bankAccountConnected: (institutionName: string) =>
    track('bank_account_connected', { institution: institutionName }),
  firstTransactionViewed: () => track('first_transaction_viewed'),
  taxEstimateViewed: (estimatedTax: number) =>
    track('tax_estimate_viewed', { estimated_tax: Math.round(estimatedTax) }),
  invoiceCreated: (total: number, currency: string) =>
    track('invoice_created', { total, currency }),
  cashFlowForecastViewed: () => track('cash_flow_forecast_viewed'),

  // Monetization funnel
  paywallViewed: (trigger: string) => track('paywall_viewed', { trigger }),
  trialStarted: (plan: string) => track('trial_started', { plan }),
  subscriptionPurchased: (plan: string, price: number, currency = 'USD') =>
    track('subscription_purchased', { plan, price, currency }),
  subscriptionCancelled: (plan: string, reason?: string) =>
    track('subscription_cancelled', { plan, reason }),
  checkoutAbandoned: (plan: string) => track('checkout_abandoned', { plan }),

  // Engagement
  weeklyReportViewed: () => track('weekly_report_viewed'),
  transactionCategoryEdited: () => track('transaction_category_edited'),
  invoiceStatusUpdated: (status: string) =>
    track('invoice_status_updated', { status }),

  // User identity
  identify: (userId: string, props: { email: string; plan: string; freelancerType: string }) => {
    posthog?.identify(userId, {
      email: props.email,
      plan: props.plan,
      freelancer_type: props.freelancerType,
    });
  },
  reset: () => posthog?.reset(),
};
