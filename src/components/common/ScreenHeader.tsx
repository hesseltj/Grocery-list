import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
  dark?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  dark = false,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  const textColor = dark ? colors.white : colors.textPrimary;
  const subtitleColor = dark ? 'rgba(255,255,255,0.75)' : colors.textSecondary;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing[2] }]}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={12}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={dark ? colors.white : colors.textPrimary}
          />
        </TouchableOpacity>
      )}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>}
      </View>
      {rightAction ? (
        <TouchableOpacity onPress={rightAction.onPress} style={styles.rightButton} hitSlop={12}>
          <MaterialCommunityIcons
            name={rightAction.icon as any}
            size={24}
            color={dark ? colors.white : colors.primary}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.rightPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
  },
  backButton: {
    marginRight: spacing[3],
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  rightButton: {
    marginLeft: spacing[3],
  },
  rightPlaceholder: {
    width: 24,
  },
});
