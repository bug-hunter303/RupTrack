
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppearance } from '@/context/appearance-context';

type SalarySettingsData = {
  amount: number;
  credit_day: number;
  enabled: number;
};

type PopupType = 'success' | 'error';

type PopupData = {
  visible: boolean;
  type: PopupType;
  title: string;
  message: string;
  goBack?: boolean;
};

export default function SalarySettingsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const { colors, accent, isDark } = useAppearance();
  const styles = createStyles(colors, accent.primary, isDark);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [salary, setSalary] = useState('');
  const [creditDay, setCreditDay] = useState('1');
  const [enabled, setEnabled] = useState(true);

  const [popup, setPopup] = useState<PopupData>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const showPopup = (
    type: PopupType,
    title: string,
    message: string,
    goBack = false
  ) => {
    setPopup({
      visible: true,
      type,
      title,
      message,
      goBack,
    });
  };

  const closePopup = () => {
    const shouldGoBack = popup.goBack;

    setPopup((previous) => ({
      ...previous,
      visible: false,
    }));

    if (shouldGoBack) {
      router.back();
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      const result = await db.getFirstAsync<SalarySettingsData>(
        `SELECT amount, credit_day, enabled
         FROM salary_settings
         WHERE id = 1`
      );

      if (result) {
        setSalary(String(result.amount));
        setCreditDay(String(result.credit_day));
        setEnabled(result.enabled === 1);
      } else {
        setSalary('');
        setCreditDay('1');
        setEnabled(true);
      }
    } catch (error) {
      console.error('Failed to load salary settings:', error);

      showPopup(
        'error',
        'Something went wrong',
        'We could not load your salary settings. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const saveSettings = async () => {
    const amount = Number(salary);
    const day = Number(creditDay);

    if (
      !salary.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      showPopup(
        'error',
        'Invalid salary amount',
        'Please enter a valid monthly salary amount before saving.'
      );
      return;
    }

    if (
      !creditDay.trim() ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31
    ) {
      showPopup(
        'error',
        'Invalid credit date',
        'Your salary credit day must be a number between 1 and 31.'
      );
      return;
    }

    try {
      setSaving(true);

      await db.runAsync(
        `INSERT INTO salary_settings
          (id, amount, credit_day, enabled)
         VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           amount = excluded.amount,
           credit_day = excluded.credit_day,
           enabled = excluded.enabled`,
        amount,
        day,
        enabled ? 1 : 0
      );

      showPopup(
        'success',
        'Settings saved!',
        'Your monthly salary preferences have been updated successfully.',
        true
      );
    } catch (error) {
      console.error('Failed to save salary settings:', error);

      showPopup(
        'error',
        'Could not save settings',
        'Something went wrong while saving your salary preferences. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={['top']}>
        <ActivityIndicator
          size="large"
          color={accent.primary}
        />

        <Text style={styles.loadingText}>
          Loading salary settings...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Back button */}
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={colors.text}
            />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              INCOME PREFERENCES
            </Text>

            <Text style={styles.title}>
              Salary Settings
            </Text>

            <Text style={styles.subtitle}>
              Manage your monthly salary and automatic credit.
            </Text>
          </View>

          {/* Monthly salary */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              MONTHLY SALARY
            </Text>

            <View style={styles.salaryCard}>
              <View style={styles.salaryIcon}>
                <Ionicons
                  name="wallet-outline"
                  size={23}
                  color={accent.primary}
                />
              </View>

              <Text style={styles.fieldLabel}>
                Your monthly income
              </Text>

              <View style={styles.amountInputContainer}>
                <Text style={styles.currency}>Rs.</Text>

                <TextInput
                  style={styles.amountInput}
                  value={salary}
                  onChangeText={(value) =>
                    setSalary(value.replace(/[^0-9.]/g, ''))
                  }
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <Text style={styles.helperText}>
                Enter the amount you receive every month.
              </Text>
            </View>
          </View>

          {/* Credit date */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              SALARY CREDIT DATE
            </Text>

            <View style={styles.creditCard}>
              <View style={styles.creditIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={22}
                  color="#2878E5"
                />
              </View>

              <View style={styles.creditInfo}>
                <Text style={styles.fieldLabel}>
                  Salary credit day
                </Text>

                <Text style={styles.helperText}>
                  Which day of the month do you receive your salary?
                </Text>
              </View>

              <View style={styles.dayInputContainer}>
                <TextInput
                  style={styles.dayInput}
                  value={creditDay}
                  onChangeText={(value) =>
                    setCreditDay(
                      value.replace(/[^0-9]/g, '').slice(0, 2)
                    )
                  }
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                />

                <Text style={styles.daySuffix}>DAY</Text>
              </View>
            </View>

            <Text style={styles.note}>
              For months with fewer days, the salary will be credited
              on the last day of that month.
            </Text>
          </View>

          {/* Automatic credit */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              AUTOMATIC CREDIT
            </Text>

            <View style={styles.toggleCard}>
              <View style={styles.toggleIcon}>
                <Ionicons
                  name="sync-outline"
                  size={22}
                  color="#16A673"
                />
              </View>

              <View style={styles.toggleInfo}>
                <Text style={styles.fieldLabel}>
                  Automatic salary credit
                </Text>

                <Text style={styles.helperText}>
                  Automatically add your salary to your income
                  when your credit day arrives.
                </Text>
              </View>

              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{
                  false: colors.border,
                  true: isDark ? '#285A48' : '#A9E5CE',
                }}
                thumbColor={enabled ? '#16A673' : '#FFFFFF'}
              />
            </View>
          </View>

          {/* Information */}
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={21}
              color="#2878E5"
            />

            <Text style={styles.infoText}>
              RupeeTrack checks your salary credit when the dashboard
              loads. Your salary is added only once per month, so
              duplicate monthly credits are prevented.
            </Text>
          </View>

          {/* Save button */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.buttonPressed,
              saving && styles.buttonDisabled,
            ]}
            onPress={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#FFFFFF"
                />

                <Text style={styles.saveButtonText}>
                  SAVE SETTINGS
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom RupeeTrack popup */}
      <Modal
        visible={popup.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closePopup}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupCard}>
            <View
              style={[
                styles.popupIcon,
                popup.type === 'success'
                  ? styles.successIcon
                  : styles.errorIcon,
              ]}
            >
              <Ionicons
                name={
                  popup.type === 'success'
                    ? 'checkmark-circle'
                    : 'alert-circle'
                }
                size={35}
                color={
                  popup.type === 'success'
                    ? '#16A673'
                    : '#E35D6A'
                }
              />
            </View>

            <Text style={styles.popupTitle}>
              {popup.title}
            </Text>

            <Text style={styles.popupMessage}>
              {popup.message}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.popupButton,
                popup.type === 'error' && styles.errorButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={closePopup}
            >
              <Text style={styles.popupButtonText}>
                {popup.goBack ? 'DONE' : 'GOT IT'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(
  colors: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    input: string;
  },
  primary: string,
  isDark: boolean
) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    loadingScreen: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 12,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 40,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },

    header: {
      marginBottom: 27,
    },

    eyebrow: {
      color: primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
      marginBottom: 6,
    },

    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.5,
    },

    subtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 6,
    },

    section: {
      marginBottom: 23,
    },

    sectionLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      marginBottom: 11,
      marginLeft: 3,
    },

    salaryCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 19,
      borderWidth: 1,
      borderColor: colors.border,
    },

    salaryIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },

    fieldLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },

    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1.5,
      borderBottomColor: colors.border,
      paddingBottom: 9,
      marginTop: 9,
    },

    currency: {
      color: primary,
      fontSize: 23,
      fontWeight: '800',
      marginRight: 10,
    },

    amountInput: {
      flex: 1,
      color: colors.text,
      fontSize: 27,
      fontWeight: '800',
      paddingVertical: 3,
    },

    helperText: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 16,
      marginTop: 6,
    },

    creditCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
    },

    creditIcon: {
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor: isDark ? '#1D304A' : '#E8F2FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    creditInfo: {
      flex: 1,
    },

    dayInputContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.input,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      width: 55,
      height: 58,
      marginLeft: 8,
    },

    dayInput: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '800',
      textAlign: 'center',
      width: '100%',
      paddingVertical: 0,
    },

    daySuffix: {
      color: colors.muted,
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 1,
      marginTop: 1,
    },

    note: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 16,
      marginTop: 9,
      marginLeft: 3,
    },

    toggleCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
    },

    toggleIcon: {
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor: isDark ? '#18372E' : '#E7F8F0',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    toggleInfo: {
      flex: 1,
      paddingRight: 8,
    },

    infoCard: {
      backgroundColor: isDark ? '#1D304A' : '#EAF3FF',
      borderRadius: 15,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 25,
      gap: 9,
    },

    infoText: {
      flex: 1,
      color: isDark ? '#B5C9E5' : '#526B8C',
      fontSize: 10,
      lineHeight: 16,
    },

    saveButton: {
      height: 54,
      borderRadius: 16,
      backgroundColor: primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      elevation: 3,
      shadowColor: primary,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },

    buttonPressed: {
      opacity: 0.8,
    },

    buttonDisabled: {
      opacity: 0.7,
    },

    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
    },

    // Custom popup
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.58)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 28,
    },

    popupCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: 25,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 23,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 12,
      shadowColor: '#000000',
      shadowOpacity: 0.15,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },

    popupIcon: {
      width: 68,
      height: 68,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 17,
    },

    successIcon: {
      backgroundColor: isDark ? '#18372E' : '#E7F8F0',
    },

    errorIcon: {
      backgroundColor: isDark ? '#40262D' : '#FDECEF',
    },

    popupTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '800',
      textAlign: 'center',
    },

    popupMessage: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: 9,
      marginBottom: 23,
    },

    popupButton: {
      width: '100%',
      height: 49,
      borderRadius: 14,
      backgroundColor: primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    errorButton: {
      backgroundColor: isDark ? '#343B4B' : '#17233D',
    },

    popupButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
    },
  });
}
