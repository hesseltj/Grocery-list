import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useStore } from '../../store/useStore';
import { SUBSCRIPTION_PLANS } from '../../services/stripe';
import { colors, typography, spacing, borderRadius } from '../../theme';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const user = useStore((s) => s.user);
  const signOut = useStore((s) => s.signOut);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const isPro = user?.subscription === 'pro' || user?.subscription === 'trial';
  const annualPlan = SUBSCRIPTION_PLANS.find((p) => p.id === 'pro_annual')!;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[4], paddingBottom: insets.bottom + spacing[8] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <View style={[styles.planBadge, { backgroundColor: isPro ? `${colors.primary}18` : colors.borderLight }]}>
            <Text style={[styles.planBadgeText, { color: isPro ? colors.primary : colors.textTertiary }]}>
              {isPro ? 'Pro' : 'Free'}
            </Text>
          </View>
        </Card>

        {/* Subscription */}
        {!isPro && (
          <Card style={styles.upgradeCard}>
            <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
            <Text style={styles.upgradeDescription}>
              Unlock AI forecasting, tax estimation, and unlimited invoice tracking.
            </Text>
            {annualPlan.features.slice(0, 3).map((feat, i) => (
              <View key={i} style={styles.upgradeFeature}>
                <MaterialCommunityIcons name="check-circle" size={16} color={colors.secondary} />
                <Text style={styles.upgradeFeatureText}>{feat}</Text>
              </View>
            ))}
            <Button
              label={`Get Pro — $${annualPlan.price}/year`}
              onPress={() => Alert.alert('Upgrade', 'Opens to Stripe Checkout in production.')}
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: spacing[3] }}
            />
            <Text style={styles.trialNote}>{annualPlan.savingsVsMonthly}</Text>
          </Card>
        )}

        {/* Account Settings */}
        <Text style={styles.sectionTitle}>Account</Text>
        <Card padded={false} style={{ overflow: 'hidden', marginBottom: spacing[4] }}>
          <SettingRow
            icon="account-outline"
            label="Profile"
            onPress={() => Alert.alert('Profile', 'Profile editing — coming soon.')}
          />
          <SettingRow
            icon="map-marker-outline"
            label="State"
            value={user?.stateCode ?? 'N/A'}
            onPress={() => {}}
          />
          <SettingRow
            icon="scale-balance"
            label="Filing Status"
            value={getFilingLabel(user?.filingStatus)}
            onPress={() => {}}
          />
          <SettingRow
            icon="lock-outline"
            label="Change Password"
            onPress={() => Alert.alert('Password', 'Change password — coming soon.')}
            last
          />
        </Card>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card padded={false} style={{ overflow: 'hidden', marginBottom: spacing[4] }}>
          <ToggleRow label="Tax Due Reminders" sublabel="2 weeks and 3 days before due" defaultValue />
          <ToggleRow label="Weekly Cash Flow Summary" sublabel="Every Sunday evening" defaultValue />
          <ToggleRow label="Invoice Overdue Alerts" sublabel="When invoices become overdue" defaultValue last />
        </Card>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <Card padded={false} style={{ overflow: 'hidden', marginBottom: spacing[4] }}>
          <SettingRow icon="information-outline" label="Version" value="1.0.0" onPress={() => {}} />
          <SettingRow icon="file-document-outline" label="Privacy Policy" onPress={() => {}} />
          <SettingRow icon="handshake-outline" label="Terms of Service" onPress={() => {}} last />
        </Card>

        {/* Sign Out */}
        <Button
          label="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          size="md"
          fullWidth
          style={{ borderColor: colors.danger }}
          labelStyle={{ color: colors.danger }}
        />
      </ScrollView>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[rowStyles.container, !last && rowStyles.border]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name={icon as any} size={20} color={colors.textSecondary} />
      <Text style={rowStyles.label}>{label}</Text>
      <View style={rowStyles.right}>
        {value && <Text style={rowStyles.value}>{value}</Text>}
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

function ToggleRow({
  label,
  sublabel,
  defaultValue,
  last,
}: {
  label: string;
  sublabel: string;
  defaultValue: boolean;
  last?: boolean;
}) {
  const [enabled, setEnabled] = React.useState(defaultValue);
  return (
    <View style={[rowStyles.container, !last && rowStyles.border]}>
      <View style={rowStyles.toggleInfo}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.sublabel}>{sublabel}</Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={setEnabled}
        trackColor={{ false: colors.border, true: `${colors.primary}60` }}
        thumbColor={enabled ? colors.primary : colors.white}
      />
    </View>
  );
}

function getFilingLabel(status?: string): string {
  const labels: Record<string, string> = {
    single: 'Single',
    married_jointly: 'Married Joint',
    married_separately: 'Married Sep.',
    head_of_household: 'Head of HH',
  };
  return labels[status ?? ''] ?? '—';
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  label: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  value: { fontSize: typography.fontSize.sm, color: colors.textTertiary },
  toggleInfo: { flex: 1 },
  sublabel: { fontSize: typography.fontSize.xs, color: colors.textTertiary, marginTop: 1 },
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[5],
    gap: spacing[3],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    color: colors.white,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planBadge: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  planBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },
  upgradeCard: {
    marginBottom: spacing[5],
    borderWidth: 1.5,
    borderColor: `${colors.primary}30`,
    backgroundColor: `${colors.primary}05`,
  },
  upgradeTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing[1],
  },
  upgradeDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing[3],
    lineHeight: 20,
  },
  upgradeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1.5],
  },
  upgradeFeatureText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  trialNote: {
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing[2],
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
});
