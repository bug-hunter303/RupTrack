import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { StatusBar } from 'expo-status-bar';

type Bill = {
  id: number;
  name: string;
  date: string;
  total: number;
};

type IncomeEntry = {
  id: number;
  description: string;
  amount: number;
  date: string;
  type: 'salary' | 'additional';
};

type Transaction = {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  type: 'income' | 'expense';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  sortDate: number;
};

type SpendingDay = {
  day: string;
  amount: number;
  height: number;
};

function money(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

// Supports both YYYY-MM-DD and dates such as 09 Nov 2026.
function parseStoredDate(value: string): Date {
  if (!value) return new Date(0);

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3])
    );
  }

  const displayMatch = value.match(
    /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/
  );

  if (displayMatch) {
    const day = Number(displayMatch[1]);
    const monthText = displayMatch[2].slice(0, 3).toLowerCase();
    const year = Number(displayMatch[3]);

    const months = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    ];

    const month = months.indexOf(monthText);

    if (month !== -1) {
      return new Date(year, month, day);
    }
  }

  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date(0);
}

function formatShortDate(value: string) {
  const date = parseStoredDate(value);

  if (date.getTime() === 0) return value;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {action && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={styles.actionText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [spendingData, setSpendingData] = useState<SpendingDay[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      // Check whether this month's salary needs to be credited.
      const salarySettings = await db.getFirstAsync<{
        amount: number;
        credit_day: number;
        enabled: number;
      }>(
        `SELECT amount, credit_day, enabled
         FROM salary_settings
         WHERE id = 1`
      );

      if (
        salarySettings &&
        salarySettings.enabled === 1 &&
        salarySettings.amount > 0
      ) {
        const today = new Date();

        if (today.getDate() >= salarySettings.credit_day) {
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const periodKey = `salary-${year}-${month}`;

          const lastDay = new Date(
            year,
            today.getMonth() + 1,
            0
          ).getDate();

          const creditDay = Math.min(
            salarySettings.credit_day,
            lastDay
          );

          const creditDate =
            `${year}-${month}-${String(creditDay).padStart(2, '0')}`;

          await db.runAsync(
            `INSERT OR IGNORE INTO income
              (description, amount, type, date, period_key)
             VALUES (?, ?, 'salary', ?, ?)`,
            'Monthly Salary',
            salarySettings.amount,
            creditDate,
            periodKey
          );
        }
      }

      // Load all income entries.
      const incomeRows = await db.getAllAsync<IncomeEntry>(
        `SELECT id, description, amount, date, type
         FROM income
         ORDER BY id DESC`
      );

      // Load all saved expense bills.
      const billRows = await db.getAllAsync<Bill>(
        `SELECT id, name, date, total
         FROM bills
         ORDER BY id DESC`
      );

      // Calculate totals from SQLite.
      const incomeTotal = incomeRows.reduce(
        (sum, entry) => sum + Number(entry.amount || 0),
        0
      );

      const expenseTotal = billRows.reduce(
        (sum, bill) => sum + Number(bill.total || 0),
        0
      );

      setTotalIncome(incomeTotal);
      setTotalExpenses(expenseTotal);

      // Combine income and expense entries.
      const combined: Transaction[] = [
        ...incomeRows.map((entry) => ({
          id: `income-${entry.id}`,
          title: entry.description,
          subtitle:
            `${entry.type === 'salary' ? 'Monthly salary' : 'Additional income'} · ${formatShortDate(entry.date)}`,
          amount: Number(entry.amount || 0),
          type: 'income' as const,
          icon: (
            entry.type === 'salary'
              ? 'briefcase-outline'
              : 'cash-outline'
          ) as keyof typeof Ionicons.glyphMap,
          color: '#16A673',
          sortDate: parseStoredDate(entry.date).getTime(),
        })),

        ...billRows.map((bill) => ({
          id: `bill-${bill.id}`,
          title: bill.name,
          subtitle: `Expense bill · ${formatShortDate(bill.date)}`,
          amount: Number(bill.total || 0),
          type: 'expense' as const,
          icon: 'receipt-outline' as keyof typeof Ionicons.glyphMap,
          color: '#E34D4D',
          sortDate: parseStoredDate(bill.date).getTime(),
        })),
      ];

      combined.sort((a, b) => {
        if (b.sortDate !== a.sortDate) {
          return b.sortDate - a.sortDate;
        }

        return b.id.localeCompare(a.id);
      });

      setTransactions(combined.slice(0, 5));

      // Build the spending chart for the last seven calendar days.
      const today = new Date();
      const days: SpendingDay[] = [];
      const amounts: number[] = [];

      for (let offset = 6; offset >= 0; offset--) {
        const date = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - offset
        );

        const dayAmount = billRows.reduce((sum, bill) => {
          const billDate = parseStoredDate(bill.date);

          const sameDay =
            billDate.getTime() !== 0 &&
            billDate.getFullYear() === date.getFullYear() &&
            billDate.getMonth() === date.getMonth() &&
            billDate.getDate() === date.getDate();

          return sameDay
            ? sum + Number(bill.total || 0)
            : sum;
        }, 0);

        amounts.push(dayAmount);

        days.push({
          day: date.toLocaleDateString('en-US', {
            weekday: 'short',
          }),
          amount: dayAmount,
          height: 0,
        });
      }

      const maxAmount = Math.max(...amounts, 1);

      const chartDays = days.map((item) => ({
        ...item,
        height:
          item.amount === 0
            ? 4
            : Math.max(8, (item.amount / maxAmount) * 125),
      }));

      setSpendingData(chartDays);
    } catch (error) {
      console.error('Dashboard loading error:', error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  // Reload the dashboard every time Home becomes active.
  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  const balance = totalIncome - totalExpenses;

  const maximumChartAmount = Math.max(
    ...spendingData.map((item) => item.amount),
    1
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>RupTrack</Text>

          <Pressable
            style={styles.notificationButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons
              name="settings-outline"
              size={23}
              color="#777D89"
            />
          </Pressable>
        </View>

        {/* Balance Card */}
        <LinearGradient
          colors={['#58B8FF', '#0870E9', '#0759D5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceTop}>
            <View style={styles.balanceLabelRow}>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Ionicons
                name="eye-outline"
                size={17}
                color="#FFFFFF"
              />
            </View>

            <Pressable
              style={styles.cardArrow}
              onPress={() => router.push('/income-history')}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
              size="large"
              style={{
                alignSelf: 'flex-start',
                marginVertical: 15,
              }}
            />
          ) : (
            <Text style={styles.balanceAmount}>
              {money(balance)}
            </Text>
          )}

          <View style={styles.balanceDetails}>
            <View style={styles.balanceColumn}>
              <Text style={styles.detailLabel}>Income</Text>
              <Text style={styles.detailAmount}>
                {money(totalIncome)}
              </Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.balanceColumn}>
              <Text style={styles.detailLabel}>Expenses</Text>
              <Text style={styles.detailAmount}>
                {money(totalExpenses)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Spending Overview */}
        <View style={styles.spendingSection}>
          <SectionHeading title="Spending Overview" />

          <View style={styles.chartHeader}>
            <Text style={styles.chartPeriod}>Last 7 days</Text>

            <View style={styles.periodSelector}>
              <Text style={styles.periodText}>Last 7 days</Text>
              <Ionicons
                name="calendar-outline"
                size={14}
                color="#777D89"
              />
            </View>
          </View>

          <View style={styles.chart}>
            <View style={styles.yAxis}>
              {[1, 0.75, 0.5, 0.25, 0].map((fraction, index) => (
                <Text key={index} style={styles.axisLabel}>
                  {money(maximumChartAmount * fraction)}
                </Text>
              ))}
            </View>

            <View style={styles.chartContent}>
              <View style={styles.gridLines}>
                {[0, 1, 2, 3, 4].map((line) => (
                  <View key={line} style={styles.gridLine} />
                ))}
              </View>

              <View style={styles.bars}>
                {spendingData.map((item, index) => (
                  <View
                    key={`${item.day}-${index}`}
                    style={styles.barColumn}
                  >
                    <View
                      style={[
                        styles.bar,
                        { height: item.height },
                        item.amount === 0 && styles.emptyBar,
                      ]}
                    />
                    <Text style={styles.dayLabel}>
                      {item.day}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {!loading &&
          spendingData.every((item) => item.amount === 0) ? (
            <Text style={styles.noSpending}>
              No expenses recorded in the last 7 days.
            </Text>
          ) : null}
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <SectionHeading
            title="Recent Transactions"
            action="Income History"
            onAction={() => router.push('/income-history')}
          />

          <View style={styles.transactionsCard}>
            {loading ? (
              <ActivityIndicator
                color="#1687FF"
                style={{ padding: 25 }}
              />
            ) : transactions.length === 0 ? (
              <View style={styles.emptyTransactions}>
                <Ionicons
                  name="receipt-outline"
                  size={30}
                  color="#A0A6B4"
                />
                <Text style={styles.emptyTitle}>
                  No transactions yet
                </Text>
                <Text style={styles.emptySubtitle}>
                  Your income and expense bills will appear here.
                </Text>
              </View>
            ) : (
              transactions.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.transactionRow,
                    index !== transactions.length - 1 &&
                      styles.transactionBorder,
                  ]}
                >
                  <View
                    style={[
                      styles.transactionIcon,
                      { backgroundColor: item.color },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={19}
                      color="#FFFFFF"
                    />
                  </View>

                  <View style={styles.transactionInfo}>
                    <Text
                      style={styles.transactionTitle}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>

                    <Text style={styles.transactionSubtitle}>
                      {item.subtitle}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.transactionAmount,
                      item.type === 'income' &&
                        styles.incomeAmount,
                    ]}
                  >
                    {item.type === 'income' ? '+' : '-'}
                    {money(item.amount)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 25 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  scrollContent: {
    paddingHorizontal: 19,
    paddingBottom: 22,
  },
  header: {
    height: 61,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: 23,
    fontWeight: '800',
    color: '#151925',
    letterSpacing: -0.8,
  },
  notificationButton: {
    padding: 5,
    position: 'relative',
  },
  balanceCard: {
    minHeight: 197,
    borderRadius: 21,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#0870E9',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 7,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  balanceLabel: {
    color: '#EAF5FF',
    fontSize: 13,
  },
  cardArrow: {
    width: 33,
    height: 33,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1,
    marginTop: 2,
  },
  balanceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  balanceColumn: {
    flex: 1,
    gap: 7,
  },
  detailLabel: {
    color: '#D8EBFF',
    fontSize: 12,
  },
  detailAmount: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  verticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginRight: 28,
  },
  spendingSection: {
    marginTop: 31,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171B28',
  },
  actionText: {
    color: '#0877F9',
    fontSize: 12,
    fontWeight: '500',
  },
  chartHeader: {
    position: 'absolute',
    right: 0,
    top: -4,
  },
  chartPeriod: {
    display: 'none',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E9EBEF',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#F7F8FA',
  },
  periodText: {
    fontSize: 11,
    color: '#747986',
  },
  chart: {
    height: 210,
    flexDirection: 'row',
    marginTop: 4,
  },
  yAxis: {
    width: 57,
    justifyContent: 'space-between',
    paddingBottom: 25,
    paddingTop: 1,
  },
  axisLabel: {
    fontSize: 8,
    color: '#8A8F99',
  },
  chartContent: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 25,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: '#E9EBEF',
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    gap: 7,
  },
  bar: {
    width: 18,
    maxHeight: 128,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: '#1687F5',
  },
  emptyBar: {
    opacity: 0.25,
  },
  dayLabel: {
    fontSize: 10,
    color: '#858995',
    height: 17,
  },
  noSpending: {
    fontSize: 11,
    color: '#9296A0',
    marginTop: 5,
  },
  transactionsSection: {
    marginTop: 22,
  },
  transactionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    paddingHorizontal: 10,
  },
  transactionRow: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 9,
  },
  transactionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF2',
  },
  transactionIcon: {
    width: 35,
    height: 35,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
    gap: 4,
  },
  transactionTitle: {
    color: '#171B28',
    fontSize: 11,
    fontWeight: '600',
  },
  transactionSubtitle: {
    color: '#9296A0',
    fontSize: 10,
  },
  transactionAmount: {
    color: '#E34D4D',
    fontSize: 10,
    fontWeight: '700',
  },
  incomeAmount: {
    color: '#16A36A',
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 27,
    paddingHorizontal: 15,
  },
  emptyTitle: {
    color: '#171B28',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    color: '#9296A0',
    fontSize: 10,
    marginTop: 5,
    textAlign: 'center',
  },
});
