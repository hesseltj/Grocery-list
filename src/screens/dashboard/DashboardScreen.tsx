import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'react-native-linear-gradient';

import { Card } from '../../components/common/Card';
import { AlertBanner } from '../../components/common/AlertBanner';
import { TransactionItem } from '../../components/transactions/TransactionItem';
import { EmptyState } from '../../components/common/EmptyState';
import {
  useStore,
  selectYtdIncome,
  selectYtdExpenses,
  selectPendingInvoicesTotal,
  selectRecentTransactions,
} from '../../store/useStore';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../utils/currency';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useStore((s) => s.user);
  const totalBalance = useStore((s) => s.totalBalance);
  const cashFlowForecast = useStore((s) => s.cashFlowForecast);
  const currentTaxEstimate = useStore((s) => s.currentTaxEstimate);
  const refreshForecast = useStore((s) => s.refreshForecast);
  const refreshTaxEstimate = useStore((s) => s.refreshTaxEstimate);

  const ytdIncome = useStore(selectYtdIncome);
  const ytdExpenses = useStore(selectYtdExpenses);
  const pendingInvoices = useStore(selectPendingInvoicesTotal);
  const recentTransactions = useStore(selectRecentTransactions(5));

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshForecast();
    refreshTaxEstimate();
    setRefreshing(false);
  }, [refreshForecast, refreshTaxEstimate]);

  const alerts = cashFlowForecast?.alerts.slice(0, 2) ?? [];
  const currentYear = new Date().getFullYear();
  const greeting = getGreeting();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Card */}
      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        style={[styles.heroCard, { paddingTop: insets.top + spacing[5] }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.greeting}>{greeting}, {user?.name?.split(' ')[0] ?? 'there'} 👋</Text>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>{formatCurrency(totalBalance)}</Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>YTD Income</Text>
            <Text style={[styles.heroStatValue, { color: '#7FFFDC' }]}>
              {formatCurrencyCompact(ytdIncome)}
            </Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>YTD Expenses</Text>
            <Text style={[styles.heroStatValue, { color: '#FFB3AE' }]}>
              {formatCurrencyCompact(ytdExpenses)}
            </Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>Pending</Text>
            <Text style={[styles.heroStatValue, { color: '#FFE27A' }]}>
              {formatCurrencyCompact(pendingInvoices)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Alerts */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            {alerts.map((alert) => (
              <AlertBanner key={alert.id} alert={alert} />
            ))}
          </View>
        )}

        {/* Quick Stats Row */}
        <View style={styles.quickStats}>
          <QuickStatCard
            icon="calculator-variant-outline"
            label="Quarterly Tax Due"
            value={currentTaxEstimate
              ? formatCurrency(currentTaxEstimate.quarterlyPaymentDue)
              : '—'}
            sublabel={currentTaxEstimate?.dueDate
              ? `Due ${currentTaxEstimate.dueDate}`
              : 'Connect accounts to estimate'}
            color={colors.warning}
          />
          <QuickStatCard
            icon="trending-up"
            label={`${currentYear} Net Income`}
            value={formatCurrencyCompact(ytdIncome - ytdExpenses)}
            sublabel={`${formatPercent((ytdIncome - ytdExpenses) / (ytdIncome || 1))} margin`}
            color={colors.success}
          />
        </View>

        {/* Cash Flow Forecast Preview */}
        {cashFlowForecast && (
          <Card style={styles.forecastCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Cash Flow Forecast</Text>
              <Text style={styles.confidenceBadge}>
                {Math.round(cashFlowForecast.confidenceScore * 100)}% confidence
              </Text>
            </View>
            <Text style={styles.forecastSubtitle}>Next 12 weeks projection</Text>

            <View style={styles.forecastBars}>
              {cashFlowForecast.dataPoints.slice(0, 8).map((dp, i) => {
                const maxIncome = Math.max(...cashFlowForecast.dataPoints.slice(0, 8).map(d => d.projectedIncome));
                const incomeHeight = maxIncome > 0 ? (dp.projectedIncome / maxIncome) * 48 : 4;
                return (
                  <View key={i} style={styles.barWrapper}>
                    <View style={[styles.incomeBar, { height: incomeHeight, backgroundColor: dp.isRisk ? colors.danger : colors.secondary }]} />
                  </View>
                );
              })}
            </View>
            <View style={styles.forecastLegend}>
              <Text style={styles.forecastLegendText}>
                Avg Monthly: {formatCurrencyCompact(cashFlowForecast.averageMonthlyIncome)}
              </Text>
              {cashFlowForecast.dataPoints.some((d) => d.isRisk) && (
                <Text style={[styles.forecastLegendText, { color: colors.danger }]}>
                  ⚠️ {cashFlowForecast.dataPoints.filter(d => d.isRisk).length} risk weeks
                </Text>
              )}
            </View>
          </Card>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </View>

          {recentTransactions.length === 0 ? (
            <Card padded={false} style={{ overflow: 'hidden' }}>
              <EmptyState
                icon="bank-outline"
                title="No transactions yet"
                description="Connect your bank account or add a transaction manually to get started."
                actionLabel="Connect Bank"
                onAction={() => {}}
              />
            </Card>
          ) : (
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {recentTransactions.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
            </Card>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function QuickStatCard({
  icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  sublabel: string;
  color: string;
}) {
  return (
    <View style={[quickStatStyles.card, shadows.sm]}>
      <View style={[quickStatStyles.iconContainer, { backgroundColor: `${color}18` }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      </View>
      <Text style={quickStatStyles.label}>{label}</Text>
      <Text style={quickStatStyles.value}>{value}</Text>
      <Text style={quickStatStyles.sublabel}>{sublabel}</Text>
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const quickStatStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  label: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  value: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sublabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroCard: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
  },
  greeting: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing[3],
  },
  balanceLabel: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing[1],
  },
  balanceAmount: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -1,
    marginBottom: spacing[5],
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 3,
    fontWeight: '500',
  },
  heroStatValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  heroDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: spacing[1],
  },
  body: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  section: {
    marginBottom: spacing[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickStats: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  forecastCard: {
    marginBottom: spacing[5],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  confidenceBadge: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '600',
    backgroundColor: `${colors.secondary}18`,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  forecastSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginBottom: spacing[3],
  },
  forecastBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 56,
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 56,
  },
  incomeBar: {
    width: '80%',
    borderRadius: 3,
    minHeight: 4,
  },
  forecastLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forecastLegendText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
});
