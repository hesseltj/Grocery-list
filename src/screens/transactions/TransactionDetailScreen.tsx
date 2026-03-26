import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Card } from '../../components/common/Card';
import { useStore } from '../../store/useStore';
import { CATEGORY_META } from '../../utils/categories';
import { formatCurrency, formatTransactionAmount } from '../../utils/currency';
import { formatDate } from '../../utils/dates';
import { colors, typography, spacing, borderRadius } from '../../theme';
import type { TransactionsStackParamList } from '../../types';

type RouteProps = RouteProp<TransactionsStackParamList, 'TransactionDetail'>;

export function TransactionDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { transactionId } = route.params;

  const transaction = useStore((s) =>
    s.transactions.find((tx) => tx.id === transactionId)
  );
  const updateTransaction = useStore((s) => s.updateTransaction);

  if (!transaction) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Transaction not found.</Text>
      </View>
    );
  }

  const meta = CATEGORY_META[transaction.category];
  const isIncome = transaction.amount > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[8] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Hero */}
        <Card style={styles.amountCard}>
          <View style={[styles.categoryIcon, { backgroundColor: `${meta.color}20` }]}>
            <MaterialCommunityIcons name={meta.icon as any} size={28} color={meta.color} />
          </View>
          <Text style={styles.merchantName}>
            {transaction.merchantName ?? transaction.description}
          </Text>
          <Text style={[
            styles.amount,
            { color: isIncome ? colors.success : colors.textPrimary }
          ]}>
            {formatTransactionAmount(transaction.amount)}
          </Text>
          <Text style={styles.date}>{formatDate(transaction.date, 'EEEE, MMMM d, yyyy')}</Text>
        </Card>

        {/* Details */}
        <Card style={styles.detailsCard}>
          <DetailRow label="Category" value={meta.label} />
          <DetailRow label="Account" value={`Account ****${transaction.accountId.slice(-4)}`} />
          <DetailRow label="Description" value={transaction.description} />
          {transaction.notes && <DetailRow label="Notes" value={transaction.notes} />}
        </Card>

        {/* Tax / Business Settings */}
        <Card>
          <Text style={styles.sectionTitle}>Tax & Business</Text>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Business Expense</Text>
              <Text style={styles.toggleSubtitle}>Mark as deductible business expense</Text>
            </View>
            <Switch
              value={transaction.isBusinessExpense}
              onValueChange={(val) =>
                updateTransaction(transaction.id, {
                  isBusinessExpense: val,
                  isTaxDeductible: val,
                })
              }
              trackColor={{ false: colors.border, true: `${colors.primary}60` }}
              thumbColor={transaction.isBusinessExpense ? colors.primary : colors.white}
            />
          </View>

          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View>
              <Text style={styles.toggleLabel}>Tax Deductible</Text>
              <Text style={styles.toggleSubtitle}>Include in Schedule C deductions</Text>
            </View>
            <Switch
              value={transaction.isTaxDeductible}
              onValueChange={(val) =>
                updateTransaction(transaction.id, { isTaxDeductible: val })
              }
              trackColor={{ false: colors.border, true: `${colors.primary}60` }}
              thumbColor={transaction.isTaxDeductible ? colors.primary : colors.white}
            />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    paddingTop: spacing[2],
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing[8],
  },
  amountCard: {
    alignItems: 'center',
    marginBottom: spacing[4],
    paddingVertical: spacing[6],
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  merchantName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  amount: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: spacing[1.5],
  },
  date: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  detailsCard: {
    marginBottom: spacing[4],
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing[3],
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing[3],
    marginBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  toggleLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
});
