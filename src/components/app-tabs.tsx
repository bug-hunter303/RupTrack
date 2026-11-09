
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const NAV_ITEMS = [
  { name: 'index', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'analytics', label: 'Analytics', icon: 'pie-chart-outline', activeIcon: 'pie-chart' },
  { name: 'budget', label: 'Budget', icon: 'wallet-outline', activeIcon: 'wallet' },
  { name: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
] as const;

function BottomNavigation({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  function openScreen(screen: 'income' | 'expense') {
    setMenuVisible(false);
    router.push(`/${screen}`);
  }

  return (
    <>
      <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.tabBar}>
          {NAV_ITEMS.slice(0, 2).map((item) => {
            const focused = state.routes[state.index]?.name === item.name;

            return (
              <Pressable
                key={item.name}
                style={styles.tab}
                onPress={() => navigation.navigate(item.name)}
              >
                <Ionicons
                  name={focused ? item.activeIcon : item.icon}
                  size={23}
                  color={focused ? '#1687FF' : '#858995'}
                />
                <Text style={[styles.tabLabel, focused && styles.activeLabel]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}

          <View style={styles.addSpacer} />

          <Pressable
            style={styles.addButton}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="add" size={29} color="#FFFFFF" />
          </Pressable>

          {NAV_ITEMS.slice(2).map((item) => {
            const focused = state.routes[state.index]?.name === item.name;

            return (
              <Pressable
                key={item.name}
                style={styles.tab}
                onPress={() => navigation.navigate(item.name)}
              >
                <Ionicons
                  name={focused ? item.activeIcon : item.icon}
                  size={23}
                  color={focused ? '#1687FF' : '#858995'}
                />
                <Text style={[styles.tabLabel, focused && styles.activeLabel]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalBackground}
          onPress={() => setMenuVisible(false)}
        >
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <View style={styles.handle} />

            <Text style={styles.menuTitle}>Add to RupeeTrack</Text>
            <Text style={styles.menuSubtitle}>
              What would you like to add?
            </Text>

            <Pressable
              style={styles.option}
              onPress={() => openScreen('income')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#E0F7EB' }]}>
                <Ionicons name="trending-up" size={25} color="#16A36A" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Add Income</Text>
                <Text style={styles.optionDescription}>
                  Salary or extra money
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9296A0" />
            </Pressable>

            <Pressable
              style={styles.option}
              onPress={() => openScreen('expense')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#FCE8E8' }]}>
                <Ionicons name="receipt-outline" size={25} color="#E34D4D" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Add Expense</Text>
                <Text style={styles.optionDescription}>
                  Create a bill and add your expenses
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9296A0" />
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <BottomNavigation {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#F7F8FA' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="budget" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="add" options={{ href: null }} />
      <Tabs.Screen name="income" options={{ href: null }} />
      <Tabs.Screen name="expense" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: -4 },
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
    color: '#858995',
  },
  activeLabel: {
    color: '#1687FF',
    fontWeight: '600',
  },
  addButton: {
    position: 'absolute',
    alignSelf: 'center',
    top: -22,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#6256F5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6256F5',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 9,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#D9DCE3',
    alignSelf: 'center',
    marginBottom: 22,
  },
  menuTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#171B28',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#858995',
    marginTop: 6,
    marginBottom: 20,
  },
  option: {
    backgroundColor: '#F8F9FB',
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
    color: '#171B28',
  },
  optionDescription: {
    fontSize: 12,
    color: '#858995',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 13,
    marginTop: 2,
  },
  cancelText: {
    color: '#777D89',
    fontSize: 14,
    fontWeight: '600',
  },
});
