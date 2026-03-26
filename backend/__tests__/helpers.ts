import Database from 'better-sqlite3';
import { setDb } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';
import { createApp } from '../src/app';
import type { Application } from 'express';

/** Returns a fresh in-memory DB for a test suite and registers it globally. */
export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  setDb(db);
  runMigrations(db);
  return db;
}

/** Returns an Express app backed by the in-memory test DB. */
export function createTestApp(): Application {
  return createApp();
}

/** Wipes all user-data tables between tests (keeps schema). */
export function resetTables(db: Database.Database): void {
  db.exec(`
    DELETE FROM subscriptions;
    DELETE FROM invoice_line_items;
    DELETE FROM invoices;
    DELETE FROM transactions;
    DELETE FROM accounts;
    DELETE FROM plaid_items;
    DELETE FROM users;
  `);
}
