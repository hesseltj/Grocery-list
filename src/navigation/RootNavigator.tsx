import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useStore } from '../store/useStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import type { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const user = useStore((state) => state.user);
  const isInitialized = useStore((state) => state.isInitialized);

  if (!isInitialized) return null;

  const showApp = isAuthenticated && user?.onboardingCompleted;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {showApp ? (
        <Stack.Screen name="App" component={AppNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
