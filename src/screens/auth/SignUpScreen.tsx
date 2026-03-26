import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '../../components/common/Button';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useStore } from '../../store/useStore';
import type { AuthStackParamList, User } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;
};

export function SignUpScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const signIn = useStore((state) => state.signIn);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = name.trim().length > 1 && email.includes('@') && password.length >= 8;

  const handleSignUp = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      // In production: call your auth API
      // For demo: simulate successful signup
      await new Promise((r) => setTimeout(r, 800));

      const mockUser: User = {
        id: `user_${Date.now()}`,
        email,
        name,
        freelancerType: 'other',
        stateCode: 'CA',
        filingStatus: 'single',
        subscription: 'trial',
        createdAt: new Date().toISOString(),
        onboardingCompleted: false,
      };

      signIn(email, 'mock_token_' + Date.now(), mockUser);
      navigation.navigate('Onboarding', { step: 1 });
    } catch (err) {
      Alert.alert('Sign Up Failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing[8], paddingBottom: insets.bottom + spacing[8] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Start your 14-day free trial — no credit card required.</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Jane Smith"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="jane@example.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>
        </View>

        <Button
          label="Create Account"
          onPress={handleSignUp}
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          disabled={!isValid}
          style={styles.submitButton}
        />

        <Text style={styles.legal}>
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </Text>

        <Button
          label="Already have an account? Sign in"
          onPress={() => navigation.navigate('SignIn')}
          variant="ghost"
          size="md"
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing[6] },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  form: { gap: spacing[4], marginBottom: spacing[5] },
  field: {},
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing[1.5],
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  submitButton: { marginBottom: spacing[4] },
  legal: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing[4],
    lineHeight: 18,
  },
});
