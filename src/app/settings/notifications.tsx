
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/context/appearance-context';

type Preferences = {
  enabled: number;
  salary_credits: number;
  spending_alerts: number;
  budget_warnings: number;
  savings_reminders: number;
  daily_summary: number;
};

type PreferenceKey = keyof Preferences;

const DEFAULT_PREFERENCES: Preferences = {
  enabled: 1,
  salary_credits: 1,
  spending_alerts: 1,
  budget_warnings: 1,
  savings_reminders: 1,
  daily_summary: 0,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const { colors, accent, isDark } = useAppearance();
  const styles = createStyles(colors, accent.primary, isDark);

  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadPreferences = async () => {
      try {
        const row = await db.getFirstAsync<Preferences>(
          `SELECT
            enabled,
            salary_credits,
            spending_alerts,
            budget_warnings,
            savings_reminders,
            daily_summary
           FROM notification_preferences
           WHERE id = 1`
        );

        if (mounted) {
          setPreferences(row ?? DEFAULT_PREFERENCES);
        }
      } catch (error) {
        console.error('Could not load notification preferences:', error);

        if (mounted) {
          setModalMessage(
            'Your notification preferences could not be loaded.'
          );
          setModalVisible(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadPreferences();

    return () => {
      mounted = false;
    };
  }, [db]);

  const updatePreference = async (
    key: PreferenceKey,
    value: boolean
  ) => {
    const previousPreferences = preferences;
    const newValue = value ? 1 : 0;

    setPreferences((current) => ({
      ...current,
      [key]: newValue,
    }));

    setSaving(true);

    try {
      await db.runAsync(
        `UPDATE notification_preferences
         SET ${key} = ?
         WHERE id = 1`,
        newValue
      );
    } catch (error) {
      console.error('Could not save notification preference:', error);

      setPreferences(previousPreferences);
      setModalMessage(
        'Your preference could not be saved. Please try again.'
      );
      setModalVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const notificationItems: {
    key: PreferenceKey;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    background: string;
  }[] = [
    {
      key: 'salary_credits',
      title: 'Salary credited',
      description: 'Get notified when your monthly salary is credited.',
      icon: 'wallet-outline',
      color: '#2878E5',
      background: isDark ? '#1D304A' : '#E8F2FF',
    },
    {
      key: 'spending_alerts',
      title: 'Spending alerts',
      description: 'Receive alerts about your spending activity.',
      icon: 'trending-up-outline',
      color: '#E49A35',
      background: isDark ? '#3B3021' : '#FFF2E2',
    },
    {
      key: 'budget_warnings',
      title: 'Budget warnings',
      description: 'Know when you approach or exceed your budget.',
      icon: 'pie-chart-outline',
      color: '#DB6373',
      background: isDark ? '#40262D' : '#FDECEF',
    },
    {
      key: 'savings_reminders',
      title: 'Savings reminders',
      description: 'Stay on track with your savings goals.',
      icon: 'flag-outline',
      color: '#16A673',
      background: isDark ? '#18372E' : '#E7F8F0',
    },
    {
      key: 'daily_summary',
      title: 'Daily summary',
      description: 'Receive a summary of your daily income and expenses.',
      icon: 'calendar-outline',
      color: '#8B7FF7',
      background: isDark ? '#292442' : '#F0EDFF',
    },
  ];

  const masterEnabled = preferences.enabled === 1;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={23}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.headerTitle}>Notifications</Text>

        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={accent.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.introSection}>
            <View style={styles.introIcon}>
              <Ionicons
                name="notifications-outline"
                size={29}
                color={accent.primary}
              />
            </View>

            <Text style={styles.introTitle}>
              Stay in the loop
            </Text>

            <Text style={styles.introDescription}>
              Choose which updates and reminders you want to receive
              from RupeeTrack.
            </Text>
          </View>

          <View style={styles.masterCard}>
            <View style={styles.masterIcon}>
              <Ionicons
                name="notifications"
                size={22}
                color={accent.primary}
              />
            </View>

            <View style={styles.masterText}>
              <Text style={styles.masterTitle}>
                All notifications
              </Text>

              <Text style={styles.masterDescription}>
                {masterEnabled
                  ? 'Your notification preferences are enabled.'
                  : 'All notification preferences are turned off.'}
              </Text>
            </View>

            <Switch
              value={masterEnabled}
              onValueChange={(value) =>
                updatePreference('enabled', value)
              }
              trackColor={{
                false: colors.border,
                true: accent.primary,
              }}
              thumbColor="#FFFFFF"
              disabled={saving}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              NOTIFICATION TYPES
            </Text>

            <Text style={styles.sectionHint}>
              Customize your alerts
            </Text>
          </View>

          <View style={styles.optionsCard}>
            {notificationItems.map((item, index) => {
              const isEnabled = preferences[item.key] === 1;

              return (
                <View key={item.key}>
                  <View
                    style={[
                      styles.notificationItem,
                      !masterEnabled && styles.disabledItem,
                    ]}
                  >
                    <View
                      style={[
                        styles.itemIcon,
                        { backgroundColor: item.background },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={21}
                        color={item.color}
                      />
                    </View>

                    <View style={styles.itemText}>
                      <Text style={styles.itemTitle}>
                        {item.title}
                      </Text>

                      <Text style={styles.itemDescription}>
                        {item.description}
                      </Text>
                    </View>

                    <Switch
                      value={isEnabled}
                      onValueChange={(value) =>
                        updatePreference(item.key, value)
                      }
                      trackColor={{
                        false: colors.border,
                        true: accent.primary,
                      }}
                      thumbColor="#FFFFFF"
                      disabled={!masterEnabled || saving}
                    />
                  </View>

                  {index !== notificationItems.length - 1 && (
                    <View style={styles.separator} />
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={19}
              color={colors.muted}
            />

            <Text style={styles.infoText}>
              These settings control your notification preferences.
              Actual device notifications will be connected to the
              corresponding RupeeTrack events separately.
            </Text>
          </View>

          <View style={styles.saveStatus}>
            {saving ? (
              <>
                <ActivityIndicator
                  size="small"
                  color={accent.primary}
                />
                <Text style={styles.saveStatusText}>
                  Saving preferences...
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="#16A673"
                />
                <Text style={styles.saveStatusText}>
                  Preferences are saved automatically
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      )}

      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={27}
                color="#D65353"
              />
            </View>

            <Text style={styles.modalTitle}>
              Something went wrong
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
      )}
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
  },
  primary: string,
  isDark: boolean
) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    header: {
      height: 58,
      paddingHorizontal: 19,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    backButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },

    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },

    headerSpacer: {
      width: 38,
    },

    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 17,
      paddingBottom: 40,
    },

    introSection: {
      alignItems: 'center',
      paddingVertical: 20,
      marginBottom: 16,
    },

    introIcon: {
      width: 66,
      height: 66,
      borderRadius: 22,
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 13,
    },

    introTitle: {
      color: colors.text,
      fontSize: 21,
      fontWeight: '800',
    },

    introDescription: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: 7,
      paddingHorizontal: 15,
    },

    masterCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 27,
    },

    masterIcon: {
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    masterText: {
      flex: 1,
      paddingRight: 8,
    },

    masterTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },

    masterDescription: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 4,
      lineHeight: 15,
    },

    sectionHeader: {
      marginBottom: 12,
      marginLeft: 3,
    },

    sectionTitle: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.3,
    },

    sectionHint: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 4,
    },

    optionsCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },

    notificationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
    },

    disabledItem: {
      opacity: 0.45,
    },

    itemIcon: {
      width: 43,
      height: 43,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    itemText: {
      flex: 1,
      paddingRight: 7,
    },

    itemTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },

    itemDescription: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 4,
    },

    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 55,
    },

    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      marginTop: 18,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    infoText: {
      flex: 1,
      color: colors.muted,
      fontSize: 10,
      lineHeight: 16,
    },

    saveStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      marginTop: 19,
    },

    saveStatusText: {
      color: colors.muted,
      fontSize: 10,
    },

    modalOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(17, 24, 39, 0.55)',
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
      backgroundColor: isDark ? '#40262D' : '#FFF0F0',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
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
