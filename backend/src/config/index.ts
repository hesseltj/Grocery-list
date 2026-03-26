import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function require_env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional_env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  env: optional_env('NODE_ENV', 'development') as 'development' | 'test' | 'production',
  port: parseInt(optional_env('PORT', '3000'), 10),

  db: {
    path: optional_env('DATABASE_PATH', './data/flowledger.db'),
  },

  jwt: {
    secret: optional_env('JWT_SECRET', 'dev_secret_change_in_production_32chars!!'),
    expiresIn: optional_env('JWT_EXPIRES_IN', '7d'),
    refreshExpiresIn: optional_env('REFRESH_TOKEN_EXPIRES_IN', '90d'),
  },

  plaid: {
    clientId: optional_env('PLAID_CLIENT_ID', ''),
    secret: optional_env('PLAID_SECRET', ''),
    env: optional_env('PLAID_ENV', 'sandbox') as 'sandbox' | 'development' | 'production',
  },

  stripe: {
    secretKey: optional_env('STRIPE_SECRET_KEY', ''),
    webhookSecret: optional_env('STRIPE_WEBHOOK_SECRET', ''),
    monthlyPriceId: optional_env('STRIPE_MONTHLY_PRICE_ID', ''),
    annualPriceId: optional_env('STRIPE_ANNUAL_PRICE_ID', ''),
  },

  urls: {
    app: optional_env('APP_URL', 'http://localhost:3001'),
    api: optional_env('API_URL', 'http://localhost:3000'),
    stripeSuccess: optional_env('STRIPE_SUCCESS_URL', 'http://localhost:3001/upgrade/success'),
    stripeCancel: optional_env('STRIPE_CANCEL_URL', 'http://localhost:3001/upgrade'),
  },
} as const;
