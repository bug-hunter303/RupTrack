import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ACCENT_COLORS,
  CURRENCIES,
  useAppearance,
  type ThemeMode,
  type CurrencyCode,
} from '@/context/appearance-context';

export default function AppearanceScreen() {
  const router = useRouter();

  const {
    settings,
    colors,
    accent,
    isDark,
    updateSettings,
  } = useAppearance();

  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  const themeOptions: {
    label: string;
    value: ThemeMode;
    icon: keyof typeof Ionicons.glyphMap;
    description: string;
  }[] = [
    {
      label: 'Light',
      value: 'light',
      icon: 'sunny-outline',
      description: 'Always use RupeeTrack in light mode',
    },
    {
      label: 'Dark',
      value: 'dark',
      icon: 'moon-outline',
      description: 'Always use RupeeTrack in dark mode',
    },
  ];

  const homeOptions = [
    {
      key: 'show_balance',
      label: 'Balance Card',
      description: 'Show your total balance on the home screen',
      value: settings.showBalance,
    },
    {
      key: 'show_savings_goals',
      label: 'Savings Goals',
      description: 'Show your active savings goals',
      value: settings.showSavingsGoals,
    },
    {
      key: 'show_completed_goals',
      label: 'Completed Goals',
      description: 'Show your completed savings goals',
      value: settings.showCompletedGoals,
    },
    {
      key: 'show_spending_overview',
      label: 'Spending Overview',
      description: 'Show your spending chart',
      value: settings.showSpendingOverview,
    },
    {
      key: 'show_recent_transactions',
      label: 'Recent Transactions',
      description: 'Show your latest transactions',
      value: settings.showRecentTransactions,
    },
  ] as const;

  const changeTheme = (value: ThemeMode) => {
    updateSettings({ themeMode: value });
  };

  const changeAccent = (value: string) => {
    updateSettings({ accentColor: value });
  };

  const toggleHomeOption = (
    key:
      | 'showBalance'
      | 'showSavingsGoals'
      | 'showCompletedGoals'
      | 'showSpendingOverview'
      | 'showRecentTransactions',
    value: boolean,
  ) => {
    updateSettings({ [key]: value });
  };

  const selectCurrency = (value: CurrencyCode) => {
    updateSettings({ currencyCode: value });
    setCurrencyModalVisible(false);
  };

  const currentCurrency = CURRENCIES.find(
    (currency) => currency.code === settings.currencyCode,
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backButton,
            { backgroundColor: colors.surface },
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={colors.text}
          />
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Appearance
        </Text>

        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Theme */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Theme
          </Text>

          <Text style={[styles.sectionDescription, { color: colors.muted }]}>
            Choose between RupeeTrack&apos;s light and dark appearance.
          </Text>

          <View
            style={[
              styles.themeCard,
              { backgroundColor: colors.surface },
            ]}
          >
            {themeOptions.map((option, index) => {
              const selected = settings.themeMode === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => changeTheme(option.value)}
                  style={[
                    styles.themeOption,
                    index !== themeOptions.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.themeIcon,
                      {
                        backgroundColor: selected
                          ? accent.soft
                          : colors.input,
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={21}
                      color={selected ? accent.primary : colors.muted}
                    />
                  </View>

                  <View style={styles.themeTextContainer}>
                    <Text
                      style={[
                        styles.optionTitle,
                        { color: colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>

                    <Text
                      style={[
                        styles.optionDescription,
                        { color: colors.muted },
                      ]}
                    >
                      {option.description}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radioOuter,
                      {
                        borderColor: selected
                          ? accent.primary
                          : colors.border,
                      },
                    ]}
                  >
                    {selected && (
                      <View
                        style={[
                          styles.radioInner,
                          { backgroundColor: accent.primary },
                        ]}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Accent Color */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Accent Color
          </Text>

          <Text style={[styles.sectionDescription, { color: colors.muted }]}>
            Personalize the highlight color used throughout the app.
          </Text>

          <View
            style={[
              styles.accentCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.accentGrid}>
              {ACCENT_COLORS.map((item) => {
                const selected = settings.accentColor === item.value;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() => changeAccent(item.value)}
                    style={styles.accentOption}
                  >
                    <View
                      style={[
                        styles.accentCircle,
                        {
                          backgroundColor: item.value,
                          borderColor: selected
                            ? colors.text
                            : 'transparent',
                        },
                      ]}
                    >
                      {selected && (
                        <Ionicons
                          name="checkmark"
                          size={19}
                          color="#FFFFFF"
                        />
                      )}
                    </View>

                    <Text
                      style={[
                        styles.accentLabel,
                        {
                          color: selected
                            ? colors.text
                            : colors.muted,
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Home Screen */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Home Screen
          </Text>

          <Text style={[styles.sectionDescription, { color: colors.muted }]}>
            Choose which sections appear on your home screen.
          </Text>

          <View
            style={[
              styles.homeCard,
              { backgroundColor: colors.surface },
            ]}
          >
            {homeOptions.map((option, index) => {
              const settingKey = {
                show_balance: 'showBalance',
                show_savings_goals: 'showSavingsGoals',
                show_completed_goals: 'showCompletedGoals',
                show_spending_overview: 'showSpendingOverview',
                show_recent_transactions: 'showRecentTransactions',
              } as const;

              return (
                <View
                  key={option.key}
                  style={[
                    styles.homeOption,
                    index !== homeOptions.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.homeOptionText}>
                    <Text
                      style={[
                        styles.optionTitle,
                        { color: colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>

                    <Text
                      style={[
                        styles.optionDescription,
                        { color: colors.muted },
                      ]}
                    >
                      {option.description}
                    </Text>
                  </View>

                  <Switch
                    value={option.value}
                    onValueChange={(value) =>
                      toggleHomeOption(settingKey[option.key], value)
                    }
                    trackColor={{
                      false: colors.border,
                      true: accent.primary,
                    }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Currency */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Currency
          </Text>

          <Text style={[styles.sectionDescription, { color: colors.muted }]}>
            Choose the currency used to display your money.
          </Text>

          <Pressable
            onPress={() => setCurrencyModalVisible(true)}
            style={[
              styles.currencyCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View
              style={[
                styles.currencyIcon,
                { backgroundColor: accent.soft },
              ]}
            >
              <Ionicons
                name="cash-outline"
                size={22}
                color={accent.primary}
              />
            </View>

            <View style={styles.currencyTextContainer}>
              <Text
                style={[styles.optionTitle, { color: colors.text }]}
              >
                {currentCurrency?.name ?? 'Nepalese Rupee'}
              </Text>

              <Text
                style={[
                  styles.optionDescription,
                  { color: colors.muted },
                ]}
              >
                {currentCurrency?.symbol ?? 'Rs.'} (
                {settings.currencyCode})
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.muted}
            />
          </Pressable>
        </View>
      </ScrollView>

      {/* Currency Selection Modal */}
      <Modal
        visible={currencyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCurrencyModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface },
            ]}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[styles.modalTitle, { color: colors.text }]}
              >
                Select Currency
              </Text>

              <Pressable
                onPress={() => setCurrencyModalVisible(false)}
                style={[
                  styles.modalCloseButton,
                  { backgroundColor: colors.input },
                ]}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={colors.text}
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.currencyList}
              showsVerticalScrollIndicator={false}
            >
              {CURRENCIES.map((currency) => {
                const selected =
                  settings.currencyCode === currency.code;

                return (
                  <Pressable
                    key={currency.code}
                    onPress={() => selectCurrency(currency.code)}
                    style={[
                      styles.currencyOption,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: selected
                          ? accent.soft
                          : 'transparent',
                      },
                    ]}
                  >
                    <View style={styles.currencyOptionText}>
                      <Text
                        style={[
                          styles.currencySymbol,
                          { color: accent.primary },
                        ]}
                      >
                        {currency.symbol}
                      </Text>

                      <View style={styles.currencyNameContainer}>
                        <Text
                          style={[
                            styles.optionTitle,
                            { color: colors.text },
                          ]}
                        >
                          {currency.name}
                        </Text>

                        <Text
                          style={[
                            styles.optionDescription,
                            { color: colors.muted },
                          ]}
                        >
                          {currency.code}
                        </Text>
                      </View>
                    </View>

                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={accent.primary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  headerRight: {
    width: 40,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },

  section: {
    marginBottom: 27,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 5,
  },

  sectionDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 13,
  },

  themeCard: {
    borderRadius: 17,
    paddingHorizontal: 15,
  },

  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },

  themeIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  themeTextContainer: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },

  optionDescription: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  radioOuter: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },

  accentCard: {
    borderRadius: 17,
    padding: 17,
  },

  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 19,
  },

  accentOption: {
    width: '30%',
    alignItems: 'center',
  },

  accentCircle: {
    width: 43,
    height: 43,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },

  accentLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 7,
  },

  homeCard: {
    borderRadius: 17,
    paddingHorizontal: 16,
  },

  homeOption: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },

  homeOptionText: {
    flex: 1,
    paddingRight: 12,
  },

  currencyCard: {
    minHeight: 76,
    borderRadius: 17,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  currencyIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  currencyTextContainer: {
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  modalContent: {
    borderRadius: 22,
    maxHeight: '75%',
    paddingTop: 19,
    paddingBottom: 10,
    overflow: 'hidden',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  currencyList: {
    paddingHorizontal: 15,
  },

  currencyOption: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },

  currencyOptionText: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  currencySymbol: {
    width: 38,
    fontSize: 19,
    fontWeight: '700',
  },

  currencyNameContainer: {
    justifyContent: 'center',
  },
});
