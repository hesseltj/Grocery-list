import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { InvoiceCard } from '../../components/invoices/InvoiceCard';
import { EmptyState } from '../../components/common/EmptyState';
import { useStore, selectPendingInvoicesTotal, selectOverdueInvoicesTotal } from '../../store/useStore';
import { formatCurrency } from '../../utils/currency';
import { colors, typography, spacing, borderRadius } from '../../theme';
import type { InvoiceStatus, InvoicesStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<InvoicesStackParamList, 'InvoicesList'>;
type FilterTab = 'all' | 'pending' | 'paid' | 'overdue';

const TABS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
];

export function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const invoices = useStore((s) => s.invoices);
  const pendingTotal = useStore(selectPendingInvoicesTotal);
  const overdueTotal = useStore(selectOverdueInvoicesTotal);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filtered = useMemo(() => {
    const now = new Date();
    return invoices.filter((inv) => {
      if (activeTab === 'paid') return inv.status === 'paid';
      if (activeTab === 'pending')
        return inv.status === 'sent' || inv.status === 'viewed' || inv.status === 'draft';
      if (activeTab === 'overdue')
        return inv.status !== 'paid' && inv.status !== 'cancelled' && new Date(inv.dueDate) < now;
      return true;
    }).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }, [invoices, activeTab]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => navigation.navigate('CreateInvoice', {})}
        >
          <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
          <Text style={styles.newButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {formatCurrency(pendingTotal)}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Overdue</Text>
          <Text style={[styles.statValue, { color: colors.danger }]}>
            {formatCurrency(overdueTotal)}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Invoices</Text>
          <Text style={styles.statValue}>{invoices.length}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(inv) => inv.id}
        renderItem={({ item }) => (
          <InvoiceCard
            invoice={item}
            onPress={(inv) => navigation.navigate('InvoiceDetail', { invoiceId: inv.id })}
          />
        )}
        contentContainerStyle={{
          padding: spacing[4],
          paddingBottom: insets.bottom + spacing[8],
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <EmptyState
            icon="file-document-outline"
            title="No invoices yet"
            description="Create your first invoice to start tracking client payments."
            actionLabel="Create Invoice"
            onAction={() => navigation.navigate('CreateInvoice', {})}
          />
        }
        showsVerticalScrollIndicator={false}
      />
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
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    color: colors.textPrimary,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
    gap: spacing[1],
  },
  newButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3],
  },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: typography.fontSize.xs, color: colors.textTertiary, marginBottom: 2 },
  statValue: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.textPrimary },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing[1] },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[1],
    gap: spacing[1],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: `${colors.primary}14`,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
