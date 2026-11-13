
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { initializeDatabase } from '@/db/database';
import {
  AppearanceProvider,
  useAppearance,
} from '@/context/appearance-context';

SplashScreen.preventAutoHideAsync();

function AppNavigation() {
  const { isDark, colors } = useAppearance();

  // Keep the native root background synchronized with
  // RupeeTrack's selected appearance.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(
      (error) => {
        console.warn('Could not update native background:', error);
      }
    );
  }, [colors.background]);

  const baseTheme = isDark ? DarkTheme : DefaultTheme;

  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      card: colors.background,
      border: colors.border,
      text: colors.text,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <AnimatedSplashOverlay />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
          animation: 'none',
        }}
      >
        <Stack.Screen name="(tabs)" />

        <Stack.Screen
          name="income"
          options={{ presentation: 'card' }}
        />

        <Stack.Screen
          name="expense"
          options={{ presentation: 'card' }}
        />

        <Stack.Screen
          name="bills"
          options={{ presentation: 'card' }}
        />

        <Stack.Screen
          name="income-history"
          options={{ presentation: 'card' }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName="rupeetrack.db"
      onInit={initializeDatabase}
    >
      <AppearanceProvider>
        <AppNavigation />
      </AppearanceProvider>
    </SQLiteProvider>
  );
}
