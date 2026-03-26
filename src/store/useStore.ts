/**
 * Central Zustand store for FlowLedger.
 * Combines all state slices into a single store with persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  User,
  Transaction,
  BankAccount,
  Invoice,
  TaxEstimate,
  CashFlowForecast,
  SavingsBucket,
  TaxQuarter,
  LoadingState,
  SubscriptionStatus,
} from '../types';
import { generateCashFlowForecast } from '../services/cashFlowForecast';
import { generateQuarterlyTaxEstimate } from '../services/taxCalculator';
import { getCurrentTaxQuarter } from '../utils/dates';

// ─── State Shape ──────────────────────────────────────────────────────────────

interface AppState {
  // Auth
  user: User | null;
  authToken: string | null;
  isAuthenticated: boolean;

  // UI
  isInitialized: boolean;
  loadingStates: Record<string, LoadingState>;

  // Transactions
  transactions: Transaction[];
  transactionsLoading: LoadingState;

  // Bank Accounts
  accounts: BankAccount[];
  accountsLoading: LoadingState;
  totalBalance: number;

  // Invoices
  invoices: Invoice[];
  invoicesLoading: LoadingState;

  // Tax
  currentTaxEstimate: TaxEstimate | null;
  taxLoading: LoadingState;

  // Cash Flow
  cashFlowForecast: CashFlowForecast | null;
  forecastLoading: LoadingState;

  // Savings
  savingsBuckets: SavingsBucket[];

  // Actions
  initializeApp: () => Promise<void>;
  signIn: (email: string, token: string, user: User) => void;
  signOut: () => void;
  updateUser: (updates: Partial<User>) => void;
  completeOnboarding: () => void;

  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;

  setAccounts: (accounts: BankAccount[]) => void;
  addAccount: (account: BankAccount) => void;
  removeAccount: (accountId: string) => void;

  setInvoices: (invoices: Invoice[]) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;

  refreshTaxEstimate: () => void;
  refreshForecast: () => void;

  setSavingsBuckets: (buckets: SavingsBucket[]) => void;
  updateBucket: (id: string, updates: Partial<SavingsBucket>) => void;

  setLoading: (key: string, state: LoadingState) => void;
}

// ─── Default Savings Buckets ──────────────────────────────────────────────────

const defaultSavingsBuckets: SavingsBucket[] = [
  {
    id: 'tax-reserve',
    name: 'Tax Reserve',
    targetAmount: 5000,
    currentAmount: 0,
    color: '#F39C12',
    icon: 'file-document',
    type: 'tax_reserve',
  },
  {
    id: 'emergency-fund',
    name: 'Emergency Fund',
    targetAmount: 10000,
    currentAmount: 0,
    color: '#3498DB',
    icon: 'shield',
    type: 'emergency_fund',
  },
  {
    id: 'equipment',
    name: 'Equipment Upgrade',
    targetAmount: 3000,
    currentAmount: 0,
    color: '#9B59B6',
    icon: 'monitor',
    type: 'equipment',
  },
];

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      authToken: null,
      isAuthenticated: false,
      isInitialized: false,
      loadingStates: {},
      transactions: [],
      transactionsLoading: 'idle',
      accounts: [],
      accountsLoading: 'idle',
      totalBalance: 0,
      invoices: [],
      invoicesLoading: 'idle',
      currentTaxEstimate: null,
      taxLoading: 'idle',
      cashFlowForecast: null,
      forecastLoading: 'idle',
      savingsBuckets: defaultSavingsBuckets,

      // ─── App Initialization ─────────────────────────────────────────────

      initializeApp: async () => {
        // Hydration is handled by zustand/persist
        // Additional startup logic can go here (e.g., token refresh)
        set({ isInitialized: true });
      },

      // ─── Auth ───────────────────────────────────────────────────────────

      signIn: (email, token, user) => {
        set({ authToken: token, user, isAuthenticated: true });
      },

      signOut: () => {
        set({
          authToken: null,
          user: null,
          isAuthenticated: false,
          transactions: [],
          accounts: [],
          invoices: [],
          currentTaxEstimate: null,
          cashFlowForecast: null,
          totalBalance: 0,
        });
      },

      updateUser: (updates) => {
        const user = get().user;
        if (!user) return;
        set({ user: { ...user, ...updates } });
      },

      completeOnboarding: () => {
        get().updateUser({ onboardingCompleted: true });
      },

      // ─── Transactions ────────────────────────────────────────────────────

      setTransactions: (transactions) => {
        set({ transactions, transactionsLoading: 'success' });
        get().refreshForecast();
        get().refreshTaxEstimate();
      },

      addTransaction: (transaction) => {
        set((state) => ({
          transactions: [transaction, ...state.transactions],
        }));
        get().refreshForecast();
        get().refreshTaxEstimate();
      },

      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, ...updates } : tx
          ),
        }));
        get().refreshTaxEstimate();
      },

      // ─── Accounts ────────────────────────────────────────────────────────

      setAccounts: (accounts) => {
        const totalBalance = accounts.reduce(
          (sum, acc) => sum + acc.balance.current,
          0
        );
        set({ accounts, accountsLoading: 'success', totalBalance });
      },

      addAccount: (account) => {
        set((state) => {
          const accounts = [...state.accounts, account];
          const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance.current, 0);
          return { accounts, totalBalance };
        });
      },

      removeAccount: (accountId) => {
        set((state) => {
          const accounts = state.accounts.filter((a) => a.id !== accountId);
          const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance.current, 0);
          return { accounts, totalBalance };
        });
      },

      // ─── Invoices ─────────────────────────────────────────────────────────

      setInvoices: (invoices) => {
        set({ invoices, invoicesLoading: 'success' });
        get().refreshForecast();
      },

      addInvoice: (invoice) => {
        set((state) => ({ invoices: [invoice, ...state.invoices] }));
        get().refreshForecast();
      },

      updateInvoice: (id, updates) => {
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, ...updates } : inv
          ),
        }));
        get().refreshForecast();
      },

      deleteInvoice: (id) => {
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== id),
        }));
      },

      // ─── Tax Estimate ─────────────────────────────────────────────────────

      refreshTaxEstimate: () => {
        const { transactions, user } = get();
        if (!user) return;

        const { quarter, year } = getCurrentTaxQuarter();
        const yearStart = `${year}-01-01`;
        const now = new Date().toISOString().split('T')[0];

        const ytdIncome = transactions
          .filter((tx) => tx.date >= yearStart && tx.date <= now && tx.amount > 0)
          .reduce((sum, tx) => sum + tx.amount, 0);

        const ytdExpenses = transactions
          .filter(
            (tx) =>
              tx.date >= yearStart &&
              tx.date <= now &&
              tx.amount < 0 &&
              tx.isBusinessExpense
          )
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        const ytdTaxesPaid = transactions
          .filter(
            (tx) => tx.date >= yearStart && tx.date <= now && tx.category === 'taxes_paid'
          )
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        try {
          const estimate = generateQuarterlyTaxEstimate({
            quarter,
            year,
            grossIncome: ytdIncome,
            businessExpenses: ytdExpenses,
            filingStatus: user.filingStatus,
            stateCode: user.stateCode,
            ytdPaid: ytdTaxesPaid,
          });
          set({ currentTaxEstimate: estimate, taxLoading: 'success' });
        } catch {
          set({ taxLoading: 'error' });
        }
      },

      // ─── Cash Flow Forecast ───────────────────────────────────────────────

      refreshForecast: () => {
        const { transactions, totalBalance, invoices } = get();
        if (transactions.length === 0) return;

        const overdueInvoiceTotal = invoices
          .filter((inv) => inv.status === 'overdue' || inv.status === 'sent')
          .reduce((sum, inv) => {
            const due = new Date(inv.dueDate);
            const now = new Date();
            return due < now ? sum + inv.total : sum;
          }, 0);

        const knownIncoming = invoices
          .filter((inv) => inv.status === 'sent' || inv.status === 'viewed')
          .map((inv) => ({ date: inv.dueDate, amount: inv.total }));

        const forecast = generateCashFlowForecast({
          transactions,
          currentBalance: totalBalance,
          knownIncomingPayments: knownIncoming,
          overdueInvoiceTotal,
        });

        set({ cashFlowForecast: forecast, forecastLoading: 'success' });
      },

      // ─── Savings Buckets ──────────────────────────────────────────────────

      setSavingsBuckets: (buckets) => set({ savingsBuckets: buckets }),

      updateBucket: (id, updates) => {
        set((state) => ({
          savingsBuckets: state.savingsBuckets.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        }));
      },

      // ─── Loading ──────────────────────────────────────────────────────────

      setLoading: (key, state) => {
        set((prev) => ({
          loadingStates: { ...prev.loadingStates, [key]: state },
        }));
      },
    }),
    {
      name: 'flowledger-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        authToken: state.authToken,
        isAuthenticated: state.isAuthenticated,
        transactions: state.transactions,
        accounts: state.accounts,
        invoices: state.invoices,
        savingsBuckets: state.savingsBuckets,
        totalBalance: state.totalBalance,
      }),
    }
  )
);

// ─── Selectors ─────────────────────────────────────────────────────────────────

export const selectYtdIncome = (state: AppState): number => {
  const yearStart = `${new Date().getFullYear()}-01-01`;
  return state.transactions
    .filter((tx) => tx.date >= yearStart && tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
};

export const selectYtdExpenses = (state: AppState): number => {
  const yearStart = `${new Date().getFullYear()}-01-01`;
  return state.transactions
    .filter((tx) => tx.date >= yearStart && tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
};

export const selectPendingInvoicesTotal = (state: AppState): number =>
  state.invoices
    .filter((inv) => inv.status === 'sent' || inv.status === 'viewed')
    .reduce((sum, inv) => sum + inv.total, 0);

export const selectOverdueInvoicesTotal = (state: AppState): number => {
  const now = new Date();
  return state.invoices
    .filter((inv) => {
      if (inv.status === 'paid' || inv.status === 'cancelled') return false;
      return new Date(inv.dueDate) < now;
    })
    .reduce((sum, inv) => sum + inv.total, 0);
};

export const selectRecentTransactions = (n: number) => (state: AppState): Transaction[] =>
  [...state.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n);
