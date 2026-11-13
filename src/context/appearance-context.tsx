
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSQLiteContext } from 'expo-sqlite';

export type ThemeMode = 'light' | 'dark';

export type CurrencyCode =
  | 'NPR'
  | 'USD'
  | 'INR'
  | 'EUR'
  | 'GBP'
  | 'AUD'
  | 'CAD'
  | 'JPY'
  | 'CNY'
  | 'AED';

export type AppearanceSettings = {
  themeMode: ThemeMode;
  accentColor: string;
  currencyCode: CurrencyCode;
  showBalance: boolean;
  showSavingsGoals: boolean;
  showCompletedGoals: boolean;
  showSpendingOverview: boolean;
  showRecentTransactions: boolean;
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeMode: 'light',
  accentColor: '#6256F5',
  currencyCode: 'NPR',
  showBalance: true,
  showSavingsGoals: true,
  showCompletedGoals: true,
  showSpendingOverview: true,
  showRecentTransactions: true,
};

export const ACCENT_COLORS = [
  { name: 'Purple', value: '#6256F5' },
  { name: 'Blue', value: '#1687FF' },
  { name: 'Green', value: '#16A36A' },
  { name: 'Orange', value: '#F28B35' },
  { name: 'Pink', value: '#E65B9A' },
  { name: 'Teal', value: '#0FA6A0' },
];

export const CURRENCIES: {
  code: CurrencyCode;
  name: string;
  symbol: string;
}[] = [
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs.' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
];

const ACCENT_PALETTES: Record<
  string,
  { primary: string; soft: string }
> = {
  '#6256F5': { primary: '#6256F5', soft: '#EEECFF' },
  '#1687FF': { primary: '#1687FF', soft: '#E5F2FF' },
  '#16A36A': { primary: '#16A36A', soft: '#E2F7ED' },
  '#F28B35': { primary: '#F28B35', soft: '#FFF0E2' },
  '#E65B9A': { primary: '#E65B9A', soft: '#FCE8F2' },
  '#0FA6A0': { primary: '#0FA6A0', soft: '#E1F7F5' },
};

const LIGHT_COLORS = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  text: '#171B28',
  muted: '#858995',
  border: '#E8EAF0',
  tabBar: '#FFFFFF',
  input: '#F8F9FB',
};

const DARK_COLORS = {
  background: '#10131B',
  surface: '#1A1F2B',
  text: '#F5F6FA',
  muted: '#A0A6B5',
  border: '#303746',
  tabBar: '#171C27',
  input: '#242B38',
};

type AppearanceContextValue = {
  settings: AppearanceSettings;
  colors: typeof LIGHT_COLORS;
  accent: { primary: string; soft: string };
  isDark: boolean;
  loading: boolean;
  updateSettings: (
    changes: Partial<AppearanceSettings>
  ) => Promise<void>;
  formatMoney: (amount: number) => string;
};

const AppearanceContext =
  createContext<AppearanceContextValue | undefined>(undefined);

export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = useSQLiteContext();

  const [settings, setSettings] =
    useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAppearance() {
      try {
        const row = await db.getFirstAsync<{
          theme_mode: string;
          accent_color: string;
          currency_code: string;
          show_balance: number;
          show_savings_goals: number;
          show_completed_goals: number;
          show_spending_overview: number;
          show_recent_transactions: number;
        }>('SELECT * FROM app_settings WHERE id = 1');

        if (row && active) {
          // Old installations may still have "system" saved.
          // Convert that old value to Light.
          const savedTheme: ThemeMode =
            row.theme_mode === 'dark' ? 'dark' : 'light';

          const loadedSettings: AppearanceSettings = {
            themeMode: savedTheme,
            accentColor: row.accent_color,
            currencyCode: row.currency_code as CurrencyCode,
            showBalance: row.show_balance === 1,
            showSavingsGoals: row.show_savings_goals === 1,
            showCompletedGoals: row.show_completed_goals === 1,
            showSpendingOverview: row.show_spending_overview === 1,
            showRecentTransactions:
              row.show_recent_transactions === 1,
          };

          setSettings(loadedSettings);

          // Persist the converted theme so "system" is removed
          // from existing saved preferences as well.
          if (row.theme_mode !== savedTheme) {
            await db.runAsync(
              'UPDATE app_settings SET theme_mode = ? WHERE id = 1',
              savedTheme
            );
          }
        }
      } catch (error) {
        console.error('Could not load appearance settings:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAppearance();

    return () => {
      active = false;
    };
  }, [db]);

  const updateSettings = useCallback(
    async (changes: Partial<AppearanceSettings>) => {
      const next = { ...settings, ...changes };

      await db.runAsync(
        `UPDATE app_settings SET
          theme_mode = ?,
          accent_color = ?,
          currency_code = ?,
          show_balance = ?,
          show_savings_goals = ?,
          show_completed_goals = ?,
          show_spending_overview = ?,
          show_recent_transactions = ?
        WHERE id = 1`,
        next.themeMode,
        next.accentColor,
        next.currencyCode,
        next.showBalance ? 1 : 0,
        next.showSavingsGoals ? 1 : 0,
        next.showCompletedGoals ? 1 : 0,
        next.showSpendingOverview ? 1 : 0,
        next.showRecentTransactions ? 1 : 0
      );

      setSettings(next);
    },
    [db, settings]
  );

  // RupeeTrack now controls its own theme.
  // The phone's system appearance is ignored.
  const isDark = settings.themeMode === 'dark';

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const accent =
    ACCENT_PALETTES[settings.accentColor] ??
    ACCENT_PALETTES['#6256F5'];

  const formatMoney = useCallback(
    (amount: number) => {
      const currency =
        CURRENCIES.find(
          (item) => item.code === settings.currencyCode
        ) ?? CURRENCIES[0];

      const safeAmount = Number.isFinite(amount) ? amount : 0;

      const locale =
        settings.currencyCode === 'NPR' ||
        settings.currencyCode === 'INR'
          ? 'en-IN'
          : 'en-US';

      const digits = settings.currencyCode === 'JPY' ? 0 : 2;

      const formatted = safeAmount.toLocaleString(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
      });

      return `${currency.symbol} ${formatted}`;
    },
    [settings.currencyCode]
  );

  const value = useMemo(
    () => ({
      settings,
      colors,
      accent,
      isDark,
      loading,
      updateSettings,
      formatMoney,
    }),
    [
      settings,
      colors,
      accent,
      isDark,
      loading,
      updateSettings,
      formatMoney,
    ]
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);

  if (!context) {
    throw new Error(
      'useAppearance must be used inside AppearanceProvider'
    );
  }

  return context;
}
