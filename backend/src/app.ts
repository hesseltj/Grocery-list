import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { runMigrations } from './db/migrate';
import { errorHandler } from './middleware/errorHandler';

import { authRouter } from './routes/auth';
import { plaidRouter } from './routes/plaid';
import { accountsRouter } from './routes/accounts';
import { transactionsRouter } from './routes/transactions';
import { invoicesRouter } from './routes/invoices';
import { subscriptionRouter } from './routes/subscription';
import { webhooksRouter } from './routes/webhooks';
import { usersRouter } from './routes/users';
import { estimatorRouter } from './routes/estimator';

export function createApp(): express.Application {
  const app = express();

  // ─── Static files (estimator web UI) ──────────────────────────────────────
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // ─── Security Headers ──────────────────────────────────────────────────────
  // Allow inline scripts/styles for the self-contained estimator HTML
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'"],
      },
    },
  }));

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.use(cors({
    origin: [config.urls.app, 'http://localhost:3001', 'http://localhost:8081'],
    credentials: true,
  }));

  // ─── Stripe Webhook (raw body required before json parser) ────────────────
  app.use('/v1/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);

  // ─── Body Parsing ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' })); // larger limit for document submissions
  app.use(compression());

  // ─── Logging ──────────────────────────────────────────────────────────────
  if (config.env !== 'test') {
    app.use(morgan('dev'));
  }

  // ─── Rate Limiting ────────────────────────────────────────────────────────
  if (config.env !== 'test') {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later.' },
    });
    app.use('/v1', limiter);

    // Stricter limit on auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: { error: 'Too many login attempts, please try again later.' },
    });
    app.use('/v1/auth/login', authLimiter);
    app.use('/v1/auth/register', authLimiter);
  }

  // ─── Routes ───────────────────────────────────────────────────────────────
  app.use('/v1/auth', authRouter);
  app.use('/v1/estimate', estimatorRouter);
  app.use('/v1/plaid', plaidRouter);
  app.use('/v1/accounts', accountsRouter);
  app.use('/v1/transactions', transactionsRouter);
  app.use('/v1/invoices', invoicesRouter);
  app.use('/v1/subscription', subscriptionRouter);
  app.use('/v1/users', usersRouter);

  // ─── Health Check ─────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '1.0.0', env: config.env });
  });

  // ─── 404 ──────────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // ─── Error Handler ────────────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}

// Run migrations on startup (idempotent)
if (config.env !== 'test') {
  runMigrations();
}
