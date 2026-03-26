import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { getDb } from '../db/client';
import type { UserRow, JwtPayload } from '../types';

const SALT_ROUNDS = 12;

// ─── Password ─────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Tokens ───────────────────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

// ─── User CRUD ────────────────────────────────────────────────────────────────

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  freelancerType?: string;
  stateCode?: string;
  filingStatus?: string;
}

export function createUser(input: CreateUserInput, passwordHash: string): UserRow {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO users (id, email, name, password_hash, freelancer_type, state_code, filing_status, created_at, updated_at)
    VALUES (@id, @email, @name, @password_hash, @freelancer_type, @state_code, @filing_status, @now, @now)
  `);

  stmt.run({
    id,
    email: input.email.toLowerCase().trim(),
    name: input.name.trim(),
    password_hash: passwordHash,
    freelancer_type: input.freelancerType ?? 'other',
    state_code: input.stateCode ?? 'CA',
    filing_status: input.filingStatus ?? 'single',
    now,
  });

  return getUserById(id)!;
}

export function getUserById(id: string): UserRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function getUserByEmail(email: string): UserRow | undefined {
  const db = getDb();
  return db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.toLowerCase().trim()) as UserRow | undefined;
}

export function updateUser(id: string, updates: Partial<Pick<UserRow,
  'name' | 'freelancer_type' | 'state_code' | 'filing_status' |
  'subscription_status' | 'stripe_customer_id' | 'onboarding_completed'
>>): void {
  const db = getDb();
  const fields = Object.keys(updates)
    .map((k) => `${k} = @${k}`)
    .join(', ');

  db.prepare(`
    UPDATE users SET ${fields}, updated_at = @now WHERE id = @id
  `).run({ ...updates, now: new Date().toISOString(), id });
}

/** Serializes a UserRow for API responses (strips password_hash). */
export function serializeUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    freelancerType: user.freelancer_type,
    stateCode: user.state_code,
    filingStatus: user.filing_status,
    subscription: user.subscription_status,
    onboardingCompleted: user.onboarding_completed === 1,
    createdAt: user.created_at,
  };
}
