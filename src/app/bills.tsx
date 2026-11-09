
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SavedBill = {
  id: number;
  name: string;
  date: string;
  total: number;
  is_locked: number;
  item_count: number;
};

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMoney(value: number) {
  return `Rs. ${Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

export default function BillsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [bills, setBills] = useState<SavedBill[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBills = useCallback(async () => {
    try {
      const result = await db.getAllAsync<SavedBill>(`
        SELECT
          bills.id,
          bills.name,
          bills.date,
          bills.total,
          bills.is_locked,
          COUNT(bill_items.id) AS item_count
        FROM bills
        LEFT JOIN bill_items
          ON bills.id = bill_items.bill_id
        GROUP BY bills.id
        ORDER BY bills.date DESC, bills.id DESC
      `);

      setBills(result);
    } catch (error) {
      console.error('Could not load bills:', error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadBills();
    }, [loadBills])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#172033" />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>SAVED BILLS</Text>
            <Text style={styles.headerSubtitle}>
              All your expenses in one place
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="receipt-outline" size={23} color="#6256F5" />
          </View>
        </View>

        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryLabel}>TOTAL BILLS</Text>
            <Text style={styles.summaryCount}>{bills.length}</Text>
          </View>

          <View style={styles.summaryIcon}>
            <Ionicons name="documents-outline" size={25} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.listHeading}>
          <Text style={styles.listTitle}>Your records</Text>
          <Text style={styles.listSubtitle}>Newest first</Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#6256F5"
            style={{ marginTop: 45 }}
          />
        ) : bills.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="receipt-outline"
                size={34}
                color="#6256F5"
              />
            </View>

            <Text style={styles.emptyTitle}>No bills yet</Text>
            <Text style={styles.emptyDescription}>
              Your saved expense bills will appear here.
              Create your first bill to get started.
            </Text>

            <Pressable
              style={styles.emptyButton}
              onPress={() => router.back()}
            >
              <Text style={styles.emptyButtonText}>BACK TO EXPENSE</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.billList}
          >
            {bills.map((bill) => (
              <Pressable
                key={bill.id}
                style={styles.billCard}
                onPress={() =>
                  router.push({
                    pathname: '/expense',
                    params: { id: String(bill.id) },
                  })
                }
              >
                <View style={styles.billIcon}>
                  <Ionicons
                    name="receipt-outline"
                    size={22}
                    color="#6256F5"
                  />
                </View>

                <View style={styles.billInfo}>
                  <Text style={styles.billName} numberOfLines={1}>
                    {bill.name}
                  </Text>

                  <Text style={styles.billMeta}>
                    {formatDate(bill.date)} · {bill.item_count} items
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      bill.is_locked === 1
                        ? styles.lockedBadge
                        : styles.editableBadge,
                    ]}
                  >
                    <Ionicons
                      name={
                        bill.is_locked === 1
                          ? 'lock-closed'
                          : 'create-outline'
                      }
                      size={11}
                      color={
                        bill.is_locked === 1 ? '#16865B' : '#6256F5'
                      }
                    />

                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            bill.is_locked === 1
                              ? '#16865B'
                              : '#6256F5',
                        },
                      ]}
                    >
                      {bill.is_locked === 1 ? 'LOCKED' : 'EDITABLE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.billRight}>
                  <Text style={styles.billTotal}>
                    {formatMoney(bill.total)}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#A0A5B1"
                  />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 25,
  },
  backButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: '#172033',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#858B99',
    fontSize: 12,
    marginTop: 3,
  },
  headerIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#EFEDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    backgroundColor: '#172B50',
    borderRadius: 20,
    padding: 21,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  summaryLabel: {
    color: '#B9C9E3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  summaryCount: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
    marginTop: 5,
  },
  summaryIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  listTitle: {
    color: '#172033',
    fontSize: 18,
    fontWeight: '800',
  },
  listSubtitle: {
    color: '#858B99',
    fontSize: 11,
  },
  billList: {
    paddingBottom: 30,
    gap: 12,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  billIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#EFEDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    color: '#172033',
    fontSize: 14,
    fontWeight: '800',
  },
  billMeta: {
    color: '#858B99',
    fontSize: 10,
    marginTop: 5,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  lockedBadge: {
    backgroundColor: '#E6F7EE',
  },
  editableBadge: {
    backgroundColor: '#EFEDFF',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  billRight: {
    alignItems: 'flex-end',
    gap: 9,
  },
  billTotal: {
    color: '#172033',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingTop: 65,
  },
  emptyIcon: {
    width: 75,
    height: 75,
    borderRadius: 24,
    backgroundColor: '#EFEDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    color: '#172033',
    fontSize: 19,
    fontWeight: '800',
  },
  emptyDescription: {
    color: '#858B99',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  emptyButton: {
    backgroundColor: '#6256F5',
    borderRadius: 13,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 22,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
