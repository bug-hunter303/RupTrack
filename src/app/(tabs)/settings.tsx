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

const COLORS = {
  background: '#F5F6FA',
  white: '#FFFFFF',
  navy: '#17233D',
  muted: '#8992A5',
  purple: '#6256F5',
  blue: '#2878E5',
  green: '#16A673',
  orange: '#E49A35',
  red: '#DB6373',
  border: '#E9ECF2',
};

type SettingsItem = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
  route: string;
};

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    title: 'Profile',
    subtitle: 'Manage your personal information',
    icon: 'person-outline',
    color: COLORS.purple,
    background: '#EFEDFF',
    route: '/settings/profile',
  },
  {
    title: 'Salary Settings',
    subtitle: 'Manage your monthly salary and credit date',
    icon: 'wallet-outline',
    color: COLORS.blue,
    background: '#E8F2FF',
    route: '/settings/salary',
  },
  {
    title: 'Appearance',
    subtitle: 'Customize how RupeeTrack looks',
    icon: 'color-palette-outline',
    color: COLORS.orange,
    background: '#FFF2E2',
    route: '/settings/appearance',
  },
  {
    title: 'Notifications',
    subtitle: 'Manage reminders and notifications',
    icon: 'notifications-outline',
    color: COLORS.green,
    background: '#E7F8F0',
    route: '/settings/notifications',
  },
  {
    title: 'Data Management',
    subtitle: 'Export, backup, and manage your data',
    icon: 'server-outline',
    color: COLORS.red,
    background: '#FDECEF',
    route: '/settings/data-management',
  },
  {
    title: 'Security',
    subtitle: 'Protect your app and financial data',
    icon: 'shield-checkmark-outline',
    color: COLORS.purple,
    background: '#F0EDFF',
    route: '/settings/security',
  },
  {
    title: 'About RupeeTrack',
    subtitle: 'App information and version details',
    icon: 'information-circle-outline',
    color: '#66758A',
    background: '#EDF1F6',
    route: '/settings/about',
  },
];

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>PERSONALIZE YOUR APP</Text>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>
              Manage your account and preferences.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="settings-outline"
              size={24}
              color={COLORS.purple}
            />
          </View>
        </View>

        {/* Settings section */}
        <Text style={styles.sectionTitle}>PREFERENCES</Text>

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
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color="#AAB1BF"
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.purple,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },

  title: {
    color: COLORS.navy,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#EFEDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  sectionTitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 12,
    marginLeft: 3,
  },

  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '700',
  },

  itemSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 15,
  },

  separator: {
    height: 1,
    backgroundColor: '#F0F1F5',
    marginLeft: 57,
  },
});
