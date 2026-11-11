import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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

type HomeGoal = {
  id: number;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  is_completed: number;
  completed_at: string | null;
};

type AppNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  goal_id: number | null;
  created_at: string;
  is_read: number;
};

function money(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

function parseStoredDate(value: string): Date {
  if (!value) return new Date(0);

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (iso) {
    return new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3])
    );
  }

  const display = value.match(
    /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/
  );

  if (display) {
    const months = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ];

    const month = months.indexOf(
      display[2].slice(0, 3).toLowerCase()
    );

    if (month >= 0) {
      return new Date(
        Number(display[3]),
        month,
        Number(display[1])
      );
    }
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? new Date(0)
    : parsed;
}

function formatShortDate(value: string) {
  const date = parseStoredDate(value);

  if (!date.getTime()) return value;

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
  const [transactions, setTransactions] = useState<
    Transaction[]
  >([]);
  const [spendingData, setSpendingData] = useState<
    SpendingDay[]
  >([]);
  const [notifications, setNotifications] = useState<
    AppNotification[]
  >([]);
  const [activeGoals, setActiveGoals] = useState<HomeGoal[]>(
    []
  );
  const [completedGoals, setCompletedGoals] = useState<
    HomeGoal[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [notificationsVisible, setNotificationsVisible] =
    useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const salary = await db.getFirstAsync<{
        amount: number;
        credit_day: number;
        enabled: number;
      }>(
        `SELECT amount, credit_day, enabled
         FROM salary_settings
         WHERE id = 1`
      );

      if (
        salary &&
        salary.enabled === 1 &&
        salary.amount > 0
      ) {
        const today = new Date();

        if (today.getDate() >= salary.credit_day) {
          const year = today.getFullYear();
          const month = String(
            today.getMonth() + 1
          ).padStart(2, '0');

          const lastDay = new Date(
            year,
            today.getMonth() + 1,
            0
          ).getDate();

          const creditDay = Math.min(
            salary.credit_day,
            lastDay
          );

          const creditDate = `${year}-${month}-${String(
            creditDay
          ).padStart(2, '0')}`;

          await db.runAsync(
            `INSERT OR IGNORE INTO income
             (description, amount, type, date, period_key)
             VALUES (?, ?, 'salary', ?, ?)`,
            'Monthly Salary',
            salary.amount,
            creditDate,
            `salary-${year}-${month}`
          );
        }
      }

      const incomeRows =
        await db.getAllAsync<IncomeEntry>(
          `SELECT id, description, amount, date, type
           FROM income
           ORDER BY id DESC`
        );

      const billRows = await db.getAllAsync<Bill>(
        `SELECT id, name, date, total
         FROM bills
         ORDER BY id DESC`
      );

      setTotalIncome(
        incomeRows.reduce(
          (sum, item) =>
            sum + Number(item.amount || 0),
          0
        )
      );

      setTotalExpenses(
        billRows.reduce(
          (sum, item) =>
            sum + Number(item.total || 0),
          0
        )
      );

      const combined: Transaction[] = [
        ...incomeRows.map((entry) => ({
          id: `income-${entry.id}`,
          title: entry.description,
          subtitle: `${
            entry.type === 'salary'
              ? 'Monthly salary'
              : 'Additional income'
          } · ${formatShortDate(entry.date)}`,
          amount: Number(entry.amount || 0),
          type: 'income' as const,
          icon: (
            entry.type === 'salary'
              ? 'briefcase-outline'
              : 'cash-outline'
          ) as keyof typeof Ionicons.glyphMap,
          color: '#16A673',
          sortDate: parseStoredDate(
            entry.date
          ).getTime(),
        })),

        ...billRows.map((bill) => ({
          id: `bill-${bill.id}`,
          title: bill.name,
          subtitle: `Expense bill · ${formatShortDate(
            bill.date
          )}`,
          amount: Number(bill.total || 0),
          type: 'expense' as const,
          icon: 'receipt-outline' as keyof typeof Ionicons.glyphMap,
          color: '#E34D4D',
          sortDate: parseStoredDate(
            bill.date
          ).getTime(),
        })),
      ];

      combined.sort(
        (a, b) =>
          b.sortDate - a.sortDate ||
          b.id.localeCompare(a.id)
      );

      setTransactions(combined.slice(0, 5));

      const today = new Date();
      const days: SpendingDay[] = [];
      const amounts: number[] = [];

      for (let offset = 6; offset >= 0; offset--) {
        const date = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - offset
        );

        const amount = billRows.reduce(
          (sum, bill) => {
            const billDate = parseStoredDate(bill.date);

            return (
              billDate.getTime() &&
              billDate.getFullYear() === date.getFullYear() &&
              billDate.getMonth() === date.getMonth() &&
              billDate.getDate() === date.getDate()
            )
              ? sum + Number(bill.total || 0)
              : sum;
          },
          0
        );

        amounts.push(amount);

        days.push({
          day: date.toLocaleDateString('en-US', {
            weekday: 'short',
          }),
          amount,
          height: 0,
        });
      }

      const maxAmount = Math.max(...amounts, 1);

      setSpendingData(
        days.map((item) => ({
          ...item,
          height:
            item.amount === 0
              ? 4
              : Math.max(
                  8,
                  (item.amount / maxAmount) * 125
                ),
        }))
      );

      // Remove completed goals after seven days.
      // Add a notification explaining the automatic removal.
      await db.runAsync(`
        INSERT INTO notifications (title, message, type, goal_id)
        SELECT 'Goal removed',
               'Your completed goal "' || name || '" was automatically removed after 7 days.',
               'goal_deleted', NULL
        FROM savings_goals
        WHERE is_completed = 1
          AND completed_at IS NOT NULL
          AND datetime(completed_at, '+7 days') <= datetime('now')
      `);

      await db.runAsync(`
        DELETE FROM savings_goals
        WHERE is_completed = 1
          AND completed_at IS NOT NULL
          AND datetime(completed_at, '+7 days') <= datetime('now')
      `);

      const notificationRows =
        await db.getAllAsync<AppNotification>(
          `SELECT id, title, message, type, goal_id,
                  created_at, is_read
           FROM notifications
           ORDER BY id DESC
           LIMIT 50`
        );

      setNotifications(notificationRows);

      const goalRows = await db.getAllAsync<HomeGoal>(
        `SELECT id, name, target_amount, saved_amount,
                target_date, is_completed, completed_at
         FROM savings_goals
         ORDER BY created_at DESC, id DESC`
      );

      setActiveGoals(
        goalRows.filter(
          (goal) => goal.is_completed !== 1
        )
      );

      setCompletedGoals(
        goalRows.filter(
          (goal) => goal.is_completed === 1
        )
      );
    } catch (error) {
      console.error(
        'Dashboard loading error:',
        error
      );
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  const openNotifications = async () => {
    setNotificationsVisible(true);

    try {
      await db.runAsync(
        'UPDATE notifications SET is_read = 1 WHERE is_read = 0'
      );

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: 1,
        }))
      );
    } catch (error) {
      console.error(
        'Could not mark notifications as read:',
        error
      );
    }
  };

  const balance = totalIncome - totalExpenses;

  const maxChart = Math.max(
    ...spendingData.map((item) => item.amount),
    1
  );

  const unreadCount = notifications.filter(
    (item) => item.is_read === 0
  ).length;

  const hiddenMoney = 'Rs. ••••••';

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>RupTrack</Text>

          <Pressable
            style={styles.notificationButton}
            onPress={openNotifications}
          >
            <Ionicons
              name="notifications-outline"
              size={23}
              color="#777D89"
            />

            {unreadCount > 0 ? (
              <View style={styles.notificationDot} />
            ) : null}
          </Pressable>
        </View>

        <LinearGradient
          colors={['#58B8FF', '#0870E9', '#0759D5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceTop}>
            <View style={styles.balanceLabelRow}>
              <Text style={styles.balanceLabel}>
                Total Balance
              </Text>

              <Pressable
                onPress={() =>
                  setBalanceVisible((value) => !value)
                }
                hitSlop={10}
              >
                <Ionicons
                  name={
                    balanceVisible
                      ? 'eye-outline'
                      : 'eye-off-outline'
                  }
                  size={19}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>

            <Pressable
              style={styles.cardArrow}
              onPress={() =>
                router.push('/income-history')
              }
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
              {balanceVisible
                ? money(balance)
                : hiddenMoney}
            </Text>
          )}

          <View style={styles.balanceDetails}>
            <View style={styles.balanceColumn}>
              <Text style={styles.detailLabel}>
                Income
              </Text>
              <Text style={styles.detailAmount}>
                {balanceVisible
                  ? money(totalIncome)
                  : hiddenMoney}
              </Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.balanceColumn}>
              <Text style={styles.detailLabel}>
                Expenses
              </Text>
              <Text style={styles.detailAmount}>
                {balanceVisible
                  ? money(totalExpenses)
                  : hiddenMoney}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Active savings goals */}
        <View style={styles.goalsSection}>
          <SectionHeading
            title="Savings Goals"
            action="View all"
            onAction={() => router.push('/budget')}
          />

          {activeGoals.length === 0 ? (
            <Pressable
              style={styles.goalEmptyCard}
              onPress={() => router.push('/budget')}
            >
              <View style={styles.goalEmptyIcon}>
                <Ionicons
                  name="flag-outline"
                  size={22}
                  color="#6256F5"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.goalCardTitle}>
                  Start a savings goal
                </Text>
                <Text style={styles.goalCardSubtitle}>
                  Give your next big plan a place to grow.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#8992A5"
              />
            </Pressable>
          ) : (
            activeGoals.slice(0, 3).map((goal) => {
              const progress =
                goal.target_amount > 0
                  ? Math.min(
                      100,
                      (goal.saved_amount /
                        goal.target_amount) *
                        100
                    )
                  : 0;

              return (
                <Pressable
                  key={goal.id}
                  style={styles.goalCard}
                  onPress={() => router.push('/budget')}
                >
                  <View style={styles.goalCardTop}>
                    <View style={styles.goalCardIcon}>
                      <Ionicons
                        name="flag-outline"
                        size={18}
                        color="#6256F5"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={styles.goalCardTitle}
                        numberOfLines={1}
                      >
                        {goal.name}
                      </Text>

                      <Text style={styles.goalCardSubtitle}>
                        {money(goal.saved_amount)} of{' '}
                        {money(goal.target_amount)}
                      </Text>
                    </View>

                    <Text style={styles.goalPercent}>
                      {Math.round(progress)}%
                    </Text>
                  </View>

                  <View style={styles.goalTrack}>
                    <View
                      style={[
                        styles.goalFill,
                        { width: `${progress}%` },
                      ]}
                    />
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Completed savings goals */}
        {completedGoals.length > 0 ? (
          <View style={styles.completedSection}>
            <SectionHeading
              title="Goals Completed"
              action="View all"
              onAction={() => router.push('/budget')}
            />

            {completedGoals.slice(0, 3).map((goal) => (
              <View
                key={goal.id}
                style={styles.completedGoalCard}
              >
                <View style={styles.completedGoalIcon}>
                  <Ionicons
                    name="trophy"
                    size={19}
                    color="#16A673"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.goalCardTitle}>
                    {goal.name}
                  </Text>
                  <Text style={styles.goalCardSubtitle}>
                    You saved {money(goal.target_amount)}.
                    Amazing work!
                  </Text>
                </View>

                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color="#16A673"
                />
              </View>
            ))}
          </View>
        ) : null}

        {/* Spending overview */}
        <View style={styles.spendingSection}>
          <SectionHeading title="Spending Overview" />

          <View style={styles.chartHeader}>
            <Text style={styles.periodText}>
              Last 7 days
            </Text>
            <Ionicons
              name="calendar-outline"
              size={14}
              color="#777D89"
            />
          </View>

          <View style={styles.chart}>
            <View style={styles.yAxis}>
              {[1, 0.75, 0.5, 0.25, 0].map(
                (fraction, index) => (
                  <Text
                    key={index}
                    style={styles.axisLabel}
                  >
                    {money(maxChart * fraction)}
                  </Text>
                )
              )}
            </View>

            <View style={styles.chartContent}>
              <View style={styles.gridLines}>
                {[0, 1, 2, 3, 4].map((line) => (
                  <View
                    key={line}
                    style={styles.gridLine}
                  />
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
                        item.amount === 0 &&
                          styles.emptyBar,
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
          spendingData.every(
            (item) => item.amount === 0
          ) ? (
            <Text style={styles.noSpending}>
              No expenses recorded in the last 7 days.
            </Text>
          ) : null}
        </View>

        {/* Recent transactions */}
        <View style={styles.transactionsSection}>
          <SectionHeading
            title="Recent Transactions"
            action="Income History"
            onAction={() =>
              router.push('/income-history')
            }
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
                  Your income and expense bills will appear
                  here.
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

      {/* Notifications popup */}
      <Modal
        visible={notificationsVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setNotificationsVisible(false)
        }
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setNotificationsVisible(false)}
        >
          <Pressable
            style={styles.notificationCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalTitleRow}>
              <View>
                <Text style={styles.modalTitle}>
                  Notifications
                </Text>
                <Text style={styles.modalSubtitle}>
                  Updates about your savings goals.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setNotificationsVisible(false)
                }
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color="#17233D"
                />
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={styles.noNotifications}>
                <View style={styles.noNotificationIcon}>
                  <Text style={styles.notificationCreature}>
                    🐣
                  </Text>
                </View>

                <Text style={styles.emptyTitle}>
                  You're all caught up!
                </Text>

                <Text style={styles.emptySubtitle}>
                  You have no new notifications. Your little
                  money buddy is keeping watch!
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: 360 }}
                showsVerticalScrollIndicator={false}
              >
                {notifications.map((item) => (
                  <View
                    key={item.id}
                    style={styles.notificationRow}
                  >
                    <View
                      style={styles.notificationSuccessIcon}
                    >
                      <Ionicons
                        name="trophy-outline"
                        size={20}
                        color="#16A673"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.notificationTitle}>
                        {item.title}
                      </Text>

                      <Text
                        style={styles.notificationMessage}
                      >
                        {item.message}
                      </Text>

                      <Text style={styles.notificationDate}>
                        {new Date(
                          item.created_at.replace(' ', 'T') +
                            'Z'
                        ).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() =>
                setNotificationsVisible(false)
              }
            >
              <Text style={styles.doneButtonText}>
                DONE
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    padding: 7,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#E34D4D',
    borderWidth: 1.5,
    borderColor: '#F7F8FA',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E9EBEF',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
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
  goalsSection: {
    marginTop: 25,
  },
  completedSection: {
    marginTop: 23,
  },
  goalEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E9ECF2',
  },
  goalEmptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F0ECFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E9ECF2',
  },
  goalCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F0ECFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCardTitle: {
    color: '#17233D',
    fontSize: 12,
    fontWeight: '800',
  },
  goalCardSubtitle: {
    color: '#8992A5',
    fontSize: 10,
    marginTop: 4,
  },
  goalPercent: {
    color: '#6256F5',
    fontSize: 12,
    fontWeight: '900',
  },
  goalTrack: {
    height: 7,
    backgroundColor: '#F0F1F6',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 13,
  },
  goalFill: {
    height: '100%',
    backgroundColor: '#6256F5',
    borderRadius: 8,
  },
  completedGoalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#DFF1E8',
  },
  completedGoalIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E8F7F1',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,15,30,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  notificationCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 22,
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#D9DCE3',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    color: '#17233D',
    fontSize: 21,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#8992A5',
    fontSize: 11,
    marginTop: 4,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#F1F2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noNotifications: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  noNotificationIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: '#EFEDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCreature: {
    fontSize: 31,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF2',
  },
  notificationSuccessIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: '#E9F8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationTitle: {
    color: '#17233D',
    fontSize: 13,
    fontWeight: '800',
  },
  notificationMessage: {
    color: '#697386',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  notificationDate: {
    color: '#A0A6B4',
    fontSize: 10,
    marginTop: 6,
  },
  doneButton: {
    height: 47,
    borderRadius: 13,
    backgroundColor: '#6256F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
});