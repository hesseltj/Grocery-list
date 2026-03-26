import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../theme';
import type { AuthStackParamList } from '../../types';

const { height } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

const FEATURES = [
  { icon: '📊', text: 'AI-powered cash flow forecasts' },
  { icon: '🧾', text: 'Quarterly tax estimation' },
  { icon: '💼', text: 'Invoice tracking & reminders' },
  { icon: '🏦', text: 'Automatic bank sync' },
];

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[colors.primaryDark, colors.primary, '#6B8FF8']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={[styles.content, { paddingTop: insets.top + spacing[8] }]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>💰</Text>
          <Text style={styles.logoText}>FlowLedger</Text>
          <Text style={styles.tagline}>The financial co-pilot for freelancers</Text>
        </View>

        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map((feature, i) => (
            <View key={i} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        {/* Social proof */}
        <Text style={styles.socialProof}>
          Join 10,000+ freelancers managing their finances with confidence
        </Text>
      </View>

      {/* CTA */}
      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing[6] }]}>
        <Button
          label="Get Started Free — 14 Days"
          onPress={() => navigation.navigate('Onboarding', { step: 1 })}
          variant="secondary"
          size="lg"
          fullWidth
          style={styles.primaryCta}
        />
        <Button
          label="I already have an account"
          onPress={() => navigation.navigate('SignIn')}
          variant="ghost"
          size="md"
          fullWidth
          labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing[10],
  },
  logoIcon: {
    fontSize: 52,
    marginBottom: spacing[2],
  },
  logoText: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing[1.5],
    textAlign: 'center',
  },
  features: {
    gap: spacing[3],
    marginBottom: spacing[8],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  featureIcon: {
    fontSize: 22,
    marginRight: spacing[3],
  },
  featureText: {
    fontSize: typography.fontSize.base,
    color: colors.white,
    fontWeight: '500',
  },
  socialProof: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  cta: {
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
  primaryCta: {
    marginBottom: spacing[1],
  },
});
