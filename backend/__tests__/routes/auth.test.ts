import request from 'supertest';
import { createTestDb, createTestApp, resetTables } from '../helpers';
import type Database from 'better-sqlite3';

let db: Database.Database;
let app: ReturnType<typeof createTestApp>;

beforeAll(() => {
  db = createTestDb();
  app = createTestApp();
});

beforeEach(() => resetTables(db));

// ─── POST /v1/auth/register ───────────────────────────────────────────────────

describe('POST /v1/auth/register', () => {
  const validPayload = {
    email: 'jane@example.com',
    name: 'Jane Smith',
    password: 'securepass123',
  };

  it('creates a new user and returns token + user', async () => {
    const res = await request(app).post('/v1/auth/register').send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('jane@example.com');
    expect(res.body.user.name).toBe('Jane Smith');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('returns 409 when email already exists', async () => {
    await request(app).post('/v1/auth/register').send(validPayload);
    const res = await request(app).post('/v1/auth/register').send(validPayload);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ ...validPayload, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for password shorter than 8 chars', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ ...validPayload, password: 'short' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for name shorter than 2 chars', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ ...validPayload, name: 'X' });
    expect(res.status).toBe(400);
  });

  it('normalizes email to lowercase', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ ...validPayload, email: 'JANE@EXAMPLE.COM' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('jane@example.com');
  });

  it('accepts optional freelancerType and stateCode', async () => {
    const res = await request(app).post('/v1/auth/register').send({
      ...validPayload,
      freelancerType: 'developer',
      stateCode: 'NY',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.freelancerType).toBe('developer');
    expect(res.body.user.stateCode).toBe('NY');
  });

  it('sets onboardingCompleted to false by default', async () => {
    const res = await request(app).post('/v1/auth/register').send(validPayload);
    expect(res.body.user.onboardingCompleted).toBe(false);
  });
});

// ─── POST /v1/auth/login ──────────────────────────────────────────────────────

describe('POST /v1/auth/login', () => {
  const creds = { email: 'login@example.com', name: 'Login User', password: 'mypassword99' };

  beforeEach(async () => {
    await request(app).post('/v1/auth/register').send(creds);
  });

  it('returns token on valid credentials', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: creds.email, password: creds.password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(creds.email);
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: creds.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns 401 for non-existent email', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'anything' });
    expect(res.status).toBe(401);
  });

  it('is case-insensitive for email', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: creds.email.toUpperCase(), password: creds.password });
    expect(res.status).toBe(200);
  });

  it('returns 400 for missing password', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: creds.email });
    expect(res.status).toBe(400);
  });
});

// ─── GET /v1/auth/me ─────────────────────────────────────────────────────────

describe('GET /v1/auth/me', () => {
  let token: string;

  beforeEach(async () => {
    const res = await request(app).post('/v1/auth/register').send({
      email: 'me@example.com',
      name: 'Me User',
      password: 'password123',
    });
    token = res.body.token;
  });

  it('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@example.com');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /v1/auth/profile ───────────────────────────────────────────────────

describe('PATCH /v1/auth/profile', () => {
  let token: string;

  beforeEach(async () => {
    const res = await request(app).post('/v1/auth/register').send({
      email: 'profile@example.com',
      name: 'Profile User',
      password: 'password123',
    });
    token = res.body.token;
  });

  it('updates freelancerType', async () => {
    const res = await request(app)
      .patch('/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ freelancerType: 'designer' });
    expect(res.status).toBe(200);
    expect(res.body.user.freelancerType).toBe('designer');
  });

  it('updates stateCode', async () => {
    const res = await request(app)
      .patch('/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ stateCode: 'TX' });
    expect(res.status).toBe(200);
    expect(res.body.user.stateCode).toBe('TX');
  });

  it('marks onboarding complete', async () => {
    const res = await request(app)
      .patch('/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ onboardingCompleted: true });
    expect(res.status).toBe(200);
    expect(res.body.user.onboardingCompleted).toBe(true);
  });

  it('returns 400 for empty update', async () => {
    const res = await request(app)
      .patch('/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .patch('/v1/auth/profile')
      .send({ freelancerType: 'developer' });
    expect(res.status).toBe(401);
  });
});
