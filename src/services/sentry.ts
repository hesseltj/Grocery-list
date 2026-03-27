/**
 * Sentry error tracking for FlowLedger.
 *
 * Setup: npm install sentry-expo @sentry/react-native
 * Then add EXPO_PUBLIC_SENTRY_DSN to your .env.local
 */

// Lazy import so the app doesn't crash if sentry-expo isn't installed yet
let Sentry: typeof import('sentry-expo') | null = null;
try {
  Sentry = require('sentry-expo');
} catch {
  // sentry-expo not installed — error tracking disabled
}

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || !Sentry) return;

  Sentry.init({
    dsn,
    enableInExpoDevelopment: false,
    debug: false,
    tracesSampleRate: 0.2, // 20% of transactions for performance monitoring
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!Sentry) return;
  if (context) {
    Sentry.Native.withScope((scope) => {
      scope.setExtras(context);
      Sentry.Native.captureException(error);
    });
  } else {
    Sentry.Native.captureException(error);
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (!Sentry) return;
  Sentry.Native.captureMessage(message, level);
}

export function setUser(user: { id: string; email: string } | null): void {
  if (!Sentry) return;
  Sentry.Native.setUser(user);
}
