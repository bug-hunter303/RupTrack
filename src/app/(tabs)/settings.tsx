
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppearance } from '@/context/appearance-context';

type SettingsItem = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
  route: string;
};

export default function SettingsScreen() {
  const router = useRouter();

  const { colors, accent, isDark } = useAppearance();

  const styles = createStyles(colors, accent.primary, isDark);

  const SETTINGS_ITEMS: SettingsItem[] = [
    {
      title: 'Profile',
      subtitle: 'Manage your personal information',
      icon: 'person-outline',
      color: '#6256F5',
      background: isDark ? '#292442' : '#EFEDFF',
      route: '/settings/profile',
    },
    {
      title: 'Salary Settings',
      subtitle: 'Manage your monthly salary and credit date',
      icon: 'wallet-outline',
      color: '#2878E5',
      background: isDark ? '#1D304A' : '#E8F2FF',
      route: '/settings/salary',
    },
    {
      title: 'Appearance',
      subtitle: 'Customize how RupeeTrack looks',
      icon: 'color-palette-outline',
      color: '#E49A35',
      background: isDark ? '#3B3021' : '#FFF2E2',
      route: '/settings/appearance',
    },
    {
      title: 'Notifications',
      subtitle: 'Manage reminders and notifications',
      icon: 'notifications-outline',
      color: '#16A673',
      background: isDark ? '#18372E' : '#E7F8F0',
      route: '/settings/notifications',
    },
    {
      title: 'Data Management',
      subtitle: 'Export, backup, and manage your data',
      icon: 'server-outline',
      color: '#DB6373',
      background: isDark ? '#40262D' : '#FDECEF',
      route: '/settings/data-management',
    },
    {
      title: 'Security',
      subtitle: 'Protect your app and financial data',
      icon: 'shield-checkmark-outline',
      color: '#8B7FF7',
      background: isDark ? '#292442' : '#F0EDFF',
      route: '/settings/security',
    },
    {
      title: 'About RupeeTrack',
      subtitle: 'App information and version details',
      icon: 'information-circle-outline',
      color: '#8291A7',
      background: isDark ? '#293241' : '#EDF1F6',
      route: '/settings/about',
    },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              PERSONALIZE YOUR APP
            </Text>

            <Text style={styles.title}>
              Settings
            </Text>

            <Text style={styles.subtitle}>
              Manage your account and preferences.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="settings-outline"
              size={24}
              color={accent.primary}
            />
          </View>
        </View>

        {/* Settings section */}
        <Text style={styles.sectionTitle}>
          PREFERENCES
        </Text>

        <View style={styles.settingsCard}>
          {SETTINGS_ITEMS.map((item, index) => (
            <View key={item.route}>
              <Pressable
                style={({ pressed }) => [
                  styles.settingsItem,
                  pressed && styles.itemPressed,
                ]}
                onPress={() => router.push(item.route as any)}
              >
                <View
                  style={[
                    styles.itemIcon,
                    { backgroundColor: item.background },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={item.color}
                  />
                </View>

                <View style={styles.itemText}>
                  <Text style={styles.itemTitle}>
                    {item.title}
                  </Text>

                  <Text style={styles.itemSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={colors.muted}
                />
              </Pressable>

              {index !== SETTINGS_ITEMS.length - 1 && (
                <View style={styles.separator} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>
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

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 35,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 30,
    },

    headerText: {
      flex: 1,
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
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.6,
    },

    subtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 5,
    },

    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },

    sectionTitle: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.3,
      marginBottom: 12,
      marginLeft: 3,
    },

    settingsCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },

    settingsItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
    },

    itemPressed: {
      opacity: 0.65,
    },

    itemIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },

    itemText: {
      flex: 1,
      paddingRight: 8,
    },

    itemTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },

    itemSubtitle: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 4,
      lineHeight: 15,
    },

    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 57,
    },
  });
}
