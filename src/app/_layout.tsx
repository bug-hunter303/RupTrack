import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { initializeDatabase } from '@/db/database';
import {
  AppearanceProvider,
  useAppearance,
} from '@/context/appearance-context';

SplashScreen.preventAutoHideAsync();

function AppNavigation() {
  const { isDark } = useAppearance();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />

      <Stack
        screenOptions={{
          headerShown: false,
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
