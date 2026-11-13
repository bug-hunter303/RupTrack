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
import Svg, {
  Circle,
  Path,
  Line,
  Text as SvgText,
} from 'react-native-svg';

import { useAppearance } from '@/context/appearance-context';

const PIE = [
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

type Appearance = ReturnType<typeof useAppearance>;
type ThemeColors = Appearance['colors'];
type AccentColors = Appearance['accent'];
type AnalyticsStyles = ReturnType<typeof createStyles>;

type Bill = {
  id: number;
  name: string;
  date: string;
  total: number;
};

type Income = {
  id: number;
  description: string;
  amount: number;
  date: string;
};

type BillItem = {
  name: string;
  amount: number;
};

type Goal = {
  id: number;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  is_completed: number;
};

type Budget = {
  savings_target: number;
  spending_limit: number;
  weekly_allowance: number;
};

type Contribution = {
  amount: number;
  date: string;
};

type Day = {
  label: string;
  dateKey: string;
  amount: number;
};

type Pair = {
  label: string;
  amount: number;
};

type Scatter = {
  label: string;
  expense: number;
  contribution: number;
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

function parseDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value
      .slice(0, 10)
      .split('-')
      .map(Number);

    return new Date(year, month - 1, day);
  }

  const match = value.match(
    /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/
  );

  if (match && MONTHS[match[2]] !== undefined) {
    return new Date(
      Number(match[3]),
      MONTHS[match[2]],
      Number(match[1])
    );
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? new Date(0)
    : parsed;
}

function key(date: Date): string {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}-${String(date.getDate()).padStart(
    2,
    '0'
  )}`;
}

function monthKey(): string {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}`;
}

function sameMonth(
  date: Date,
  year: number,
  month: number
): boolean {
  return (
    date.getFullYear() === year &&
    date.getMonth() === month
  );
}

function slicePath(
  percentage: number,
  start: number,
  radius: number
): string {
  if (percentage >= 0.9999) {
    return `M ${radius} ${radius} m 0 -${radius} a ${radius} ${radius} 0 1 1 0 ${
      2 * radius
    } a ${radius} ${radius} 0 1 1 0 -${2 * radius} Z`;
  }

  const end = start + percentage * 360;
  const radians = (angle: number) =>
    ((angle - 90) * Math.PI) / 180;

  const x1 = radius + radius * Math.cos(radians(start));
  const y1 = radius + radius * Math.sin(radians(start));
  const x2 = radius + radius * Math.cos(radians(end));
  const y2 = radius + radius * Math.sin(radians(end));

  return [
    `M ${radius} ${radius}`,
    `L ${x1} ${y1}`,
    `A ${radius} ${radius} 0 ${
      percentage > 0.5 ? 1 : 0
    } 1 ${x2} ${y2}`,
    'Z',
  ].join(' ');
}

function Section({
  title,
  right,
  styles,
}: {
  title: string;
  right?: string;
  styles: AnalyticsStyles;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right ? (
        <Text style={styles.monthLabel}>{right}</Text>
      ) : null}
    </View>
  );
}

function Empty({
  icon,
  title,
  message,
  styles,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  styles: AnalyticsStyles;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={30} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

function Pie({
  rows,
  total,
  styles,
  money,
  colors,
}: {
  rows: Pair[];
  total: number;
  styles: AnalyticsStyles;
  money: (amount: number) => string;
  colors: ThemeColors;
}) {
  return (
    <>
      <View style={styles.pieContainer}>
        <Svg width={184} height={184} viewBox="0 0 180 180">
          {(() => {
            let angle = 0;

            return rows
              .filter((item) => item.amount > 0)
              .map((item, index) => {
                const part = item.amount / total;
                const path = slicePath(part, angle, 85);

                angle += part * 360;

                return (
                  <Path
                    key={`${item.label}-${index}`}
                    d={path}
                    fill={PIE[index % PIE.length]}
                    stroke={colors.surface}
                    strokeWidth={2}
                  />
                );
              });
          })()}
        </Svg>
      </View>

      <View style={styles.legend}>
        {rows
          .filter((item) => item.amount > 0)
          .map((item, index) => (
            <View
              key={`${item.label}-${index}`}
              style={styles.legendRow}
            >
              <View style={styles.legendLeft}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        PIE[index % PIE.length],
                    },
                  ]}
                />
                <Text
                  style={styles.legendName}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>

              <Text style={styles.legendAmount}>
                {money(item.amount)}
              </Text>
            </View>
          ))}
      </View>
    </>
  );
}

export default function AnalyticsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const { colors, accent, isDark, formatMoney } =
    useAppearance();

  const styles = createStyles(colors, accent, isDark);
  const money = formatMoney;

  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);

  const [weekly, setWeekly] = useState<Day[]>([]);
  const [items, setItems] = useState<Pair[]>([]);
  const [billsPie, setBillsPie] = useState<Pair[]>([]);
  const [recent, setRecent] = useState<Bill[]>([]);

  const [budget, setBudget] = useState<Budget | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [scatter, setScatter] = useState<Scatter[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [
        billRows,
        incomeRows,
        itemRows,
        budgetRow,
        goalRows,
        contributionRows,
      ] = await Promise.all([
        db.getAllAsync<Bill>(
          'SELECT id, name, date, total FROM bills ORDER BY id DESC'
        ),

        db.getAllAsync<Income>(
          'SELECT id, description, amount, date FROM income ORDER BY id DESC'
        ),

        db.getAllAsync<BillItem>(
          `SELECT bill_items.name, bill_items.amount
           FROM bill_items
           INNER JOIN bills ON bills.id = bill_items.bill_id`
        ),

        db.getFirstAsync<Budget>(
          `SELECT savings_target, spending_limit, weekly_allowance
           FROM monthly_budgets
           WHERE month_key = ?`,
          monthKey()
        ),

        db.getAllAsync<Goal>(
          `SELECT id, name, target_amount, saved_amount,
                  target_date, is_completed
           FROM savings_goals
           ORDER BY created_at DESC, id DESC`
        ),

        db.getAllAsync<Contribution>(
          'SELECT amount, date FROM goal_contributions ORDER BY date DESC'
        ),
      ]);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      setIncome(
        incomeRows.reduce((sum, row) => {
          return sameMonth(
            parseDate(row.date),
            year,
            month
          )
            ? sum + Number(row.amount || 0)
            : sum;
        }, 0)
      );

      setExpenses(
        billRows.reduce((sum, row) => {
          return sameMonth(
            parseDate(row.date),
            year,
            month
          )
            ? sum + Number(row.total || 0)
            : sum;
        }, 0)
      );

      setBudget(budgetRow || null);
      setGoals(goalRows);

      const days: Day[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(
          year,
          month,
          now.getDate() - i
        );

        days.push({
          label: date.toLocaleDateString('en-US', {
            weekday: 'short',
          }),
          dateKey: key(date),
          amount: 0,
        });
      }

      const spendingMap = new Map<string, number>();

      billRows.forEach((bill) => {
        const dateKey = key(parseDate(bill.date));

        spendingMap.set(
          dateKey,
          (spendingMap.get(dateKey) || 0) +
            Number(bill.total || 0)
        );
      });

      setWeekly(
        days.map((day) => ({
          ...day,
          amount: spendingMap.get(day.dateKey) || 0,
        }))
      );

      const itemMap = new Map<string, number>();

      itemRows.forEach((row) => {
        const name = row.name?.trim() || 'Other';

        itemMap.set(
          name,
          (itemMap.get(name) || 0) +
            Number(row.amount || 0)
        );
      });

      setItems(
        Array.from(itemMap, ([name, amount]) => ({
          label: name,
          amount,
        }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 6)
      );

      const billMap = new Map<string, number>();

      billRows.forEach((bill) => {
        const name = bill.name?.trim() || 'Untitled bill';

        billMap.set(
          name,
          (billMap.get(name) || 0) +
            Number(bill.total || 0)
        );
      });

      setBillsPie(
        Array.from(billMap, ([label, amount]) => ({
          label,
          amount,
        })).sort((a, b) => b.amount - a.amount)
      );

      setRecent(
        [...billRows]
          .sort(
            (a, b) =>
              parseDate(b.date).getTime() -
              parseDate(a.date).getTime()
          )
          .slice(0, 5)
      );

      // Compare daily expenses with daily goal contributions.
      const dailyExpense = new Map<string, number>();
      const dailySaved = new Map<string, number>();

      billRows.forEach((bill) => {
        const dateKey = key(parseDate(bill.date));

        dailyExpense.set(
          dateKey,
          (dailyExpense.get(dateKey) || 0) +
            Number(bill.total || 0)
        );
      });

      contributionRows.forEach((row) => {
        const dateKey = key(parseDate(row.date));

        dailySaved.set(
          dateKey,
          (dailySaved.get(dateKey) || 0) +
            Number(row.amount || 0)
        );
      });

      const pairs: Scatter[] = [];

      for (let i = 29; i >= 0; i--) {
        const date = new Date(
          year,
          month,
          now.getDate() - i
        );

        const dateKey = key(date);
        const expense = dailyExpense.get(dateKey) || 0;
        const contribution = dailySaved.get(dateKey) || 0;

        if (expense > 0 || contribution > 0) {
          pairs.push({
            label: date.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            }),
            expense,
            contribution,
          });
        }
      }

      setScatter(pairs);
    } catch (error) {
      console.error('Analytics loading error:', error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const savings = income - expenses;

  const maxDay = Math.max(
    ...weekly.map((day) => day.amount),
    1
  );

  const maxItem = Math.max(
    ...items.map((item) => item.amount),
    1
  );

  const monthName = new Date().toLocaleDateString(
    'en-US',
    {
      month: 'long',
      year: 'numeric',
    }
  );

  const billTotal = billsPie.reduce(
    (sum, bill) => sum + bill.amount,
    0
  );

  const goalRows = goals
    .filter((goal) => goal.target_amount > 0)
    .map((goal) => ({
      label: goal.name,
      amount: Number(goal.target_amount),
    }));

  const goalTotal = goalRows.reduce(
    (sum, goal) => sum + goal.amount,
    0
  );

  const maxX = Math.max(
    ...scatter.map((point) => point.contribution),
    1
  );

  const maxY = Math.max(
    ...scatter.map((point) => point.expense),
    1
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={accent.primary}
        />
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
          style={styles.refresh}
          onPress={() => void load()}
        >
          <Ionicons
            name="refresh"
            size={21}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      <Section
        title="Monthly overview"
        right={monthName}
        styles={styles}
      />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>
          NET SAVINGS THIS MONTH
        </Text>

        <Text
          style={[
            styles.savingsAmount,
            {
              color: savings >= 0 ? '#16A673' : '#E45B64',
            },
          ]}
        >
          {savings < 0 ? '-' : ''}
          {money(Math.abs(savings))}
        </Text>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={styles.incomeIcon}>
              <Ionicons
                name="wallet-outline"
                size={21}
                color="#16A673"
              />
            </View>
            <Text style={styles.smallLabel}>Income</Text>
            <Text style={styles.summaryValue}>
              {money(income)}
            </Text>
          </View>

          <View style={styles.verticalDivider} />

          <View style={styles.summaryItem}>
            <View style={styles.expenseIcon}>
              <Ionicons
                name="receipt-outline"
                size={21}
                color="#E45B64"
              />
            </View>
            <Text style={styles.smallLabel}>Expenses</Text>
            <Text style={styles.summaryValue}>
              {money(expenses)}
            </Text>
          </View>
        </View>
      </View>

      <Section
        title="Your budget"
        right={budget ? 'This month' : 'Not set yet'}
        styles={styles}
      />

      <View style={styles.card}>
        {budget ? (
          <>
            <View style={styles.budgetTop}>
              <View style={styles.budgetIcon}>
                <Ionicons
                  name="wallet"
                  size={21}
                  color={accent.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.budgetHeading}>
                  Monthly budget is active
                </Text>
                <Text style={styles.budgetCaption}>
                  Your saved limits from the Budget tab
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/budget')}
              >
                <Text style={styles.editText}>EDIT</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.budgetGrid}>
              <View style={styles.budgetMetric}>
                <Text style={styles.metricLabel}>
                  Savings target
                </Text>
                <Text style={styles.metricValue}>
                  {money(budget.savings_target)}
                </Text>
              </View>

              <View style={styles.budgetMetric}>
                <Text style={styles.metricLabel}>
                  Spending limit
                </Text>
                <Text style={styles.metricValue}>
                  {money(budget.spending_limit)}
                </Text>
              </View>

              <View style={styles.budgetMetric}>
                <Text style={styles.metricLabel}>
                  Weekly allowance
                </Text>
                <Text style={styles.metricValue}>
                  {money(budget.weekly_allowance)}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <TouchableOpacity
            style={styles.budgetEmpty}
            onPress={() => router.push('/budget')}
          >
            <Ionicons
              name="add-circle-outline"
              size={27}
              color={accent.primary}
            />
            <Text style={styles.emptyTitle}>
              Set up your budget
            </Text>
            <Text style={styles.emptyText}>
              Your saved savings target and spending limits
              will appear here.
            </Text>
            <Text style={styles.editText}>OPEN BUDGET</Text>
          </TouchableOpacity>
        )}
      </View>

      <Section
        title="Your biggest bills"
        right="All time"
        styles={styles}
      />

      <View style={styles.card}>
        {billTotal <= 0 ? (
          <Empty
            icon="pie-chart-outline"
            title="No bills to analyse yet"
            message="Save some expense bills to see where your money goes."
            styles={styles}
            colors={colors}
          />
        ) : (
          <Pie
            rows={billsPie}
            total={billTotal}
            styles={styles}
            money={money}
            colors={colors}
          />
        )}
      </View>

      <Section
        title="Your savings goals"
        right={`${goals.length} goals`}
        styles={styles}
      />

      <View style={styles.card}>
        {goalRows.length === 0 ? (
          <Empty
            icon="flag-outline"
            title="No savings goals yet"
            message="Create a goal in the Budget tab and its target will appear here."
            styles={styles}
            colors={colors}
          />
        ) : (
          <>
            <Pie
              rows={goalRows}
              total={goalTotal}
              styles={styles}
              money={money}
              colors={colors}
            />

            {goals.map((goal) => {
              const percentage =
                goal.target_amount > 0
                  ? Math.min(
                      100,
                      (goal.saved_amount /
                        goal.target_amount) *
                        100
                    )
                  : 0;

              return (
                <View
                  key={goal.id}
                  style={styles.goalProgressRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalName}>
                      {goal.name}
                      {goal.is_completed === 1 ? '  ✓' : ''}
                    </Text>

                    <Text style={styles.goalMeta}>
                      {money(goal.saved_amount)} saved of{' '}
                      {money(goal.target_amount)}
                    </Text>

                    <View style={styles.goalTrack}>
                      <View
                        style={[
                          styles.goalFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor:
                              goal.is_completed === 1
                                ? '#16A673'
                                : accent.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.goalPct,
                      {
                        color:
                          goal.is_completed === 1
                            ? '#16A673'
                            : accent.primary,
                      },
                    ]}
                  >
                    {Math.round(percentage)}%
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </View>

      <Section
        title="Savings vs expenses"
        right="Last 30 days"
        styles={styles}
      />

      <View style={styles.card}>
        <Text style={styles.cardSubtitle}>
          Each dot represents a day. Horizontal = money added
          to goals; vertical = expenses.
        </Text>

        {scatter.length === 0 ? (
          <Empty
            icon="analytics-outline"
            title="Not enough activity yet"
            message="Add money to a savings goal and record expenses to build this chart."
            styles={styles}
            colors={colors}
          />
        ) : (
          <>
            <View style={styles.scatterWrap}>
              <Svg
                width="100%"
                height={220}
                viewBox="0 0 320 220"
              >
                <Line
                  x1="42"
                  y1="12"
                  x2="42"
                  y2="184"
                  stroke={colors.border}
                  strokeWidth="1.3"
                />

                <Line
                  x1="42"
                  y1="184"
                  x2="305"
                  y2="184"
                  stroke={colors.border}
                  strokeWidth="1.3"
                />

                {[0, 1, 2, 3].map((index) => (
                  <Line
                    key={index}
                    x1="42"
                    y1={184 - index * 52}
                    x2="305"
                    y2={184 - index * 52}
                    stroke={colors.border}
                    strokeWidth="1"
                    opacity="0.65"
                  />
                ))}

                {scatter.map((point, index) => (
                  <Circle
                    key={`${point.label}-${index}`}
                    cx={
                      42 +
                      (point.contribution / maxX) * 245
                    }
                    cy={
                      184 -
                      (point.expense / maxY) * 155
                    }
                    r="4.5"
                    fill={accent.primary}
                    opacity="0.78"
                  />
                ))}

                <SvgText
                  x="42"
                  y="204"
                  fontSize="9"
                  fill={colors.muted}
                >
                  {money(0)}
                </SvgText>

                <SvgText
                  x="305"
                  y="204"
                  fontSize="9"
                  fill={colors.muted}
                  textAnchor="end"
                >
                  {money(maxX)}
                </SvgText>

                <SvgText
                  x="35"
                  y="185"
                  fontSize="8"
                  fill={colors.muted}
                  textAnchor="end"
                >
                  0
                </SvgText>

                <SvgText
                  x="35"
                  y="28"
                  fontSize="8"
                  fill={colors.muted}
                  textAnchor="end"
                >
                  {maxY >= 1000
                    ? `${(maxY / 1000).toFixed(1)}k`
                    : Math.round(maxY)}
                </SvgText>
              </Svg>
            </View>

            <View style={styles.scatterLegend}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: accent.primary },
                ]}
              />
              <Text style={styles.chartHint}>
                Daily goal contributions compared with daily
                bill expenses
              </Text>
            </View>
          </>
        )}
      </View>

      <Section
        title="Weekly spending"
        right="Last 7 days"
        styles={styles}
      />

      <View style={styles.card}>
        <Text style={styles.cardSubtitle}>
          Your daily expenses at a glance
        </Text>

        <View style={styles.chart}>
          {weekly.map((day) => {
            const height =
              day.amount > 0
                ? (day.amount / maxDay) * 125
                : 4;

            const today = day.dateKey === key(new Date());

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
                        height,
                        backgroundColor: today
                          ? accent.primary
                          : isDark
                            ? '#514879'
                            : '#B9AAEB',
                      },
                    ]}
                  />
                </View>

                <Text
                  style={[
                    styles.dayLabel,
                    today && styles.todayLabel,
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

      <Section
        title="Where it goes"
        right="All recorded bills"
        styles={styles}
      />

      <View style={styles.card}>
        {items.length === 0 ? (
          <Empty
            icon="pricetags-outline"
            title="Nothing to break down yet"
            message="Save an expense bill with some items to see your breakdown here."
            styles={styles}
            colors={colors}
          />
        ) : (
          items.map((item, index) => (
            <View
              key={`${item.label}-${index}`}
              style={styles.breakdownItem}
            >
              <View style={styles.breakdownTop}>
                <Text style={styles.breakdownName}>
                  {item.label}
                </Text>
                <Text style={styles.breakdownAmount}>
                  {money(item.amount)}
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        (item.amount / maxItem) * 100
                      }%`,
                      backgroundColor: accent.primary,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent bills</Text>

        <TouchableOpacity
          onPress={() => router.push('/bills')}
        >
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {recent.length === 0 ? (
          <Empty
            icon="receipt-outline"
            title="No bills yet"
            message="Your saved expense bills will appear here."
            styles={styles}
            colors={colors}
          />
        ) : (
          recent.map((bill, index) => (
            <TouchableOpacity
              key={bill.id}
              style={[
                styles.billRow,
                index === recent.length - 1 && {
                  borderBottomWidth: 0,
                },
              ]}
              onPress={() =>
                router.push(`/expense?id=${bill.id}`)
              }
            >
              <View style={styles.billIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={20}
                  color={accent.primary}
                />
              </View>

              <View
                style={{
                  flex: 1,
                  marginRight: 8,
                }}
              >
                <Text style={styles.billName}>
                  {bill.name}
                </Text>
                <Text style={styles.billDate}>
                  {bill.date}
                </Text>
              </View>

              <Text style={styles.billAmount}>
                {money(Number(bill.total || 0))}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={colors.muted}
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

function createStyles(
  colors: ThemeColors,
  accent: AccentColors,
  isDark: boolean
) {
  const greenLight = isDark ? '#173B32' : '#E8F7F1';
  const redLight = isDark ? '#40262D' : '#FCEDEF';
  const purpleLight = accent.soft;
  const track = isDark ? '#303746' : '#F0F1F6';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 22,
      paddingTop: 60,
      paddingBottom: 110,
    },
    loading: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: colors.muted,
      marginTop: 12,
      fontSize: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 25,
    },
    eyebrow: {
      color: accent.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
      marginBottom: 7,
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 5,
    },
    refresh: {
      height: 44,
      width: 44,
      borderRadius: 15,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 13,
      marginTop: 10,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    monthLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 20,
      marginBottom: 25,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
    },
    savingsAmount: {
      fontSize: 29,
      fontWeight: '900',
      marginTop: 9,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
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
    verticalDivider: {
      width: 1,
      height: 75,
      backgroundColor: colors.border,
      marginHorizontal: 10,
    },
    incomeIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: greenLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    expenseIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: redLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    smallLabel: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 5,
    },
    summaryValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 18,
      marginBottom: 25,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardSubtitle: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 13,
      lineHeight: 18,
    },
    budgetTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    budgetIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: purpleLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    budgetHeading: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    budgetCaption: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 4,
    },
    editText: {
      color: accent.primary,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    budgetGrid: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 18,
    },
    budgetMetric: {
      flex: 1,
      backgroundColor: colors.input,
      borderRadius: 12,
      padding: 10,
    },
    metricLabel: {
      color: colors.muted,
      fontSize: 9,
      marginBottom: 7,
    },
    metricValue: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '800',
    },
    budgetEmpty: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: 22,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      marginTop: 10,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 11,
      textAlign: 'center',
      lineHeight: 17,
      marginTop: 6,
      maxWidth: 250,
    },
    pieContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 12,
    },
    legend: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
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
    dot: {
      width: 11,
      height: 11,
      borderRadius: 6,
      marginRight: 10,
    },
    legendName: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    legendAmount: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
    },
    goalProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingTop: 14,
      marginTop: 13,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    goalName: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    goalMeta: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 4,
    },
    goalTrack: {
      height: 6,
      backgroundColor: track,
      borderRadius: 10,
      overflow: 'hidden',
      marginTop: 9,
    },
    goalFill: {
      height: '100%',
      borderRadius: 10,
    },
    goalPct: {
      fontSize: 11,
      fontWeight: '900',
    },
    scatterWrap: {
      marginTop: 5,
    },
    scatterLegend: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3,
    },
    chartHint: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 13,
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
      color: colors.muted,
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
      color: colors.muted,
      fontSize: 10,
      marginTop: 9,
      fontWeight: '600',
    },
    todayLabel: {
      color: accent.primary,
      fontWeight: '900',
    },
    breakdownItem: {
      marginBottom: 19,
    },
    breakdownTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 9,
    },
    breakdownName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      flex: 1,
      marginRight: 12,
    },
    breakdownAmount: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    progressTrack: {
      height: 7,
      backgroundColor: track,
      borderRadius: 10,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 10,
    },
    seeAll: {
      color: accent.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    billRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    billIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: purpleLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    billName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    billDate: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 4,
    },
    billAmount: {
      color: '#E45B64',
      fontSize: 12,
      fontWeight: '800',
      marginRight: 8,
    },
    footer: {
      color: colors.muted,
      fontSize: 9,
      textAlign: 'center',
      letterSpacing: 1.2,
      fontWeight: '700',
      marginTop: 5,
    },
  });
}
