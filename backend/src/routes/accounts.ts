import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { getAccountsForUser } from '../services/plaid';
import type { AuthRequest, AccountRow } from '../types';

export const accountsRouter = Router();
accountsRouter.use(requireAuth);

// ─── GET /v1/accounts ─────────────────────────────────────────────────────────

accountsRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user.userId;
    const rows = getAccountsForUser(userId);
    res.json(rows.map(serializeAccount));
  } catch (err) {
    next(err);
  }
});

function serializeAccount(row: AccountRow) {
  return {
    id: row.id,
    plaidAccountId: row.plaid_account_id,
    name: row.name,
    institutionName: row.institution_name,
    type: row.type,
    subtype: row.subtype,
    balance: {
      current: row.balance_current,
      available: row.balance_available,
      limit: row.balance_limit,
      isoCurrencyCode: 'USD',
    },
    mask: row.mask,
    isConnected: row.is_connected === 1,
    lastSynced: row.last_synced,
  };
}
