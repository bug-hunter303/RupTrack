
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAppearance } from '@/context/appearance-context';

type IncomeEntry = {
  id: number;
  description: string;
  amount: number;
  type: 'salary' | 'additional';
  date: string;
};

function displayDate(date: string) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00`)
    : new Date(date);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function IncomeHistoryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const { colors, accent, isDark, formatMoney } = useAppearance();
  const styles = createStyles(colors, accent.primary, isDark);

  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setLoadError(false);

    try {
      const result = await db.getAllAsync<IncomeEntry>(
        `SELECT id, description, amount, type, date
         FROM income
         ORDER BY date DESC, id DESC`
      );

      setEntries(result);
    } catch (error) {
      console.error('Income history error:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory])
  );

  const total = entries.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.title}>Income History</Text>
          <Text style={styles.subtitle}>
            All your recorded earnings
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="trending-up"
            size={22}
            color={accent.primary}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            TOTAL RECORDED INCOME
          </Text>

          <Text style={styles.summaryAmount}>
            {formatMoney(total)}
          </Text>

          <Text style={styles.summaryFootnote}>
            {entries.length} income{' '}
            {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>
            All transactions
          </Text>
          <Text style={styles.sectionCount}>
            {entries.length} RECORDS
          </Text>
        </View>

        <View style={styles.listCard}>
          {loading ? (
            <ActivityIndicator
              color={accent.primary}
              style={styles.loader}
              size="large"
            />
          ) : loadError ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="alert-circle-outline"
                  size={35}
                  color="#D65353"
                />
              </View>

              <Text style={styles.emptyTitle}>
                Couldn't load income
              </Text>

              <Text style={styles.emptyText}>
                Something went wrong while loading your income records.
                Please try again.
              </Text>

              <TouchableOpacity
                style={styles.addButton}
                onPress={loadHistory}
              >
                <Text style={styles.addButtonText}>
                  TRY AGAIN
                </Text>
              </TouchableOpacity>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="wallet-outline"
                  size={35}
                  color={accent.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No income yet
              </Text>

              <Text style={styles.emptyText}>
                Your salary and additional income will appear here.
              </Text>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/income')}
              >
                <Text style={styles.addButtonText}>
                  ADD INCOME
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            entries.map((entry, index) => (
              <View
                key={entry.id}
                style={[
                  styles.row,
                  index !== entries.length - 1 && styles.rowBorder,
                ]}
              >
                <View style={styles.entryIcon}>
                  <Ionicons
                    name={
                      entry.type === 'salary'
                        ? 'briefcase-outline'
                        : 'cash-outline'
                    }
                    size={20}
                    color={accent.primary}
                  />
                </View>

                <View style={styles.entryInfo}>
                  <Text style={styles.entryTitle}>
                    {entry.description}
                  </Text>

                  <Text style={styles.entrySubtitle}>
                    {displayDate(entry.date)}
                    {entry.type === 'salary'
                      ? ' · Monthly salary'
                      : ''}
                  </Text>
                </View>

                <Text style={styles.amount}>
                  +{formatMoney(entry.amount)}
                </Text>
              </View>
            ))
          )}
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
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
      gap: 13,
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
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 21,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 4,
    },
    headerIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor: isDark ? '#18372E' : '#E5F7EF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      padding: 20,
      paddingBottom: 35,
    },
    summaryCard: {
      backgroundColor: isDark ? '#222C40' : '#17233D',
      borderRadius: 21,
      padding: 22,
      marginBottom: 27,
    },
    summaryLabel: {
      color: '#C7CDDA',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
    },
    summaryAmount: {
      color: '#FFFFFF',
      fontSize: 30,
      fontWeight: '800',
      marginTop: 15,
    },
    summaryFootnote: {
      color: '#AEB8CB',
      fontSize: 11,
      marginTop: 6,
    },
    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 13,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    sectionCount: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    listCard: {
      backgroundColor: colors.surface,
      borderRadius: 19,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loader: {
      padding: 30,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingVertical: 16,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    entryIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: isDark ? '#18372E' : '#E5F7EF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    entryInfo: {
      flex: 1,
    },
    entryTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    entrySubtitle: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 5,
    },
    amount: {
      color: '#16A673',
      fontSize: 12,
      fontWeight: '800',
    },
    empty: {
      alignItems: 'center',
      paddingVertical: 35,
      paddingHorizontal: 15,
    },
    emptyIcon: {
      width: 65,
      height: 65,
      borderRadius: 21,
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      marginTop: 12,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 7,
      lineHeight: 17,
    },
    addButton: {
      backgroundColor: primary,
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 18,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 11,
    },
  });
}
