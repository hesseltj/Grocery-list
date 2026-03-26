import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { Button } from '../../components/common/Button';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useStore } from '../../store/useStore';
import type { AuthStackParamList, FreelancerType, FilingStatus } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;
  route: RouteProp<AuthStackParamList, 'Onboarding'>;
};

const FREELANCER_TYPES: Array<{ id: FreelancerType; label: string; icon: string }> = [
  { id: 'designer', label: 'Designer', icon: '🎨' },
  { id: 'developer', label: 'Developer', icon: '💻' },
  { id: 'writer', label: 'Writer / Editor', icon: '✍️' },
  { id: 'consultant', label: 'Consultant', icon: '📋' },
  { id: 'photographer', label: 'Photographer', icon: '📷' },
  { id: 'coach', label: 'Coach / Trainer', icon: '🏋️' },
  { id: 'other', label: 'Other', icon: '⚡' },
];

const FILING_STATUSES: Array<{ id: FilingStatus; label: string }> = [
  { id: 'single', label: 'Single' },
  { id: 'married_jointly', label: 'Married, filing jointly' },
  { id: 'married_separately', label: 'Married, filing separately' },
  { id: 'head_of_household', label: 'Head of household' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID',
  'IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS',
  'MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
  'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
  'WI','WY','DC',
];

export function OnboardingScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const updateUser = useStore((state) => state.updateUser);
  const completeOnboarding = useStore((state) => state.completeOnboarding);
  const user = useStore((state) => state.user);

  const currentStep = route.params?.step ?? 1;

  const [freelancerType, setFreelancerType] = useState<FreelancerType>('other');
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');
  const [stateCode, setStateCode] = useState('CA');

  const goToStep = (step: number) => {
    navigation.navigate('Onboarding', { step });
  };

  const handleStep1Complete = () => {
    updateUser({ freelancerType });
    goToStep(2);
  };

  const handleStep2Complete = () => {
    updateUser({ filingStatus, stateCode });
    goToStep(3);
  };

  const handleFinish = () => {
    completeOnboarding();
    // RootNavigator will re-render to AppNavigator automatically
  };

  const steps = [
    {
      title: "What kind of freelancer are you?",
      subtitle: "We'll personalize FlowLedger for your work.",
      content: (
        <View style={styles.optionGrid}>
          {FREELANCER_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.optionChip,
                freelancerType === type.id && styles.optionChipActive,
              ]}
              onPress={() => setFreelancerType(type.id)}
            >
              <Text style={styles.optionIcon}>{type.icon}</Text>
              <Text
                style={[
                  styles.optionLabel,
                  freelancerType === type.id && styles.optionLabelActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
      onNext: handleStep1Complete,
    },
    {
      title: "Your tax situation",
      subtitle: "Used to estimate your quarterly taxes accurately.",
      content: (
        <View>
          <Text style={styles.fieldLabel}>Filing status</Text>
          {FILING_STATUSES.map((status) => (
            <TouchableOpacity
              key={status.id}
              style={[
                styles.radioOption,
                filingStatus === status.id && styles.radioOptionActive,
              ]}
              onPress={() => setFilingStatus(status.id)}
            >
              <View
                style={[
                  styles.radioCircle,
                  filingStatus === status.id && styles.radioCircleActive,
                ]}
              >
                {filingStatus === status.id && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{status.label}</Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.fieldLabel, { marginTop: spacing[5] }]}>State</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.stateScroll}
          >
            {US_STATES.map((state) => (
              <TouchableOpacity
                key={state}
                style={[
                  styles.stateChip,
                  stateCode === state && styles.stateChipActive,
                ]}
                onPress={() => setStateCode(state)}
              >
                <Text
                  style={[
                    styles.stateText,
                    stateCode === state && styles.stateTextActive,
                  ]}
                >
                  {state}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ),
      onNext: handleStep2Complete,
    },
    {
      title: "You're all set! 🎉",
      subtitle:
        "Connect your bank account to start tracking automatically, or add transactions manually.",
      content: (
        <View style={styles.finalStep}>
          <View style={styles.checkItem}>
            <Text style={styles.checkIcon}>✅</Text>
            <Text style={styles.checkText}>Income & expense tracking</Text>
          </View>
          <View style={styles.checkItem}>
            <Text style={styles.checkIcon}>✅</Text>
            <Text style={styles.checkText}>Quarterly tax estimates</Text>
          </View>
          <View style={styles.checkItem}>
            <Text style={styles.checkIcon}>✅</Text>
            <Text style={styles.checkText}>AI cash flow forecasting</Text>
          </View>
          <View style={styles.checkItem}>
            <Text style={styles.checkIcon}>✅</Text>
            <Text style={styles.checkText}>Invoice tracking</Text>
          </View>
          <Text style={styles.trialNote}>
            Your 14-day free trial has started. No credit card required to explore.
          </Text>
        </View>
      ),
      onNext: handleFinish,
    },
  ];

  const step = steps[currentStep - 1];
  const isLastStep = currentStep === steps.length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing[4] }]}>
        {/* Progress dots */}
        <View style={styles.progressDots}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i + 1 === currentStep && styles.dotActive,
                i + 1 < currentStep && styles.dotCompleted,
              ]}
            />
          ))}
        </View>
        <Text style={styles.stepIndicator}>Step {currentStep} of {steps.length}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.subtitle}>{step.subtitle}</Text>
        {step.content}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[5] }]}>
        <Button
          label={isLastStep ? 'Start Using FlowLedger' : 'Continue'}
          onPress={step.onNext}
          variant="primary"
          size="lg"
          fullWidth
        />
        {currentStep > 1 && !isLastStep && (
          <Button
            label="Back"
            onPress={() => navigation.goBack()}
            variant="ghost"
            size="md"
            fullWidth
            style={{ marginTop: spacing[1] }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[4],
    alignItems: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  dotCompleted: {
    backgroundColor: colors.secondary,
  },
  stepIndicator: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[6],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing[2],
    lineHeight: typography.fontSize['2xl'] * 1.2,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing[6],
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  optionIcon: {
    fontSize: 18,
    marginRight: spacing[2],
  },
  optionLabel: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  optionLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  radioOptionActive: {},
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  stateScroll: {
    marginHorizontal: -spacing[6],
    paddingHorizontal: spacing[6],
  },
  stateChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing[2],
  },
  stateChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  stateText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  stateTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  finalStep: {
    gap: spacing[4],
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    gap: spacing[3],
  },
  checkIcon: {
    fontSize: 24,
  },
  checkText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  trialNote: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing[4],
    padding: spacing[4],
    backgroundColor: `${colors.secondary}15`,
    borderRadius: borderRadius.md,
  },
  footer: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
