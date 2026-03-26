/**
 * Simple migration runner.
 * Reads all .sql files from the migrations directory in order and executes them.
 * Safe to run multiple times — each migration is idempotent.
 */
import fs from 'fs';
import path from 'path';
import { getDb } from './client';

export function runMigrations(db = getDb()): void {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    // Execute the entire migration file as a single batch
    db.exec(sql);
    console.log(`✓ Applied migration: ${file}`);
  }

  console.log('Database migrations complete.');
}

// Allow running directly: ts-node src/db/migrate.ts
if (require.main === module) {
  runMigrations();
}
