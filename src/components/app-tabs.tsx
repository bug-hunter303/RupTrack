import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter, usePathname } from 'expo-router';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

import { useAppearance } from '@/context/appearance-context';

const NAV_ITEMS = [
  {
    name: '/',
    label: 'Home',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  {
    name: '/analytics',
    label: 'Analytics',
    icon: 'pie-chart-outline',
    activeIcon: 'pie-chart',
  },
  {
    name: '/budget',
    label: 'Budget',
    icon: 'wallet-outline',
    activeIcon: 'wallet',
  },
  {
    name: '/settings',
    label: 'Settings',
    icon: 'settings-outline',
    activeIcon: 'settings',
  },
] as const;

function BottomNavigation() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const { colors, accent, isDark } = useAppearance();

  const [menuVisible, setMenuVisible] = useState(false);

  function openScreen(screen: 'income' | 'expense') {
    setMenuVisible(false);
    router.push(`/${screen}`);
  }

  function navigateTo(path: string) {
    router.navigate(path as never);
  }

  return (
    <>
      <View
        style={[
          styles.tabBarWrapper,
          {
            backgroundColor: colors.tabBar,
            paddingBottom: Math.max(insets.bottom, 10),
            shadowColor: isDark ? '#000000' : '#172033',
          },
        ]}
      >
        <View style={styles.tabBar}>
          {NAV_ITEMS.slice(0, 2).map((item) => {
            const focused =
              item.name === '/'
                ? pathname === '/'
                : pathname.startsWith(item.name);

            return (
              <Pressable
                key={item.name}
                style={styles.tab}
                onPress={() => navigateTo(item.name)}
              >
                <Ionicons
                  name={focused ? item.activeIcon : item.icon}
                  size={23}
                  color={focused ? accent.primary : colors.muted}
                />

                <Text
                  style={[
                    styles.tabLabel,
                    { color: colors.muted },
                    focused && {
                      color: accent.primary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}

          <View style={styles.addSpacer} />

          <Pressable
            style={[
              styles.addButton,
              {
                backgroundColor: accent.primary,
                shadowColor: accent.primary,
              },
            ]}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="add" size={29} color="#FFFFFF" />
          </Pressable>

          {NAV_ITEMS.slice(2).map((item) => {
            const focused = pathname.startsWith(item.name);

            return (
              <Pressable
                key={item.name}
                style={styles.tab}
                onPress={() => navigateTo(item.name)}
              >
                <Ionicons
                  name={focused ? item.activeIcon : item.icon}
                  size={23}
                  color={focused ? accent.primary : colors.muted}
                />

                <Text
                  style={[
                    styles.tabLabel,
                    { color: colors.muted },
                    focused && {
                      color: accent.primary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Add Income / Expense popup */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalBackground}
          onPress={() => setMenuVisible(false)}
        >
          <Pressable
            style={[
              styles.menuCard,
              { backgroundColor: colors.surface },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View
              style={[
                styles.handle,
                { backgroundColor: colors.border },
              ]}
            />

            <Text
              style={[
                styles.menuTitle,
                { color: colors.text },
              ]}
            >
              Add to RupeeTrack
            </Text>

            <Text
              style={[
                styles.menuSubtitle,
                { color: colors.muted },
              ]}
            >
              What would you like to add?
            </Text>

            {/* Add Income */}
            <Pressable
              style={[
                styles.option,
                { backgroundColor: colors.input },
              ]}
              onPress={() => openScreen('income')}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? '#17382C'
                      : '#E0F7EB',
                  },
                ]}
              >
                <Ionicons
                  name="trending-up"
                  size={25}
                  color="#16A36A"
                />
              </View>

              <View style={styles.optionText}>
                <Text
                  style={[
                    styles.optionTitle,
                    { color: colors.text },
                  ]}
                >
                  Add Income
                </Text>

                <Text
                  style={[
                    styles.optionDescription,
                    { color: colors.muted },
                  ]}
                >
                  Salary or extra money
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.muted}
              />
            </Pressable>

            {/* Add Expense */}
            <Pressable
              style={[
                styles.option,
                { backgroundColor: colors.input },
              ]}
              onPress={() => openScreen('expense')}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? '#3A2529'
                      : '#FCE8E8',
                  },
                ]}
              >
                <Ionicons
                  name="receipt-outline"
                  size={25}
                  color="#E34D4D"
                />
              </View>

              <View style={styles.optionText}>
                <Text
                  style={[
                    styles.optionTitle,
                    { color: colors.text },
                  ]}
                >
                  Add Expense
                </Text>

                <Text
                  style={[
                    styles.optionDescription,
                    { color: colors.muted },
                  ]}
                >
                  Create a bill and add your expenses
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.muted}
              />
            </Pressable>

            {/* Cancel */}
            <Pressable
              style={styles.cancelButton}
              onPress={() => setMenuVisible(false)}
            >
              <Text
                style={[
                  styles.cancelText,
                  { color: colors.muted },
                ]}
              >
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function AppTabs() {
  const { colors } = useAppearance();

  return (
    <Tabs
      tabBar={() => <BottomNavigation />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="budget" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    paddingTop: 10,
    paddingHorizontal: 8,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 12,
  },

  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 52,
  },

  addSpacer: {
    width: 51,
  },

  tabLabel: {
    fontSize: 10,
  },

  addButton: {
    position: 'absolute',
    alignSelf: 'center',
    top: -22,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 9,
  },

  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  menuCard: {
    width: '100%',
    maxWidth: 380,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    borderRadius: 25,
  },

  handle: {
    width: 42,
    height: 5,
    borderRadius: 5,
    alignSelf: 'center',
    marginBottom: 22,
  },

  menuTitle: {
    fontSize: 21,
    fontWeight: '700',
  },

  menuSubtitle: {
    fontSize: 13,
    marginTop: 6,
    marginBottom: 20,
  },

  option: {
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 13,
  },

  iconBox: {
    width: 47,
    height: 47,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionText: {
    flex: 1,
    gap: 5,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },

  optionDescription: {
    fontSize: 12,
  },

  cancelButton: {
    alignItems: 'center',
    padding: 13,
    marginTop: 2,
  },

  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
