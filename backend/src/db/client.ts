import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = config.db.path;

  // Ensure the data directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(dbPath);

  // Performance settings
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');

  return _db;
}

/** Replace the database instance (used in tests to inject an in-memory DB). */
export function setDb(db: Database.Database): void {
  _db = db;
}

/** Close and reset (used in tests). */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
