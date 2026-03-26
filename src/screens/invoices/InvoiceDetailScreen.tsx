import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/currency';
import { formatDate, getDaysUntilDue, isOverdue } from '../../utils/dates';
import { colors, typography, spacing, borderRadius } from '../../theme';
import type { InvoicesStackParamList, InvoiceStatus } from '../../types';

type RouteProps = RouteProp<InvoicesStackParamList, 'InvoiceDetail'>;

const STATUS_ACTIONS: Partial<Record<InvoiceStatus, InvoiceStatus>> = {
  draft: 'sent',
  sent: 'paid',
  viewed: 'paid',
};

export function InvoiceDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { invoiceId } = route.params;

  const invoice = useStore((s) => s.invoices.find((inv) => inv.id === invoiceId));
  const updateInvoice = useStore((s) => s.updateInvoice);
  const deleteInvoice = useStore((s) => s.deleteInvoice);

  if (!invoice) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text>Invoice not found</Text>
      </View>
    );
  }

  const overdue = isOverdue(invoice.dueDate) && invoice.status !== 'paid';
  const daysUntil = getDaysUntilDue(invoice.dueDate);

  const nextStatus = STATUS_ACTIONS[invoice.status];

  const handleStatusUpdate = () => {
    if (!nextStatus) return;
    const updates: Partial<typeof invoice> = { status: nextStatus };
    if (nextStatus === 'paid') {
      updates.paidDate = new Date().toISOString().split('T')[0];
    }
    updateInvoice(invoice.id, updates);
    Alert.alert('Updated', `Invoice marked as ${nextStatus}.`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteInvoice(invoice.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice #{invoice.invoiceNumber}</Text>
        <TouchableOpacity onPress={handleDelete} hitSlop={12}>
          <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[8] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Invoice Hero */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.clientName}>{invoice.clientName}</Text>
            <View style={[styles.statusPill, { backgroundColor: `${getStatusColor(invoice.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                {overdue ? 'Overdue' : capitalize(invoice.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.totalAmount}>{formatCurrency(invoice.total)}</Text>
          <Text style={[styles.dueText, overdue && { color: colors.danger }]}>
            {invoice.status === 'paid'
              ? `Paid on ${formatDate(invoice.paidDate!, 'MMM d, yyyy')}`
              : overdue
              ? `Overdue by ${Math.abs(daysUntil)} days`
              : `Due ${formatDate(invoice.dueDate, 'MMM d, yyyy')}`}
          </Text>
        </Card>

        {/* Line Items */}
        <Card style={styles.lineItemsCard}>
          <Text style={styles.cardTitle}>Line Items</Text>
          {invoice.lineItems.map((item) => (
            <View key={item.id} style={styles.lineItem}>
              <View style={styles.lineItemLeft}>
                <Text style={styles.lineItemDesc}>{item.description}</Text>
                <Text style={styles.lineItemQty}>
                  {item.quantity} × {formatCurrency(item.rate)}
                </Text>
              </View>
              <Text style={styles.lineItemAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          {invoice.taxAmount != null && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({invoice.taxRate}%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.taxAmount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
          </View>
        </Card>

        {/* Dates */}
        <Card>
          <Text style={styles.cardTitle}>Details</Text>
          <DetailRow label="Issue Date" value={formatDate(invoice.issueDate, 'MMM d, yyyy')} />
          <DetailRow label="Due Date" value={formatDate(invoice.dueDate, 'MMM d, yyyy')} />
          {invoice.clientEmail && <DetailRow label="Client Email" value={invoice.clientEmail} />}
          {invoice.notes && <DetailRow label="Notes" value={invoice.notes} />}
        </Card>

        {/* Actions */}
        {nextStatus && (
          <Button
            label={nextStatus === 'sent' ? 'Mark as Sent' : 'Mark as Paid ✓'}
            onPress={handleStatusUpdate}
            variant={nextStatus === 'paid' ? 'secondary' : 'primary'}
            size="lg"
            fullWidth
            style={styles.actionButton}
          />
        )}
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

function getStatusColor(status: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    draft: colors.textSecondary,
    sent: colors.info,
    viewed: colors.primary,
    paid: colors.success,
    overdue: colors.danger,
    cancelled: colors.textTertiary,
  };
  return map[status];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  heroCard: { alignItems: 'center', marginBottom: spacing[4], paddingVertical: spacing[6] },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  clientName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  statusText: { fontSize: typography.fontSize.xs, fontWeight: '700' },
  totalAmount: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
    marginBottom: spacing[1],
  },
  dueText: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  lineItemsCard: { marginBottom: spacing[4] },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing[3],
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  lineItemLeft: { flex: 1 },
  lineItemDesc: { fontSize: typography.fontSize.sm, color: colors.textPrimary, fontWeight: '500' },
  lineItemQty: { fontSize: typography.fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  lineItemAmount: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[2],
  },
  totalLabel: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
  totalValue: { fontSize: typography.fontSize.sm, color: colors.textPrimary },
  grandTotal: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  grandTotalLabel: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.textPrimary },
  grandTotalValue: { fontSize: typography.fontSize.base, fontWeight: '800', color: colors.textPrimary },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
  detailValue: { fontSize: typography.fontSize.sm, color: colors.textPrimary, maxWidth: '60%', textAlign: 'right' },
  actionButton: { marginTop: spacing[5] },
});
