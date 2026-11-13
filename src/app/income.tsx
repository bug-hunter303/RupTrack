
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAppearance } from '@/context/appearance-context';

type SalarySettings = {
  amount: number;
  credit_day: number;
  enabled: number;
};

type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  input: string;
};

function getTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function IncomeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const { colors, accent, isDark, formatMoney } = useAppearance();
  const styles = createStyles(colors, accent.primary, isDark);

  const [salaryAmount, setSalaryAmount] = useState('');
  const [creditDay, setCreditDay] = useState('1');

  const [additionalDescription, setAdditionalDescription] = useState('');
  const [additionalAmount, setAdditionalAmount] = useState('');

  const [salaryConfigured, setSalaryConfigured] = useState(false);
  const [totalIncome, setTotalIncome] = useState(0);
  const [savingSalary, setSavingSalary] = useState(false);
  const [savingIncome, setSavingIncome] = useState(false);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalSuccess, setModalSuccess] = useState(true);

  const showMessage = (
    title: string,
    message: string,
    success: boolean
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalSuccess(success);
    setModalVisible(true);
  };

  const refreshIncome = useCallback(async () => {
    setLoading(true);

    try {
      const settings = await db.getFirstAsync<SalarySettings>(
        `SELECT amount, credit_day, enabled
         FROM salary_settings
         WHERE id = 1`
      );

      if (settings) {
        setSalaryAmount(String(settings.amount));
        setCreditDay(String(settings.credit_day));
        setSalaryConfigured(true);

        const today = new Date();

        if (
          settings.enabled === 1 &&
          today.getDate() >= settings.credit_day
        ) {
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const periodKey = `salary-${year}-${month}`;

          const lastDayOfMonth = new Date(
            year,
            today.getMonth() + 1,
            0
          ).getDate();

          const actualCreditDay = Math.min(
            settings.credit_day,
            lastDayOfMonth
          );

          const creditDate = [
            year,
            month,
            String(actualCreditDay).padStart(2, '0'),
          ].join('-');

          await db.runAsync(
            `INSERT OR IGNORE INTO income
              (description, amount, type, date, period_key)
             VALUES (?, ?, 'salary', ?, ?)`,
            'Monthly Salary',
            settings.amount,
            creditDate,
            periodKey
          );
        }
      } else {
        setSalaryConfigured(false);
        setSalaryAmount('');
        setCreditDay('1');
      }

      const result = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM income`
      );

      setTotalIncome(Number(result?.total ?? 0));
    } catch (error) {
      console.error('Could not load income:', error);

      showMessage(
        'Something went wrong',
        'Could not load your income data.',
        false
      );
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refreshIncome();
    }, [refreshIncome])
  );

  const saveSalarySettings = async () => {
    const amount = Number(salaryAmount);
    const day = Number(creditDay);

    if (
      !salaryAmount.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      showMessage(
        'Invalid salary',
        'Please enter a valid salary amount.',
        false
      );
      return;
    }

    if (
      !creditDay.trim() ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31
    ) {
      showMessage(
        'Invalid credit day',
        'Enter a day between 1 and 31.',
        false
      );
      return;
    }

    setSavingSalary(true);

    try {
      await db.runAsync(
        `INSERT INTO salary_settings (id, amount, credit_day, enabled)
         VALUES (1, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET
           amount = excluded.amount,
           credit_day = excluded.credit_day,
           enabled = 1`,
        amount,
        day
      );

      await refreshIncome();

      showMessage(
        'Salary settings saved',
        'Your monthly salary has been configured.',
        true
      );
    } catch (error) {
      console.error('Could not save salary:', error);

      showMessage(
        'Error',
        'Could not save your salary settings.',
        false
      );
    } finally {
      setSavingSalary(false);
    }
  };

  const addAdditionalIncome = async () => {
    const description = additionalDescription.trim();
    const amount = Number(additionalAmount);

    if (!description) {
      showMessage(
        'Missing description',
        'Give this income a name first.',
        false
      );
      return;
    }

    if (
      !additionalAmount.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      showMessage(
        'Invalid amount',
        'Please enter a valid amount.',
        false
      );
      return;
    }

    setSavingIncome(true);

    try {
      await db.runAsync(
        `INSERT INTO income (description, amount, type, date)
         VALUES (?, ?, 'additional', ?)`,
        description,
        amount,
        getTodayISO()
      );

      setAdditionalDescription('');
      setAdditionalAmount('');

      await refreshIncome();

      showMessage(
        'Income added',
        'Your additional income was saved.',
        true
      );
    } catch (error) {
      console.error('Could not add income:', error);

      showMessage(
        'Error',
        'Could not save this income.',
        false
      );
    } finally {
      setSavingIncome(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace('/(tabs)')
              }
            >
              <Ionicons
                name="arrow-back"
                size={23}
                color={colors.text}
              />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>RUPEETRACK</Text>
              <Text style={styles.title}>Your Income</Text>
              <Text style={styles.subtitle}>
                Every rupee coming your way.
              </Text>
            </View>

            <Pressable
              style={styles.headerIcon}
              onPress={() => router.push('/income-history')}
            >
              <Ionicons
                name="receipt-outline"
                size={25}
                color={accent.primary}
              />
            </Pressable>
          </View>

          {/* Total Income */}
          <View style={styles.totalCard}>
            <View style={styles.totalTopRow}>
              <View style={styles.totalIcon}>
                <Ionicons
                  name="wallet-outline"
                  size={21}
                  color="#FFFFFF"
                />
              </View>

              <Text style={styles.totalLabel}>
                TOTAL RECORDED INCOME
              </Text>
            </View>

            <Text style={styles.totalAmount}>
              {loading ? 'Loading...' : formatMoney(totalIncome)}
            </Text>

            <Text style={styles.totalFootnote}>
              From your saved income entries
            </Text>
          </View>

          {/* Monthly Salary */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Monthly salary</Text>

            <View style={styles.recurringBadge}>
              <Ionicons
                name="repeat"
                size={12}
                color="#16A673"
              />
              <Text style={styles.recurringText}>RECURRING</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeading}>
              <View style={styles.salaryIcon}>
                <Ionicons
                  name="briefcase-outline"
                  size={21}
                  color={accent.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Your monthly salary
                </Text>

                <Text style={styles.cardSubtitle}>
                  Set how much you earn each month.
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>SALARY AMOUNT</Text>

            <View style={styles.amountInputWrapper}>
              <Text style={styles.currencyPrefix}>
                {formatMoney(0).replace(/[\d.,\s]/g, '')}
              </Text>

              <TextInput
                style={styles.amountInput}
                value={salaryAmount}
                onChangeText={setSalaryAmount}
                placeholder="e.g. 50000"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.inputLabel}>
              SALARY CREDIT DAY
            </Text>

            <View style={styles.dayInputWrapper}>
              <TextInput
                style={styles.dayInput}
                value={creditDay}
                onChangeText={setCreditDay}
                placeholder="1"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={2}
              />

              <Text style={styles.daySuffix}>
                DAY OF EVERY MONTH
              </Text>
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                savingSalary && styles.disabledButton,
              ]}
              onPress={saveSalarySettings}
              disabled={savingSalary}
            >
              {savingSalary ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {salaryConfigured
                      ? 'UPDATE SALARY SETTINGS'
                      : 'SAVE SALARY SETTINGS'}
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color="#FFFFFF"
                  />
                </>
              )}
            </Pressable>

            <View style={styles.infoRow}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.muted}
              />

              <Text style={styles.infoText}>
                Salary is credited once per month when you open the app
                on or after your selected day.
              </Text>
            </View>
          </View>

          {/* Additional Income */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Additional income
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeading}>
              <View style={styles.additionalIcon}>
                <Ionicons
                  name="add"
                  size={23}
                  color={accent.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Got extra money?
                </Text>

                <Text style={styles.cardSubtitle}>
                  Freelance, gifts, bonuses and more.
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>
              INCOME DESCRIPTION
            </Text>

            <TextInput
              style={styles.textInput}
              value={additionalDescription}
              onChangeText={setAdditionalDescription}
              placeholder="e.g. Freelance project"
              placeholderTextColor={colors.muted}
              maxLength={60}
            />

            <Text style={styles.inputLabel}>AMOUNT</Text>

            <View style={styles.amountInputWrapper}>
              <Text style={styles.currencyPrefix}>
                {formatMoney(0).replace(/[\d.,\s]/g, '')}
              </Text>

              <TextInput
                style={styles.amountInput}
                value={additionalAmount}
                onChangeText={setAdditionalAmount}
                placeholder="e.g. 5000"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
              />
            </View>

            <Pressable
              style={[
                styles.additionalButton,
                savingIncome && styles.disabledButton,
              ]}
              onPress={addAdditionalIncome}
              disabled={savingIncome}
            >
              {savingIncome ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="add-circle-outline"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text style={styles.primaryButtonText}>
                    ADD INCOME
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={{ height: 35 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom RupeeTrack Popup */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIcon,
                !modalSuccess && styles.modalIconError,
              ]}
            >
              <Ionicons
                name={
                  modalSuccess
                    ? 'checkmark'
                    : 'alert-circle-outline'
                }
                size={28}
                color={modalSuccess ? '#16A673' : '#D65353'}
              />
            </View>

            <Text style={styles.modalTitle}>
              {modalTitle}
            </Text>

            <Text style={styles.modalMessage}>
              {modalMessage}
            </Text>

            <Pressable
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>
                Okay
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(
  colors: ThemeColors,
  primary: string,
  isDark: boolean
) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 30,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 23,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },

    headerText: {
      flex: 1,
    },

    eyebrow: {
      color: primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 2,
      marginBottom: 7,
    },

    title: {
      color: colors.text,
      fontSize: 29,
      fontWeight: '800',
    },

    subtitle: {
      color: colors.muted,
      fontSize: 13,
      marginTop: 5,
    },

    headerIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: isDark
        ? `${primary}25`
        : `${primary}18`,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },

    totalCard: {
      backgroundColor: isDark ? colors.surface : '#17233D',
      borderRadius: 23,
      padding: 22,
      marginBottom: 28,
      borderWidth: isDark ? 1 : 0,
      borderColor: colors.border,
    },

    totalTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    totalIcon: {
      width: 35,
      height: 35,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    totalLabel: {
      color: isDark ? colors.muted : '#C7CDDA',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
    },

    totalAmount: {
      color: isDark ? colors.text : '#FFFFFF',
      fontSize: 31,
      fontWeight: '800',
      marginTop: 18,
    },

    totalFootnote: {
      color: isDark ? colors.muted : '#AEB8CB',
      fontSize: 11,
      marginTop: 5,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 13,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },

    recurringBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDark ? '#18372E' : '#E5F7EF',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },

    recurringText: {
      color: '#16A673',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.7,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 21,
      padding: 19,
      marginBottom: 27,
      borderWidth: 1,
      borderColor: colors.border,
    },

    cardHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 23,
    },

    salaryIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor: isDark ? `${primary}25` : `${primary}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },

    additionalIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor: isDark ? `${primary}25` : `${primary}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cardTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },

    cardSubtitle: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 4,
      lineHeight: 16,
    },

    inputLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      marginBottom: 9,
      marginTop: 4,
    },

    amountInputWrapper: {
      height: 53,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      marginBottom: 18,
    },

    currencyPrefix: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      marginRight: 10,
    },

    amountInput: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      paddingVertical: 0,
    },

    dayInputWrapper: {
      height: 53,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      marginBottom: 20,
    },

    dayInput: {
      width: 45,
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
      paddingVertical: 0,
    },

    daySuffix: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
    },

    primaryButton: {
      height: 52,
      backgroundColor: primary,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },

    additionalButton: {
      height: 52,
      backgroundColor: primary,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      marginTop: 3,
    },

    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
    },

    disabledButton: {
      opacity: 0.6,
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
      marginTop: 14,
    },

    infoText: {
      flex: 1,
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
    },

    textInput: {
      height: 53,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      borderRadius: 13,
      paddingHorizontal: 14,
      color: colors.text,
      fontSize: 14,
      marginBottom: 18,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(17, 24, 39, 0.58)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 25,
    },

    modalCard: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },

    modalIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: isDark ? '#18372E' : '#E8F8F1',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },

    modalIconError: {
      backgroundColor: isDark ? '#40262D' : '#FFF0F0',
    },

    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },

    modalMessage: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 8,
    },

    modalButton: {
      height: 46,
      alignSelf: 'stretch',
      borderRadius: 12,
      backgroundColor: primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },

    modalButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
  });
}
