
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
import Svg, { Path } from 'react-native-svg';

const COLORS = {
  background: '#F5F6FA',
  white: '#FFFFFF',
  navy: '#17233D',
  muted: '#8992A5',
  border: '#E9ECF2',
  purple: '#7656D6',
  purpleLight: '#F0ECFC',
  green: '#16A673',
  greenLight: '#E8F7F1',
  red: '#E45B64',
  redLight: '#FCEDEF',
};

const PIE_COLORS = [
  '#6C63FF',
  '#00BFA6',
  '#FF6B81',
  '#FFB547',
  '#3998FF',
  '#A66CFF',
  '#FF7A45',
  '#36B37E',
  '#E056FD',
  '#64748B',
];

type BillRow = {
  id: number;
  name: string;
  date: string;
  total: number;
};

type IncomeRow = {
  id: number;
  description: string;
  amount: number;
  date: string;
};

type BillItemRow = {
  name: string;
  amount: number;
};

type DaySpending = {
  label: string;
  dateKey: string;
  amount: number;
};

type ItemBreakdown = {
  name: string;
  amount: number;
};

type BillBreakdown = {
  name: string;
  amount: number;
};

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function parseStoredDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);

  if (match) {
    const [, day, month, year] = match;
    const monthIndex = MONTHS[month];

    if (monthIndex !== undefined) {
      return new Date(Number(year), monthIndex, Number(day));
    }
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatMoney(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString('en-IN')}`;
}

function sameMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

function getPieSlicePath(
  percentage: number,
  startAngle: number,
  radius: number
): string {
  if (percentage >= 0.9999) {
    return [
      `M ${radius} ${radius}`,
      `m 0 -${radius}`,
      `a ${radius} ${radius} 0 1 1 0 ${radius * 2}`,
      `a ${radius} ${radius} 0 1 1 0 -${radius * 2}`,
      'Z',
    ].join(' ');
  }

  const endAngle = startAngle + percentage * 360;

  const toRadians = (angle: number) =>
    ((angle - 90) * Math.PI) / 180;

  const startX = radius + radius * Math.cos(toRadians(startAngle));
  const startY = radius + radius * Math.sin(toRadians(startAngle));

  const endX = radius + radius * Math.cos(toRadians(endAngle));
  const endY = radius + radius * Math.sin(toRadians(endAngle));

  const largeArc = percentage > 0.5 ? 1 : 0;

  return [
    `M ${radius} ${radius}`,
    `L ${startX} ${startY}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`,
    'Z',
  ].join(' ');
}

export default function AnalyticsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [weeklySpending, setWeeklySpending] = useState<DaySpending[]>([]);
  const [itemBreakdown, setItemBreakdown] = useState<ItemBreakdown[]>([]);
  const [billBreakdown, setBillBreakdown] = useState<BillBreakdown[]>([]);
  const [recentBills, setRecentBills] = useState<BillRow[]>([]);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      const [bills, incomes, items] = await Promise.all([
        db.getAllAsync<BillRow>(
          `SELECT id, name, date, total
           FROM bills
           ORDER BY id DESC`
        ),

        db.getAllAsync<IncomeRow>(
          `SELECT id, description, amount, date
           FROM income
           ORDER BY id DESC`
        ),

        db.getAllAsync<BillItemRow>(
          `SELECT bill_items.name, bill_items.amount
           FROM bill_items
           INNER JOIN bills ON bills.id = bill_items.bill_id`
        ),
      ]);

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Monthly income
      const incomeTotal = incomes.reduce((total, entry) => {
        const entryDate = parseStoredDate(entry.date);

        return sameMonth(entryDate, currentYear, currentMonth)
          ? total + Number(entry.amount || 0)
          : total;
      }, 0);

      // Monthly expenses
      const expenseTotal = bills.reduce((total, bill) => {
        const billDate = parseStoredDate(bill.date);

        return sameMonth(billDate, currentYear, currentMonth)
          ? total + Number(bill.total || 0)
          : total;
      }, 0);

      setMonthlyIncome(incomeTotal);
      setMonthlyExpenses(expenseTotal);

      // Last 7 days spending
      const days: DaySpending[] = [];

      for (let i = 6; i >= 0; i--) {
        const day = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - i
        );

        days.push({
          label: day.toLocaleDateString('en-US', {
            weekday: 'short',
          }),
          dateKey: dateKey(day),
          amount: 0,
        });
      }

      const spendingByDate = new Map<string, number>();

      bills.forEach((bill) => {
        const billDate = parseStoredDate(bill.date);
        const key = dateKey(billDate);

        spendingByDate.set(
          key,
          (spendingByDate.get(key) || 0) + Number(bill.total || 0)
        );
      });

      setWeeklySpending(
        days.map((day) => ({
          ...day,
          amount: spendingByDate.get(day.dateKey) || 0,
        }))
      );

      // Group custom bill items by item name
      const breakdownMap = new Map<string, number>();

      items.forEach((item) => {
        const name = item.name?.trim() || 'Other';

        breakdownMap.set(
          name,
          (breakdownMap.get(name) || 0) + Number(item.amount || 0)
        );
      });

      setItemBreakdown(
        Array.from(breakdownMap.entries())
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 6)
      );

      // Group bills by title for the pie chart
      const billMap = new Map<string, number>();

      bills.forEach((bill) => {
        const name = bill.name?.trim() || 'Untitled bill';

        billMap.set(
          name,
          (billMap.get(name) || 0) + Number(bill.total || 0)
        );
      });

      setBillBreakdown(
        Array.from(billMap.entries())
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount)
      );

      // Recent bills
      setRecentBills(
        [...bills]
          .sort(
            (a, b) =>
              parseStoredDate(b.date).getTime() -
              parseStoredDate(a.date).getTime()
          )
          .slice(0, 5)
      );
    } catch (error) {
      console.error('Analytics loading error:', error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics();
    }, [loadAnalytics])
  );

  const savings = monthlyIncome - monthlyExpenses;

  const highestDay = Math.max(
    ...weeklySpending.map((day) => day.amount),
    1
  );

  const highestItem = Math.max(
    ...itemBreakdown.map((item) => item.amount),
    1
  );

  const monthName = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const totalBillSpending = billBreakdown.reduce(
    (sum, bill) => sum + bill.amount,
    0
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.purple} />
        <Text style={styles.loadingText}>
          Loading your analytics...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>
            YOUR MONEY, YOUR STORY
          </Text>

          <Text style={styles.title}>Analytics</Text>

          <Text style={styles.subtitle}>
            Here's how your money is behaving.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => void loadAnalytics()}
          activeOpacity={0.8}
        >
          <Ionicons
            name="refresh"
            size={21}
            color={COLORS.navy}
          />
        </TouchableOpacity>
      </View>

      {/* Monthly overview */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Monthly overview
        </Text>

        <Text style={styles.monthLabel}>{monthName}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>
          NET SAVINGS THIS MONTH
        </Text>

        <Text
          style={[
            styles.savingsAmount,
            {
              color: savings >= 0 ? COLORS.green : COLORS.red,
            },
          ]}
        >
          {savings < 0 ? '-' : ''}
          {formatMoney(Math.abs(savings))}
        </Text>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={styles.summaryIconGreen}>
              <Ionicons
                name="wallet-outline"
                size={21}
                color={COLORS.green}
              />
            </View>

            <Text style={styles.summarySmallLabel}>
              Income
            </Text>

            <Text style={styles.summaryValue}>
              {formatMoney(monthlyIncome)}
            </Text>
          </View>

          <View style={styles.summaryVerticalDivider} />

          <View style={styles.summaryItem}>
            <View style={styles.summaryIconRed}>
              <Ionicons
                name="receipt-outline"
                size={21}
                color={COLORS.red}
              />
            </View>

            <Text style={styles.summarySmallLabel}>
              Expenses
            </Text>

            <Text style={styles.summaryValue}>
              {formatMoney(monthlyExpenses)}
            </Text>
          </View>
        </View>
      </View>

      {/* Bill pie chart */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Your biggest bills
        </Text>

        <Text style={styles.monthLabel}>All time</Text>
      </View>

      <View style={styles.card}>
        {billBreakdown.length === 0 || totalBillSpending <= 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="pie-chart-outline"
              size={32}
              color={COLORS.muted}
            />

            <Text style={styles.emptyTitle}>
              No bills to analyse yet
            </Text>

            <Text style={styles.emptyText}>
              Save some expense bills to see where your money goes.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.pieContainer}>
              <Svg
                width={190}
                height={190}
                viewBox="0 0 180 180"
              >
                {(() => {
                  let currentAngle = 0;

                  return billBreakdown
                    .filter((bill) => bill.amount > 0)
                    .map((bill, index) => {
                      const percentage =
                        bill.amount / totalBillSpending;

                      const path = getPieSlicePath(
                        percentage,
                        currentAngle,
                        85
                      );

                      currentAngle += percentage * 360;

                      return (
                        <Path
                          key={`${bill.name}-${index}`}
                          d={path}
                          fill={
                            PIE_COLORS[index % PIE_COLORS.length]
                          }
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        />
                      );
                    });
                })()}
              </Svg>
            </View>

            <View style={styles.pieLegend}>
              {billBreakdown
                .filter((bill) => bill.amount > 0)
                .map((bill, index) => (
                  <View
                    key={`${bill.name}-${index}`}
                    style={styles.legendRow}
                  >
                    <View style={styles.legendLeft}>
                      <View
                        style={[
                          styles.legendDot,
                          {
                            backgroundColor:
                              PIE_COLORS[
                                index % PIE_COLORS.length
                              ],
                          },
                        ]}
                      />

                      <Text
                        style={styles.legendName}
                        numberOfLines={1}
                      >
                        {bill.name}
                      </Text>
                    </View>

                    <Text style={styles.legendAmount}>
                      {formatMoney(bill.amount)}
                    </Text>
                  </View>
                ))}
            </View>
          </>
        )}
      </View>

      {/* Weekly spending */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Weekly spending
        </Text>

        <Text style={styles.monthLabel}>Last 7 days</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardSubtitle}>
          Your daily expenses at a glance
        </Text>

        <View style={styles.chart}>
          {weeklySpending.map((day) => {
            const barHeight =
              day.amount > 0
                ? (day.amount / highestDay) * 125
                : 4;

            const isToday =
              day.dateKey === dateKey(new Date());

            return (
              <View
                key={day.dateKey}
                style={styles.chartColumn}
              >
                <Text style={styles.barAmount}>
                  {day.amount > 0
                    ? day.amount >= 1000
                      ? `${(day.amount / 1000).toFixed(1)}k`
                      : Math.round(day.amount).toString()
                    : ''}
                </Text>

                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: isToday
                          ? COLORS.purple
                          : '#B9AAEB',
                      },
                    ]}
                  />
                </View>

                <Text
                  style={[
                    styles.dayLabel,
                    isToday && styles.todayLabel,
                  ]}
                >
                  {day.label}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.chartHint}>
          Daily spending is based on your saved expense bills.
        </Text>
      </View>

      {/* Expense item breakdown */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Where it goes
        </Text>

        <Text style={styles.monthLabel}>All recorded bills</Text>
      </View>

      <View style={styles.card}>
        {itemBreakdown.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="pricetags-outline"
              size={32}
              color={COLORS.muted}
            />

            <Text style={styles.emptyTitle}>
              Nothing to break down yet
            </Text>

            <Text style={styles.emptyText}>
              Save an expense bill with some items to see your breakdown here.
            </Text>
          </View>
        ) : (
          itemBreakdown.map((item, index) => {
            const percentage =
              (item.amount / highestItem) * 100;

            return (
              <View
                key={`${item.name}-${index}`}
                style={[
                  styles.breakdownItem,
                  index === itemBreakdown.length - 1 &&
                    styles.lastBreakdownItem,
                ]}
              >
                <View style={styles.breakdownTop}>
                  <Text
                    style={styles.breakdownName}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>

                  <Text style={styles.breakdownAmount}>
                    {formatMoney(item.amount)}
                  </Text>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${percentage}%` },
                    ]}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Recent bills */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Recent bills
        </Text>

        <TouchableOpacity
          onPress={() => router.push('/bills')}
        >
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {recentBills.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="receipt-outline"
              size={32}
              color={COLORS.muted}
            />

            <Text style={styles.emptyTitle}>
              No bills yet
            </Text>

            <Text style={styles.emptyText}>
              Your saved expense bills will appear here.
            </Text>
          </View>
        ) : (
          recentBills.map((bill, index) => (
            <TouchableOpacity
              key={bill.id}
              style={[
                styles.billRow,
                index === recentBills.length - 1 &&
                  styles.lastBillRow,
              ]}
              onPress={() =>
                router.push(`/expense?id=${bill.id}`)
              }
              activeOpacity={0.7}
            >
              <View style={styles.billIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={20}
                  color={COLORS.purple}
                />
              </View>

              <View style={styles.billInfo}>
                <Text
                  style={styles.billName}
                  numberOfLines={1}
                >
                  {bill.name}
                </Text>

                <Text style={styles.billDate}>
                  {bill.date}
                </Text>
              </View>

              <Text style={styles.billAmount}>
                {formatMoney(Number(bill.total || 0))}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={COLORS.muted}
              />
            </TouchableOpacity>
          ))
        )}
      </View>

      <Text style={styles.footer}>
        SMALL STEPS. SMARTER SPENDING.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 22,
    paddingTop: 60,
    paddingBottom: 110,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: COLORS.muted,
    marginTop: 12,
    fontSize: 14,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },

  eyebrow: {
    color: COLORS.purple,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 7,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.navy,
  },

  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 5,
  },

  refreshButton: {
    height: 44,
    width: 44,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
    marginTop: 10,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: '800',
  },

  monthLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },

  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  summaryLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  savingsAmount: {
    fontSize: 29,
    fontWeight: '900',
    marginTop: 9,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 18,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryVerticalDivider: {
    width: 1,
    height: 75,
    backgroundColor: '#E9ECF2',
    marginHorizontal: 10,
  },

  summaryIconGreen: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  summaryIconRed: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  summarySmallLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 5,
  },

  summaryValue: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 18,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 18,
  },

  pieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },

  pieLegend: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 15,
  },

  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },

  legendDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 10,
  },

  legendName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.navy,
    flex: 1,
  },

  legendAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.navy,
  },

  chart: {
    height: 180,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  chartColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },

  barAmount: {
    color: COLORS.muted,
    fontSize: 9,
    height: 17,
    marginBottom: 5,
    fontWeight: '600',
  },

  barTrack: {
    height: 130,
    width: 20,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  bar: {
    width: 17,
    borderRadius: 8,
    minHeight: 4,
  },

  dayLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 9,
    fontWeight: '600',
  },

  todayLabel: {
    color: COLORS.purple,
    fontWeight: '900',
  },

  chartHint: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 13,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 22,
  },

  emptyTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 6,
    maxWidth: 240,
  },

  breakdownItem: {
    marginBottom: 19,
  },

  lastBreakdownItem: {
    marginBottom: 0,
  },

  breakdownTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },

  breakdownName: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },

  breakdownAmount: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '800',
  },

  progressTrack: {
    height: 7,
    backgroundColor: '#F0F1F6',
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: COLORS.purple,
    borderRadius: 10,
  },

  seeAll: {
    color: COLORS.purple,
    fontSize: 12,
    fontWeight: '800',
  },

  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  lastBillRow: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },

  billIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  billInfo: {
    flex: 1,
    marginRight: 8,
  },

  billName: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '800',
  },

  billDate: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },

  billAmount: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '800',
    marginRight: 8,
  },

  footer: {
    color: COLORS.muted,
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 1.2,
    fontWeight: '700',
    marginTop: 5,
  },
});
