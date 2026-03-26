import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  createUser,
  getUserByEmail,
  updateUser,
  serializeUser,
} from '../services/auth';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ApiError } from '../middleware/errorHandler';
import type { AuthRequest } from '../types';

export const authRouter = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  freelancerType: z.enum(['designer', 'developer', 'writer', 'consultant', 'photographer', 'coach', 'other']).optional(),
  stateCode: z.string().length(2).optional(),
  filingStatus: z.enum(['single', 'married_jointly', 'married_separately', 'head_of_household']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  freelancerType: z.enum(['designer', 'developer', 'writer', 'consultant', 'photographer', 'coach', 'other']).optional(),
  stateCode: z.string().length(2).optional(),
  filingStatus: z.enum(['single', 'married_jointly', 'married_separately', 'head_of_household']).optional(),
  onboardingCompleted: z.boolean().optional(),
});

// ─── POST /v1/auth/register ───────────────────────────────────────────────────

authRouter.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, password, freelancerType, stateCode, filingStatus } = req.body;

      const existing = getUserByEmail(email);
      if (existing) {
        throw new ApiError(409, 'An account with this email already exists');
      }

      const passwordHash = await hashPassword(password);
      const user = createUser(
        { email, name, password, freelancerType, stateCode, filingStatus },
        passwordHash
      );

      const token = signAccessToken({ userId: user.id, email: user.email });

      res.status(201).json({
        token,
        user: serializeUser(user),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /v1/auth/login ──────────────────────────────────────────────────────

authRouter.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const user = getUserByEmail(email);
      if (!user) {
        throw new ApiError(401, 'Invalid email or password');
      }

      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        throw new ApiError(401, 'Invalid email or password');
      }

      const token = signAccessToken({ userId: user.id, email: user.email });

      res.json({
        token,
        user: serializeUser(user),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /v1/auth/me ─────────────────────────────────────────────────────────

authRouter.get(
  '/me',
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { getUserById } = require('../services/auth');
      const user = getUserById((req as AuthRequest).user.userId);
      if (!user) throw new ApiError(404, 'User not found');
      res.json({ user: serializeUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /v1/auth/profile ───────────────────────────────────────────────────

authRouter.patch(
  '/profile',
  requireAuth,
  validate(updateProfileSchema),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthRequest).user.userId;
      const { name, freelancerType, stateCode, filingStatus, onboardingCompleted } = req.body;

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (freelancerType !== undefined) updates.freelancer_type = freelancerType;
      if (stateCode !== undefined) updates.state_code = stateCode;
      if (filingStatus !== undefined) updates.filing_status = filingStatus;
      if (onboardingCompleted !== undefined) updates.onboarding_completed = onboardingCompleted ? 1 : 0;

      if (Object.keys(updates).length === 0) {
        throw new ApiError(400, 'No update fields provided');
      }

      updateUser(userId, updates as Parameters<typeof updateUser>[1]);

      const { getUserById } = require('../services/auth');
      const updatedUser = getUserById(userId);
      res.json({ user: serializeUser(updatedUser) });
    } catch (err) {
      next(err);
    }
  }
);
