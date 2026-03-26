import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { CATEGORY_META } from '../../utils/categories';
import { formatCurrency, formatTransactionAmount } from '../../utils/currency';
import { formatRelativeDate } from '../../utils/dates';
import type { Transaction } from '../../types';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
}

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const meta = CATEGORY_META[transaction.category];
  const amountColor = transaction.amount >= 0 ? colors.success : colors.textPrimary;
  const formattedAmount = formatTransactionAmount(transaction.amount);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(transaction)}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${meta.color}18` }]}>
        <MaterialCommunityIcons name={meta.icon as any} size={20} color={meta.color} />
      </View>
      <View style={styles.details}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.merchantName ?? transaction.description}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.category}>{meta.label}</Text>
          {transaction.isBusinessExpense && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Business</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>{formattedAmount}</Text>
        <Text style={styles.date}>{formatRelativeDate(transaction.date)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  details: {
    flex: 1,
    marginRight: spacing[2],
  },
  description: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  badge: {
    marginLeft: spacing[1.5],
    paddingHorizontal: spacing[1.5],
    paddingVertical: 1,
    backgroundColor: `${colors.primary}18`,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginBottom: 3,
  },
  date: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
});
