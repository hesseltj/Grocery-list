import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import type { CashFlowAlert } from '../../types';

interface AlertBannerProps {
  alert: CashFlowAlert;
  onAction?: () => void;
  onDismiss?: () => void;
}

const SEVERITY_STYLES = {
  info: {
    background: colors.infoLight,
    border: colors.info,
    icon: 'information-outline',
    iconColor: colors.info,
  },
  warning: {
    background: colors.warningLight,
    border: colors.warning,
    icon: 'alert-outline',
    iconColor: colors.warning,
  },
  critical: {
    background: colors.dangerLight,
    border: colors.danger,
    icon: 'alert-circle-outline',
    iconColor: colors.danger,
  },
};

export function AlertBanner({ alert, onAction, onDismiss }: AlertBannerProps) {
  const style = SEVERITY_STYLES[alert.severity];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: style.background, borderLeftColor: style.border },
      ]}
    >
      <MaterialCommunityIcons
        name={style.icon as any}
        size={20}
        color={style.iconColor}
        style={styles.icon}
      />
      <View style={styles.content}>
        <Text style={styles.title}>{alert.title}</Text>
        <Text style={styles.message}>{alert.message}</Text>
        {alert.actionLabel && onAction && (
          <TouchableOpacity onPress={onAction} style={styles.action}>
            <Text style={[styles.actionText, { color: style.border }]}>
              {alert.actionLabel} →
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    marginBottom: spacing[3],
  },
  icon: {
    marginRight: spacing[2],
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  message: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  action: {
    marginTop: spacing[1.5],
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
});
