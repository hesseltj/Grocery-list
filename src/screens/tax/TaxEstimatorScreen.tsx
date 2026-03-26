import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Card } from '../../components/common/Card';
import { useStore, selectYtdIncome, selectYtdExpenses } from '../../store/useStore';
import { formatCurrency, formatPercent } from '../../utils/currency';
import { formatDate, getTaxQuarters, getDaysUntilDue } from '../../utils/dates';
import { colors, typography, spacing, borderRadius } from '../../theme';

export function TaxEstimatorScreen() {
  const insets = useSafeAreaInsets();
  const estimate = useStore((s) => s.currentTaxEstimate);
  const ytdIncome = useStore(selectYtdIncome);
  const ytdExpenses = useStore(selectYtdExpenses);
  const user = useStore((s) => s.user);

  const year = new Date().getFullYear();
  const quarters = getTaxQuarters(year);

  const daysUntilDue = estimate ? getDaysUntilDue(estimate.dueDate) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Tax Estimator</Text>
        <Text style={styles.subtitle}>
          {year} estimates • {user?.stateCode ?? 'N/A'} • {getFilingStatusLabel(user?.filingStatus)}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[8] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <MaterialCommunityIcons name="information-outline" size={14} color={colors.info} />
          <Text style={styles.disclaimerText}>
            Estimates only. Consult a CPA for authoritative tax advice.
          </Text>
        </View>

        {estimate ? (
          <>
            {/* Next Due */}
            {daysUntilDue !== null && daysUntilDue > 0 && (
              <Card style={[styles.dueCard, { borderColor: daysUntilDue < 14 ? colors.warning : colors.border }]}>
                <View style={styles.dueHeader}>
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={20}
                    color={daysUntilDue < 14 ? colors.warning : colors.primary}
                  />
                  <Text style={styles.dueTitle}>
                    {estimate.quarter} Payment Due in {daysUntilDue} days
                  </Text>
                </View>
                <Text style={styles.dueAmount}>
                  {formatCurrency(estimate.quarterlyPaymentDue)}
                </Text>
                <Text style={styles.dueDate}>
                  Due by {formatDate(estimate.dueDate, 'MMMM d, yyyy')}
                </Text>
              </Card>
            )}

            {/* YTD Summary */}
            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>{year} Year-to-Date</Text>
              <View style={styles.summaryGrid}>
                <SummaryItem label="Gross Income" value={formatCurrency(estimate.grossIncome)} />
                <SummaryItem label="Business Expenses" value={`-${formatCurrency(estimate.businessExpenses)}`} negative />
                <SummaryItem label="Net SE Income" value={formatCurrency(estimate.netSelfEmploymentIncome)} highlight />
                <View style={styles.divider} />
                <SummaryItem label="SE Tax (15.3%)" value={formatCurrency(estimate.selfEmploymentTax)} />
                <SummaryItem label="Federal Income Tax" value={formatCurrency(estimate.federalIncomeTax)} />
                <SummaryItem label="State Income Tax" value={formatCurrency(estimate.stateIncomeTax)} />
                <View style={styles.divider} />
                <SummaryItem
                  label="Total Estimated Tax"
                  value={formatCurrency(estimate.totalEstimatedTax)}
                  large
                />
                <SummaryItem
                  label="Effective Rate"
                  value={formatPercent(estimate.effectiveRate)}
                />
              </View>
            </Card>

            {/* Quarterly Schedule */}
            <Card>
              <Text style={styles.cardTitle}>Quarterly Payment Schedule</Text>
              {quarters.map((q) => {
                const isPast = new Date(q.dueDate) < new Date();
                const isCurrent = q.quarter === estimate.quarter;
                return (
                  <View
                    key={q.quarter}
                    style={[
                      styles.quarterRow,
                      isCurrent && styles.quarterRowActive,
                    ]}
                  >
                    <View style={styles.quarterLeft}>
                      <Text style={[styles.quarterLabel, isCurrent && { color: colors.primary }]}>
                        {q.label}
                      </Text>
                      <Text style={styles.quarterDue}>
                        Due {formatDate(q.dueDate, 'MMM d, yyyy')}
                      </Text>
                    </View>
                    <Text style={[
                      styles.quarterAmount,
                      isPast && { color: colors.textTertiary },
                    ]}>
                      {formatCurrency(estimate.quarterlyPaymentDue)}
                    </Text>
                    {isPast && (
                      <View style={styles.paidBadge}>
                        <Text style={styles.paidBadgeText}>Past</Text>
                      </View>
                    )}
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </Card>

            {/* Tax-saving tips */}
            <Card style={styles.tipsCard}>
              <Text style={styles.cardTitle}>💡 Tax-Saving Tips</Text>
              <TipItem text={`Set aside ${formatPercent(estimate.effectiveRate + 0.05)} of each payment for taxes`} />
              <TipItem text="Track all software subscriptions — fully deductible" />
              <TipItem text="Document home office expenses for the home office deduction" />
              <TipItem text="Consider a SEP-IRA to reduce taxable income" />
            </Card>
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="calculator-variant-outline"
              size={48}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>No estimate yet</Text>
            <Text style={styles.emptyText}>
              Connect your bank account or add transactions to generate your quarterly tax estimate.
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryItem({
  label,
  value,
  negative,
  highlight,
  large,
}: {
  label: string;
  value: string;
  negative?: boolean;
  highlight?: boolean;
  large?: boolean;
}) {
  return (
    <View style={summaryStyles.row}>
      <Text style={[summaryStyles.label, highlight && summaryStyles.highlight]}>
        {label}
      </Text>
      <Text
        style={[
          summaryStyles.value,
          negative && summaryStyles.negative,
          highlight && summaryStyles.highlight,
          large && summaryStyles.large,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function TipItem({ text }: { text: string }) {
  return (
    <View style={tipStyles.item}>
      <Text style={tipStyles.bullet}>•</Text>
      <Text style={tipStyles.text}>{text}</Text>
    </View>
  );
}

function getFilingStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    single: 'Single',
    married_jointly: 'Married (Joint)',
    married_separately: 'Married (Separate)',
    head_of_household: 'Head of Household',
  };
  return labels[status ?? ''] ?? 'Single';
}

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1.5],
  },
  label: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
  value: { fontSize: typography.fontSize.sm, color: colors.textPrimary, fontWeight: '500' },
  negative: { color: colors.danger },
  highlight: { color: colors.textPrimary, fontWeight: '700' },
  large: { fontSize: typography.fontSize.base, fontWeight: '800', color: colors.textPrimary },
});

const tipStyles = StyleSheet.create({
  item: { flexDirection: 'row', marginTop: spacing[2], gap: spacing[2] },
  bullet: { color: colors.primary, fontWeight: '700', fontSize: typography.fontSize.base },
  text: { flex: 1, fontSize: typography.fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    paddingTop: spacing[2],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    marginTop: 4,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.md,
    padding: spacing[2.5],
    marginBottom: spacing[4],
  },
  disclaimerText: {
    fontSize: typography.fontSize.xs,
    color: colors.info,
    flex: 1,
  },
  dueCard: {
    marginBottom: spacing[4],
    borderWidth: 1.5,
    alignItems: 'center',
  },
  dueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  dueTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dueAmount: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  dueDate: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    marginTop: spacing[1],
  },
  summaryCard: { marginBottom: spacing[4] },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing[3],
  },
  summaryGrid: { gap: 0 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing[2] },
  quarterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  quarterRowActive: {
    backgroundColor: `${colors.primary}06`,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    marginHorizontal: -spacing[2],
  },
  quarterLeft: { flex: 1 },
  quarterLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  quarterDue: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
  quarterAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing[2],
  },
  paidBadge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  paidBadgeText: { fontSize: 10, color: colors.textTertiary, fontWeight: '600' },
  currentBadge: {
    backgroundColor: `${colors.primary}18`,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  currentBadgeText: { fontSize: 10, color: colors.primary, fontWeight: '600' },
  tipsCard: { marginTop: spacing[4] },
  emptyCard: { alignItems: 'center', padding: spacing[10] },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
