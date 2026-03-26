import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '../../components/common/Button';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/currency';
import { getNetTermsDate, formatDate } from '../../utils/dates';
import { colors, typography, spacing, borderRadius } from '../../theme';
import type { Invoice, InvoiceLineItem } from '../../types';

let lineItemCounter = 0;

const makeLineItem = (): InvoiceLineItem => ({
  id: `li_${++lineItemCounter}`,
  description: '',
  quantity: 1,
  rate: 0,
  amount: 0,
});

export function CreateInvoiceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const addInvoice = useStore((s) => s.addInvoice);
  const user = useStore((s) => s.user);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [netTerms, setNetTerms] = useState('30');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([makeLineItem()]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const total = subtotal;

  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: string) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item };
        if (field === 'description') updated.description = value;
        if (field === 'quantity') {
          updated.quantity = parseFloat(value) || 0;
        }
        if (field === 'rate') {
          updated.rate = parseFloat(value) || 0;
        }
        updated.amount = updated.quantity * updated.rate;
        return updated;
      })
    );
  };

  const addLineItem = () => setLineItems((prev) => [...prev, makeLineItem()]);
  const removeLineItem = (id: string) =>
    setLineItems((prev) => prev.filter((item) => item.id !== id));

  const handleSave = () => {
    if (!clientName.trim()) {
      Alert.alert('Missing Information', 'Please enter a client name.');
      return;
    }
    if (lineItems.every((item) => item.amount === 0)) {
      Alert.alert('Missing Information', 'Please add at least one line item with an amount.');
      return;
    }

    setSaving(true);
    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = formatDate(
      getNetTermsDate(issueDate, parseInt(netTerms, 10) || 30),
      'yyyy-MM-dd'
    );
    const invNumber = `INV-${Date.now().toString().slice(-6)}`;

    const invoice: Invoice = {
      id: `inv_${Date.now()}`,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim() || undefined,
      invoiceNumber: invNumber,
      issueDate,
      dueDate,
      lineItems,
      subtotal,
      total,
      status: 'draft',
      notes: notes.trim() || undefined,
      currency: 'USD',
    };

    addInvoice(invoice);
    setSaving(false);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Invoice</Text>
        <Text style={styles.total}>{formatCurrency(total)}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[8] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Client */}
        <Text style={styles.sectionTitle}>Client</Text>
        <TextInput
          style={styles.input}
          placeholder="Client name *"
          placeholderTextColor={colors.textTertiary}
          value={clientName}
          onChangeText={setClientName}
        />
        <TextInput
          style={[styles.input, { marginTop: spacing[2] }]}
          placeholder="Client email (optional)"
          placeholderTextColor={colors.textTertiary}
          value={clientEmail}
          onChangeText={setClientEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Terms */}
        <View style={styles.termsRow}>
          <Text style={styles.sectionTitle}>Payment Terms</Text>
          <View style={styles.termsOptions}>
            {['15', '30', '60', '90'].map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.termChip, netTerms === d && styles.termChipActive]}
                onPress={() => setNetTerms(d)}
              >
                <Text style={[styles.termText, netTerms === d && styles.termTextActive]}>
                  Net {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Line Items */}
        <Text style={styles.sectionTitle}>Line Items</Text>
        {lineItems.map((item, idx) => (
          <View key={item.id} style={styles.lineItem}>
            <View style={styles.lineItemHeader}>
              <Text style={styles.lineItemNum}>Item {idx + 1}</Text>
              {lineItems.length > 1 && (
                <TouchableOpacity onPress={() => removeLineItem(item.id)} hitSlop={8}>
                  <MaterialCommunityIcons name="minus-circle" size={18} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Description"
              placeholderTextColor={colors.textTertiary}
              value={item.description}
              onChangeText={(v) => updateLineItem(item.id, 'description', v)}
            />
            <View style={styles.lineItemRow}>
              <TextInput
                style={[styles.input, styles.inputSmall]}
                placeholder="Qty"
                placeholderTextColor={colors.textTertiary}
                value={item.quantity.toString()}
                onChangeText={(v) => updateLineItem(item.id, 'quantity', v)}
                keyboardType="numeric"
              />
              <Text style={styles.times}>×</Text>
              <TextInput
                style={[styles.input, styles.inputSmall]}
                placeholder="Rate ($)"
                placeholderTextColor={colors.textTertiary}
                value={item.rate === 0 ? '' : item.rate.toString()}
                onChangeText={(v) => updateLineItem(item.id, 'rate', v)}
                keyboardType="decimal-pad"
              />
              <Text style={styles.lineItemAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addItemButton} onPress={addLineItem}>
          <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
          <Text style={styles.addItemText}>Add line item</Text>
        </TouchableOpacity>

        {/* Total */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>

        {/* Notes */}
        <Text style={[styles.sectionTitle, { marginTop: spacing[4] }]}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Payment instructions, thank you note, etc."
          placeholderTextColor={colors.textTertiary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <Button
          label="Create Invoice"
          onPress={handleSave}
          variant="primary"
          size="lg"
          fullWidth
          loading={saving}
          style={styles.saveButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  total: {
    fontSize: typography.fontSize.base,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    marginTop: spacing[4],
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  inputSmall: { flex: 1 },
  notesInput: { height: 80, textAlignVertical: 'top' },
  termsRow: {},
  termsOptions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  termChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  termChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  termText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  termTextActive: { color: colors.primary, fontWeight: '700' },
  lineItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  lineItemNum: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  times: {
    fontSize: typography.fontSize.base,
    color: colors.textTertiary,
  },
  lineItemAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 80,
    textAlign: 'right',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  addItemText: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: '600',
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: `${colors.primary}08`,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  totalLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    color: colors.primary,
  },
  saveButton: { marginTop: spacing[6] },
});
