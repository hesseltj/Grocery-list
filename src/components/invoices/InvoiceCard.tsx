import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { formatCurrency } from '../../utils/currency';
import { formatDate, getDaysUntilDue } from '../../utils/dates';
import type { Invoice, InvoiceStatus } from '../../types';

interface InvoiceCardProps {
  invoice: Invoice;
  onPress?: (invoice: Invoice) => void;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: colors.textSecondary, bg: colors.borderLight },
  sent: { label: 'Sent', color: colors.info, bg: colors.infoLight },
  viewed: { label: 'Viewed', color: colors.primary, bg: `${colors.primary}18` },
  paid: { label: 'Paid', color: colors.success, bg: colors.successLight },
  overdue: { label: 'Overdue', color: colors.danger, bg: colors.dangerLight },
  cancelled: { label: 'Cancelled', color: colors.textTertiary, bg: colors.borderLight },
};

export function InvoiceCard({ invoice, onPress }: InvoiceCardProps) {
  const statusConfig = STATUS_CONFIG[invoice.status];
  const daysUntilDue = getDaysUntilDue(invoice.dueDate);
  const isOverdue = invoice.status !== 'paid' && daysUntilDue < 0;
  const effectiveStatus = isOverdue && invoice.status !== 'cancelled' ? 'overdue' : invoice.status;
  const displayConfig = STATUS_CONFIG[effectiveStatus];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(invoice)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.clientName}>{invoice.clientName}</Text>
          <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
        </View>
        <View>
          <Text style={styles.amount}>{formatCurrency(invoice.total)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: displayConfig.bg }]}>
            <Text style={[styles.statusText, { color: displayConfig.color }]}>
              {displayConfig.label}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.dateInfo}>
          <MaterialCommunityIcons name="calendar-outline" size={13} color={colors.textTertiary} />
          <Text style={styles.dateText}>
            Issued {formatDate(invoice.issueDate, 'MMM d')}
          </Text>
        </View>

        <View style={styles.dateInfo}>
          <MaterialCommunityIcons
            name="calendar-clock-outline"
            size={13}
            color={isOverdue ? colors.danger : colors.textTertiary}
          />
          <Text style={[styles.dateText, isOverdue && { color: colors.danger }]}>
            {invoice.status === 'paid'
              ? `Paid ${formatDate(invoice.paidDate!, 'MMM d')}`
              : isOverdue
              ? `${Math.abs(daysUntilDue)} days overdue`
              : `Due ${formatDate(invoice.dueDate, 'MMM d')}`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[3],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  clientName: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  invoiceNumber: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
  amount: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: spacing[1],
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.full,
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing[2],
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
});
