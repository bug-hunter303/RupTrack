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

type IncomeEntry = {
  id: number;
  description: string;
  amount: number;
  type: 'salary' | 'additional';
  date: string;
};

const GREEN = '#16A673';
const NAVY = '#17233D';

function money(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

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

  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);

    try {
      const result = await db.getAllAsync<IncomeEntry>(
        `SELECT id, description, amount, type, date
         FROM income
         ORDER BY date DESC, id DESC`
      );

      setEntries(result);
    } catch (error) {
      console.error('Income history error:', error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const total = entries.reduce((sum, item) => sum + item.amount, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={NAVY} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Income History</Text>
          <Text style={styles.subtitle}>All your recorded earnings</Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons name="trending-up" size={22} color={GREEN} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOTAL RECORDED INCOME</Text>
          <Text style={styles.summaryAmount}>{money(total)}</Text>
          <Text style={styles.summaryFootnote}>
            {entries.length} income {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>All transactions</Text>

        <View style={styles.listCard}>
          {loading ? (
            <ActivityIndicator
              color={GREEN}
              style={{ padding: 30 }}
              size="large"
            />
          ) : entries.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="wallet-outline"
                size={35}
                color="#A0A6B4"
              />
              <Text style={styles.emptyTitle}>No income yet</Text>
              <Text style={styles.emptyText}>
                Your salary and additional income will appear here.
              </Text>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/income')}
              >
                <Text style={styles.addButtonText}>ADD INCOME</Text>
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
                    color={GREEN}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.entryTitle}>
                    {entry.description}
                  </Text>
                  <Text style={styles.entrySubtitle}>
                    {displayDate(entry.date)}
                    {entry.type === 'salary' ? ' · Monthly salary' : ''}
                  </Text>
                </View>

                <Text style={styles.amount}>
                  +{money(entry.amount)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F6FA',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: NAVY,
  },
  subtitle: {
    color: '#8B93A7',
    fontSize: 11,
    marginTop: 4,
  },
  headerIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#E5F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 35,
  },
  summaryCard: {
    backgroundColor: NAVY,
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
  sectionTitle: {
    color: NAVY,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 13,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ECEEF4',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F5',
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#E5F7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryTitle: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '700',
  },
  entrySubtitle: {
    color: '#8B93A7',
    fontSize: 10,
    marginTop: 5,
  },
  amount: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 35,
    paddingHorizontal: 15,
  },
  emptyTitle: {
    color: NAVY,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyText: {
    color: '#8B93A7',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 17,
  },
  addButton: {
    backgroundColor: GREEN,
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
