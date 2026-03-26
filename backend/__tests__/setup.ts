/** Global test setup: create an in-memory SQLite DB and run migrations. */
import Database from 'better-sqlite3';
import { setDb } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';

module.exports = async () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  setDb(db);
  runMigrations(db);
  (global as any).__TEST_DB__ = db;
};
