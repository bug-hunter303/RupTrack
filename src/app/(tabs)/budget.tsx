import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type BudgetSettings = {
  savings_target: number;
  spending_limit: number;
  weekly_allowance: number;
};

type SavingsGoal = {
  id: number;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  is_completed: number;
  completed_at: string | null;
};

type BillRow = {
  date: string;
  total: number;
};

type ContributionRow = {
  amount: number;
  date: string;
};

const COLORS = {
  background: '#F5F6FA',
  white: '#FFFFFF',
  navy: '#17233D',
  muted: '#8992A5',
  purple: '#6256F5',
  blue: '#2878E5',
  green: '#16A673',
  red: '#E35D6A',
  orange: '#F2A541',
  border: '#E9ECF2',
};

const formatMoney = (amount: number) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;

const getLocalDate = () => {
  const d = new Date();

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getMonthKey = () => getLocalDate().slice(0, 7);

const parseStoredDate = (value: string): string | null => {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const match = value.match(
    /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/
  );

  if (match) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const index = months.findIndex(
      (m) => m.toLowerCase() === match[2].toLowerCase()
    );

    if (index >= 0) {
      return `${match[3]}-${String(index + 1).padStart(
        2,
        '0'
      )}-${String(Number(match[1])).padStart(2, '0')}`;
    }
  }

  return null;
};

const getMonday = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();

  result.setDate(
    result.getDate() - (day === 0 ? 6 : day - 1)
  );

  result.setHours(0, 0, 0, 0);

  return result;
};

const getProgress = (current: number, target: number) =>
  target <= 0
    ? 0
    : Math.min((current / target) * 100, 100);

const formatGoalDate = (value: string | null) => {
  if (!value) return 'No deadline set';

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) return value;

  return `Target date: ${new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
};

export default function BudgetScreen() {
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(true);

  const [savingsTarget, setSavingsTarget] = useState('0');
  const [spendingLimit, setSpendingLimit] = useState('0');
  const [weeklyAllowance, setWeeklyAllowance] = useState('0');

  const [budgetSaved, setBudgetSaved] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);

  const [monthlySpent, setMonthlySpent] = useState(0);
  const [weeklySpent, setWeeklySpent] = useState(0);
  const [savedThisMonth, setSavedThisMonth] = useState(0);

  const [activeGoals, setActiveGoals] = useState<SavingsGoal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<SavingsGoal[]>([]);

  const [modalType, setModalType] = useState<
    'goal' | 'contribution' | null
  >(null);

  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [contributionAmount, setContributionAmount] = useState('');
  const [selectedGoal, setSelectedGoal] =
    useState<SavingsGoal | null>(null);

  const [confirmationVisible, setConfirmationVisible] =
    useState(false);

  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const monthKey = getMonthKey();

  const showConfirmation = (
    title: string,
    message: string
  ) => {
    setConfirmationTitle(title);
    setConfirmationMessage(message);
    setConfirmationVisible(true);
  };

  const loadBudget = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        // Remove completed goals that have passed their seven-day period.
        await db.runAsync(`
          DELETE FROM savings_goals
          WHERE is_completed = 1
            AND completed_at IS NOT NULL
            AND datetime(completed_at, '+7 days') <= datetime('now')
        `);

        const budget = await db.getFirstAsync<BudgetSettings>(
          `SELECT savings_target, spending_limit, weekly_allowance
           FROM monthly_budgets
           WHERE month_key = ?`,
          monthKey
        );

        setSavingsTarget(
          String(budget?.savings_target ?? 0)
        );

        setSpendingLimit(
          String(budget?.spending_limit ?? 0)
        );

        setWeeklyAllowance(
          String(budget?.weekly_allowance ?? 0)
        );

        setBudgetSaved(!!budget);
        setEditingBudget(!budget);

        // Calculate monthly and weekly spending.
        const bills = await db.getAllAsync<BillRow>(
          'SELECT date, total FROM bills'
        );

        const today = getLocalDate();
        const monday = getMonday(new Date());

        const mondayISO = `${monday.getFullYear()}-${String(
          monday.getMonth() + 1
        ).padStart(2, '0')}-${String(
          monday.getDate()
        ).padStart(2, '0')}`;

        let monthTotal = 0;
        let weekTotal = 0;

        bills.forEach((bill) => {
          const date = parseStoredDate(bill.date);

          if (!date) return;

          const amount = Number(bill.total) || 0;

          if (date.slice(0, 7) === today.slice(0, 7)) {
            monthTotal += amount;
          }

          if (date >= mondayISO && date <= today) {
            weekTotal += amount;
          }
        });

        setMonthlySpent(monthTotal);
        setWeeklySpent(weekTotal);

        // Load active and completed goals.
        const allGoals = await db.getAllAsync<SavingsGoal>(
          `SELECT id, name, target_amount, saved_amount, target_date,
                  is_completed, completed_at
           FROM savings_goals
           ORDER BY created_at DESC, id DESC`
        );

        setActiveGoals(
          allGoals.filter((goal) => goal.is_completed !== 1)
        );

        setCompletedGoals(
          allGoals.filter((goal) => goal.is_completed === 1)
        );

        // Calculate contributions made during the current month.
        const contributions =
          await db.getAllAsync<ContributionRow>(
            `SELECT amount, date
             FROM goal_contributions
             WHERE date LIKE ?`,
            `${today.slice(0, 7)}%`
          );

        setSavedThisMonth(
          contributions.reduce(
            (sum, item) => sum + Number(item.amount || 0),
            0
          )
        );
      } catch (error) {
        console.error('Failed to load budget:', error);

        Alert.alert(
          'Error',
          'Could not load your budget information.'
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [db, monthKey]
  );

  useFocusEffect(
    useCallback(() => {
      void loadBudget();
    }, [loadBudget])
  );

  // Save the monthly budget.
  const saveBudget = async () => {
    const savings = Number(savingsTarget);
    const spending = Number(spendingLimit);
    const weekly = Number(weeklyAllowance);

    if (
      ![savings, spending, weekly].every(
        (n) => Number.isFinite(n) && n >= 0
      )
    ) {
      Alert.alert(
        'Invalid amount',
        'Please enter valid positive amounts.'
      );

      return;
    }

    try {
      await db.runAsync(
        `INSERT INTO monthly_budgets
         (month_key, savings_target, spending_limit, weekly_allowance)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(month_key) DO UPDATE SET
           savings_target = excluded.savings_target,
           spending_limit = excluded.spending_limit,
           weekly_allowance = excluded.weekly_allowance,
           updated_at = CURRENT_TIMESTAMP`,
        monthKey,
        savings,
        spending,
        weekly
      );

      await loadBudget(false);

      setBudgetSaved(true);
      setEditingBudget(false);

      showConfirmation(
        'Budget Saved!',
        'Your monthly budget has been saved successfully.'
      );
    } catch (error) {
      console.error('Failed to save budget:', error);

      Alert.alert(
        'Error',
        'Could not save your budget.'
      );
    }
  };

  // Open the create-goal modal.
  const openGoalModal = () => {
    setGoalName('');
    setGoalTarget('');
    setGoalDate('');
    setShowDatePicker(false);
    setModalType('goal');
  };

  // Create a new savings goal.
  const saveGoal = async () => {
    const name = goalName.trim();
    const target = Number(goalTarget);

    if (!name) {
      return Alert.alert(
        'Missing name',
        'Please enter a name for your goal.'
      );
    }

    if (
      !goalTarget.trim() ||
      !Number.isFinite(target) ||
      target <= 0
    ) {
      return Alert.alert(
        'Invalid target',
        'Please enter a valid target amount.'
      );
    }

    try {
      await db.runAsync(
        `INSERT INTO savings_goals
         (name, target_amount, saved_amount, target_date)
         VALUES (?, ?, 0, ?)`,
        name,
        target,
        goalDate || null
      );

      setModalType(null);
      setShowDatePicker(false);

      await loadBudget(false);

      showConfirmation(
        'Goal Created!',
        `Your savings goal "${name}" has been created successfully.`
      );
    } catch (error) {
      console.error('Failed to create goal:', error);

      Alert.alert(
        'Error',
        'Could not create your savings goal.'
      );
    }
  };

  // Open the contribution modal for a particular goal.
  const openContributionModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setContributionAmount('');
    setModalType('contribution');
  };

  // Add money to a savings goal.
  const saveContribution = async () => {
    const amount = Number(contributionAmount);

    if (
      !contributionAmount.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return Alert.alert(
        'Invalid amount',
        'Enter an amount greater than zero.'
      );
    }

    if (!selectedGoal) return;

    try {
      let completedNow = false;

      await db.withTransactionAsync(async () => {
        const latest = await db.getFirstAsync<{
          saved_amount: number;
          target_amount: number;
          is_completed: number;
          name: string;
        }>(
          `SELECT saved_amount, target_amount, is_completed, name
           FROM savings_goals
           WHERE id = ?`,
          selectedGoal.id
        );

        if (!latest) {
          throw new Error(
            'This savings goal no longer exists.'
          );
        }

        if (latest.is_completed === 1) {
          throw new Error(
            'This goal has already been completed.'
          );
        }

        const newSavedAmount =
          Number(latest.saved_amount) + amount;

        await db.runAsync(
          `UPDATE savings_goals
           SET saved_amount = ?
           WHERE id = ?`,
          newSavedAmount,
          selectedGoal.id
        );

        await db.runAsync(
          `INSERT INTO goal_contributions
           (goal_id, amount, date)
           VALUES (?, ?, ?)`,
          selectedGoal.id,
          amount,
          getLocalDate()
        );

        // If the target has been reached, complete the goal.
        if (newSavedAmount >= Number(latest.target_amount)) {
          completedNow = true;

          await db.runAsync(
            `UPDATE savings_goals
             SET is_completed = 1,
                 completed_at = CURRENT_TIMESTAMP
             WHERE id = ?
               AND is_completed = 0`,
            selectedGoal.id
          );

          // Create a notification for the Home screen.
          await db.runAsync(
            `INSERT INTO notifications
             (title, message, type, goal_id)
             VALUES (?, ?, 'goal_completed', ?)`,
            'Savings goal completed!',
            `Congratulations! You've completed your savings goal: ${latest.name}.`,
            selectedGoal.id
          );
        }
      });

      const goalNameForMessage = selectedGoal.name;

      setModalType(null);
      setSelectedGoal(null);

      await loadBudget(false);

      if (completedNow) {
        showConfirmation(
          'Goal Completed!',
          `Congratulations! You've reached your target for "${goalNameForMessage}". Check the notification bell on Home.`
        );
      } else {
        showConfirmation(
          'Money Added!',
          `${formatMoney(amount)} has been added to "${goalNameForMessage}" successfully.`
        );
      }
    } catch (error) {
      console.error('Failed to add contribution:', error);

      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Could not add money to this goal.'
      );
    }
  };

  // Delete a goal after asking for confirmation.
  const deleteGoal = (
    goal: SavingsGoal,
    completed = false
  ) => {
    Alert.alert(
      completed
        ? 'Delete completed goal?'
        : 'Delete savings goal?',
      `Are you sure you want to delete "${goal.name}"? Its contribution history will also be deleted.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync(
                'DELETE FROM savings_goals WHERE id = ?',
                goal.id
              );

              await loadBudget(false);
            } catch (error) {
              console.error('Failed to delete goal:', error);

              Alert.alert(
                'Error',
                'Could not delete this goal.'
              );
            }
          },
        },
      ]
    );
  };

  const savingsTargetNumber = Number(savingsTarget) || 0;
  const spendingLimitNumber = Number(spendingLimit) || 0;
  const weeklyAllowanceNumber = Number(weeklyAllowance) || 0;

  const monthlyRemaining =
    spendingLimitNumber - monthlySpent;

  const weeklyRemaining =
    weeklyAllowanceNumber - weeklySpent;

  const monthlyProgress = getProgress(
    monthlySpent,
    spendingLimitNumber
  );

  const weeklyProgress = getProgress(
    weeklySpent,
    weeklyAllowanceNumber
  );

  const savingsProgress = getProgress(
    savedThisMonth,
    savingsTargetNumber
  );

  const getLimitColor = (progress: number) =>
    progress >= 100
      ? COLORS.red
      : progress >= 80
        ? COLORS.orange
        : COLORS.green;

  const selectedDate = goalDate
    ? new Date(`${goalDate}T12:00:00`)
    : new Date();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.purple}
        />
      </View>
    );
  }

  // Reusable savings-goal card.
  const renderGoalCard = (
    goal: SavingsGoal,
    completed = false
  ) => {
    const progress = getProgress(
      goal.saved_amount,
      goal.target_amount
    );

    return (
      <View key={goal.id} style={styles.goalCard}>
        <View style={styles.goalTop}>
          <View
            style={[
              styles.goalIcon,
              completed && styles.completedGoalIcon,
            ]}
          >
            <Ionicons
              name={
                completed
                  ? 'trophy'
                  : 'flag-outline'
              }
              size={21}
              color={
                completed
                  ? COLORS.green
                  : COLORS.purple
              }
            />
          </View>

          <View style={styles.goalInfo}>
            <Text style={styles.goalName}>
              {goal.name}
            </Text>

            <Text style={styles.goalDeadline}>
              {completed
                ? `Completed ${
                    goal.completed_at
                      ? new Date(
                          goal.completed_at.replace(' ', 'T') + 'Z'
                        ).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : ''
                  }`
                : formatGoalDate(goal.target_date)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => deleteGoal(goal, completed)}
            style={styles.deleteButton}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={
                completed
                  ? COLORS.red
                  : COLORS.muted
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles.goalAmounts}>
          <Text style={styles.goalSaved}>
            {formatMoney(goal.saved_amount)}
          </Text>

          <Text style={styles.goalTarget}>
            of {formatMoney(goal.target_amount)}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: completed
                  ? COLORS.green
                  : COLORS.purple,
              },
            ]}
          />
        </View>

        <View style={styles.goalBottom}>
          <Text
            style={[
              styles.goalPercentage,
              completed && { color: COLORS.green },
            ]}
          >
            {completed
              ? '100% completed'
              : `${Math.round(progress)}% completed`}
          </Text>

          {!completed ? (
            <TouchableOpacity
              onPress={() => openContributionModal(goal)}
              style={styles.contributeButton}
            >
              <Ionicons
                name="add-circle-outline"
                size={17}
                color={COLORS.purple}
              />

              <Text style={styles.contributeText}>
                Add money
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedPill}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={COLORS.green}
              />

              <Text style={styles.completedPillText}>
                Completed
              </Text>
            </View>
          )}
        </View>

        {completed ? (
          <Text style={styles.autoDeleteNote}>
            Automatically removed after 7 days.
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
              Budget
            </Text>

            <Text style={styles.headerSubtitle}>
              Plan your money. Reach your goals.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="wallet-outline"
              size={23}
              color={COLORS.purple}
            />
          </View>
        </View>

        {/* Monthly savings summary */}
        <View style={styles.savingsCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="sparkles-outline"
                size={20}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.savingsLabel}>
              MONTHLY SAVINGS GOAL
            </Text>
          </View>

          <Text style={styles.savingsAmount}>
            {formatMoney(savedThisMonth)}
          </Text>

          <Text style={styles.savingsSubtext}>
            saved this month of {formatMoney(savingsTargetNumber)}
          </Text>

          <View style={styles.progressTrackLight}>
            <View
              style={[
                styles.progressFillLight,
                { width: `${savingsProgress}%` },
              ]}
            />
          </View>

          <View style={styles.progressLabels}>
            <Text style={styles.lightSmallText}>
              {Math.round(savingsProgress)}% completed
            </Text>

            <Text style={styles.lightSmallText}>
              {formatMoney(
                Math.max(
                  0,
                  savingsTargetNumber - savedThisMonth
                )
              )}{' '}
              to go
            </Text>
          </View>
        </View>

        {/* Monthly spending */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Spending overview
          </Text>

          <Text style={styles.sectionCaption}>
            This month
          </Text>
        </View>

        <View style={styles.spendingCard}>
          <View style={styles.spendingTop}>
            <View>
              <Text style={styles.cardLabel}>
                MONTHLY SPENDING
              </Text>

              <Text style={styles.spentAmount}>
                {formatMoney(monthlySpent)}
              </Text>
            </View>

            <View style={styles.spendingIcon}>
              <Ionicons
                name="calendar-outline"
                size={21}
                color={COLORS.blue}
              />
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${monthlyProgress}%`,
                  backgroundColor: getLimitColor(monthlyProgress),
                },
              ]}
            />
          </View>

          <View style={styles.spendingBottom}>
            <Text style={styles.spendingHint}>
              {spendingLimitNumber > 0
                ? monthlyRemaining >= 0
                  ? `${formatMoney(monthlyRemaining)} remaining`
                  : `${formatMoney(Math.abs(monthlyRemaining))} over limit`
                : 'No monthly limit set'}
            </Text>

            <Text style={styles.spendingHint}>
              Limit: {formatMoney(spendingLimitNumber)}
            </Text>
          </View>
        </View>

        {/* Weekly allowance */}
        <View style={styles.spendingCard}>
          <View style={styles.spendingTop}>
            <View>
              <Text style={styles.cardLabel}>
                THIS WEEK'S ALLOWANCE
              </Text>

              <Text style={styles.spentAmount}>
                {formatMoney(weeklySpent)}
              </Text>
            </View>

            <View
              style={[
                styles.spendingIcon,
                { backgroundColor: '#EAF8F2' },
              ]}
            >
              <Ionicons
                name="trending-up-outline"
                size={21}
                color={COLORS.green}
              />
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${weeklyProgress}%`,
                  backgroundColor: getLimitColor(weeklyProgress),
                },
              ]}
            />
          </View>

          <View style={styles.spendingBottom}>
            <Text style={styles.spendingHint}>
              {weeklyAllowanceNumber > 0
                ? weeklyRemaining >= 0
                  ? `${formatMoney(weeklyRemaining)} remaining`
                  : `${formatMoney(Math.abs(weeklyRemaining))} over allowance`
                : 'No weekly allowance set'}
            </Text>

            <Text style={styles.spendingHint}>
              Limit: {formatMoney(weeklyAllowanceNumber)}
            </Text>
          </View>
        </View>

        {/* Budget settings */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Set your budget
            </Text>

            <Text style={styles.sectionCaption}>
              Monthly
            </Text>
          </View>

          {budgetSaved && !editingBudget ? (
            <View style={styles.savedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={COLORS.green}
              />

              <Text style={styles.savedBadgeText}>
                Saved
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.settingsCard}>
          {budgetSaved && !editingBudget ? (
            <>
              <View style={styles.savedBudgetRow}>
                <Text style={styles.inputLabel}>
                  Monthly savings target
                </Text>

                <Text style={styles.savedBudgetAmount}>
                  {formatMoney(savingsTargetNumber)}
                </Text>
              </View>

              <View style={styles.savedBudgetRow}>
                <Text style={styles.inputLabel}>
                  Monthly spending limit
                </Text>

                <Text style={styles.savedBudgetAmount}>
                  {formatMoney(spendingLimitNumber)}
                </Text>
              </View>

              <View style={styles.savedBudgetRow}>
                <Text style={styles.inputLabel}>
                  Weekly allowance
                </Text>

                <Text style={styles.savedBudgetAmount}>
                  {formatMoney(weeklyAllowanceNumber)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setEditingBudget(true)}
              >
                <Ionicons
                  name="create-outline"
                  size={17}
                  color="#FFFFFF"
                />

                <Text style={styles.saveButtonText}>
                  EDIT BUDGET
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.inputLabel}>
                Monthly savings target
              </Text>

              <View style={styles.amountInput}>
                <Text style={styles.currency}>Rs.</Text>

                <TextInput
                  style={styles.input}
                  value={savingsTarget}
                  onChangeText={setSavingsTarget}
                  keyboardType="decimal-pad"
                  placeholder="Enter savings target"
                  placeholderTextColor="#AAB1BF"
                />
              </View>

              <View style={styles.inputDivider} />

              <Text style={styles.inputLabel}>
                Monthly spending limit
              </Text>

              <View style={styles.amountInput}>
                <Text style={styles.currency}>Rs.</Text>

                <TextInput
                  style={styles.input}
                  value={spendingLimit}
                  onChangeText={setSpendingLimit}
                  keyboardType="decimal-pad"
                  placeholder="Enter spending limit"
                  placeholderTextColor="#AAB1BF"
                />
              </View>

              <View style={styles.inputDivider} />

              <Text style={styles.inputLabel}>
                Weekly allowance
              </Text>

              <View style={styles.amountInput}>
                <Text style={styles.currency}>Rs.</Text>

                <TextInput
                  style={styles.input}
                  value={weeklyAllowance}
                  onChangeText={setWeeklyAllowance}
                  keyboardType="decimal-pad"
                  placeholder="Enter weekly allowance"
                  placeholderTextColor="#AAB1BF"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveBudget}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={17}
                  color="#FFFFFF"
                />

                <Text style={styles.saveButtonText}>
                  SAVE BUDGET
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Active savings goals */}
        <View style={styles.goalsSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                My savings goals
              </Text>

              <Text style={styles.sectionCaption}>
                Keep moving towards what matters.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addGoalButton}
              onPress={openGoalModal}
            >
              <Ionicons
                name="add"
                size={17}
                color="#FFFFFF"
              />

              <Text style={styles.addGoalText}>
                Add Goal
              </Text>
            </TouchableOpacity>
          </View>

          {activeGoals.length === 0 ? (
            <View style={styles.emptyGoals}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="flag-outline"
                  size={27}
                  color={COLORS.purple}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No savings goals yet
              </Text>

              <Text style={styles.emptyDescription}>
                Create a goal for something you're saving for.
                Add money whenever you can and track your progress.
              </Text>

              <TouchableOpacity
                style={styles.emptyButton}
                onPress={openGoalModal}
              >
                <Text style={styles.emptyButtonText}>
                  CREATE YOUR FIRST GOAL
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            activeGoals.map((goal) => renderGoalCard(goal))
          )}
        </View>

        {/* Completed goals */}
        <View style={styles.completedSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                My Completed Goals
              </Text>

              <Text style={styles.sectionCaption}>
                Goals you've successfully achieved.
              </Text>
            </View>

            <View style={styles.completedCount}>
              <Text style={styles.completedCountText}>
                {completedGoals.length}
              </Text>
            </View>
          </View>

          {completedGoals.length === 0 ? (
            <View style={styles.completedEmpty}>
              <Ionicons
                name="trophy-outline"
                size={26}
                color={COLORS.muted}
              />

              <Text style={styles.completedEmptyText}>
                Your completed savings goals will appear here.
              </Text>
            </View>
          ) : (
            completedGoals.map((goal) =>
              renderGoalCard(goal, true)
            )
          )}
        </View>

        <View style={styles.bottomNote}>
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={COLORS.muted}
          />

          <Text style={styles.bottomNoteText}>
            Savings contributions are tracked separately from
            income and expenses. Completed goals are automatically
            removed after seven days.
          </Text>
        </View>

        <View style={{ height: 25 }} />
      </ScrollView>

      {/* Create goal / Add money modal */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalType(null);
          setShowDatePicker(false);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setModalType(null);
            setShowDatePicker(false);
          }}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'goal'
                  ? 'Create savings goal'
                  : 'Add money'}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setModalType(null);
                  setShowDatePicker(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={COLORS.navy}
                />
              </TouchableOpacity>
            </View>

            {modalType === 'goal' ? (
              <>
                <Text style={styles.modalLabel}>
                  Goal name
                </Text>

                <TextInput
                  style={styles.modalInput}
                  value={goalName}
                  onChangeText={setGoalName}
                  placeholder="e.g. New laptop"
                  placeholderTextColor="#AAB1BF"
                />

                <Text style={styles.modalLabel}>
                  Target amount
                </Text>

                <View style={styles.modalAmountInput}>
                  <Text style={styles.currency}>Rs.</Text>

                  <TextInput
                    style={styles.input}
                    value={goalTarget}
                    onChangeText={setGoalTarget}
                    keyboardType="decimal-pad"
                    placeholder="Enter target amount"
                    placeholderTextColor="#AAB1BF"
                  />
                </View>

                <Text style={styles.modalLabel}>
                  Target date (optional)
                </Text>

                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={19}
                    color={COLORS.purple}
                  />

                  <Text
                    style={[
                      styles.datePickerText,
                      !goalDate && styles.datePlaceholder,
                    ]}
                  >
                    {goalDate
                      ? formatGoalDate(goalDate).replace(
                          'Target date: ',
                          ''
                        )
                      : 'Choose a date'}
                  </Text>

                  <Ionicons
                    name="chevron-down"
                    size={17}
                    color={COLORS.muted}
                  />
                </TouchableOpacity>

                {goalDate ? (
                  <TouchableOpacity
                    style={styles.clearDateButton}
                    onPress={() => setGoalDate('')}
                  >
                    <Text style={styles.clearDateText}>
                      Remove date
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {showDatePicker ? (
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={
                        goalDate
                          ? new Date(`${goalDate}T12:00:00`)
                          : new Date()
                      }
                      mode="date"
                      display={
                        Platform.OS === 'android'
                          ? 'calendar'
                          : 'compact'
                      }
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === 'android') {
                          setShowDatePicker(false);
                        }

                        if (
                          event.type === 'set' &&
                          selectedDate
                        ) {
                          const year =
                            selectedDate.getFullYear();

                          const month = String(
                            selectedDate.getMonth() + 1
                          ).padStart(2, '0');

                          const day = String(
                            selectedDate.getDate()
                          ).padStart(2, '0');

                          setGoalDate(
                            `${year}-${month}-${day}`
                          );
                        }
                      }}
                    />
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.modalSubmit}
                  onPress={saveGoal}
                >
                  <Text style={styles.modalSubmitText}>
                    CREATE GOAL
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalDescription}>
                  Add money to your savings goal.
                </Text>

                <Text style={styles.contributionGoalName}>
                  {selectedGoal?.name}
                </Text>

                <Text style={styles.modalLabel}>
                  Amount to add
                </Text>

                <View style={styles.modalAmountInput}>
                  <Text style={styles.currency}>Rs.</Text>

                  <TextInput
                    style={styles.input}
                    value={contributionAmount}
                    onChangeText={setContributionAmount}
                    keyboardType="decimal-pad"
                    placeholder="Enter amount"
                    placeholderTextColor="#AAB1BF"
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={styles.modalSubmit}
                  onPress={saveContribution}
                >
                  <Text style={styles.modalSubmitText}>
                    ADD MONEY
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Success confirmation popup */}
      <Modal
        visible={confirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmationVisible(false)}
      >
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationCard}>
            <View style={styles.confirmationHandle} />

            <View style={styles.confirmationIcon}>
              <Ionicons
                name="checkmark"
                size={30}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.confirmationTitle}>
              {confirmationTitle}
            </Text>

            <Text style={styles.confirmationMessage}>
              {confirmationMessage}
            </Text>

            <TouchableOpacity
              style={styles.confirmationButton}
              onPress={() => setConfirmationVisible(false)}
            >
              <Text style={styles.confirmationButtonText}>
                DONE
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 19,
    paddingTop: 10,
    paddingBottom: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  headerTitle: {
    color: COLORS.navy,
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },
  headerIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#EFEDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsCard: {
    backgroundColor: COLORS.purple,
    borderRadius: 21,
    padding: 20,
    marginBottom: 25,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsLabel: {
    color: '#EAE8FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  savingsAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 18,
  },
  savingsSubtext: {
    color: '#E2DEFF',
    fontSize: 11,
    marginTop: 4,
  },
  progressTrackLight: {
    height: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.23)',
    marginTop: 19,
    overflow: 'hidden',
  },
  progressFillLight: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 9,
  },
  lightSmallText: {
    color: '#EAE8FF',
    fontSize: 10,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
  },
  sectionCaption: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },
  spendingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 17,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  spendingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  spentAmount: {
    color: COLORS.navy,
    fontSize: 21,
    fontWeight: '800',
    marginTop: 5,
  },
  spendingIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 7,
    borderRadius: 10,
    backgroundColor: '#EDF0F5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  spendingBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  spendingHint: {
    color: COLORS.muted,
    fontSize: 10,
  },
  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 28,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E9F8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  savedBadgeText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
  },
  savedBudgetRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  savedBudgetAmount: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    color: COLORS.navy,
    fontWeight: '700',
    marginBottom: 9,
  },
  amountInput: {
    height: 47,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FB',
    borderRadius: 11,
    paddingHorizontal: 13,
  },
  currency: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '700',
    marginRight: 9,
  },
  input: {
    flex: 1,
    height: '100%',
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '700',
  },
  inputDivider: {
    height: 16,
  },
  saveButton: {
    height: 49,
    borderRadius: 13,
    backgroundColor: COLORS.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  addGoalButton: {
    backgroundColor: COLORS.purple,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addGoalText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyGoals: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: '#EFEDFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 13,
  },
  emptyTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyDescription: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 7,
  },
  emptyButton: {
    backgroundColor: COLORS.purple,
    borderRadius: 11,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 17,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  goalsSection: {
    marginBottom: 25,
  },
  goalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EFEDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedGoalIcon: {
    backgroundColor: '#E9F8F0',
  },
  goalInfo: {
    flex: 1,
    marginLeft: 11,
  },
  goalName: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
  },
  goalDeadline: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 17,
    gap: 5,
  },
  goalSaved: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '800',
  },
  goalTarget: {
    color: COLORS.muted,
    fontSize: 11,
  },
  goalBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 11,
  },
  goalPercentage: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  contributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  contributeText: {
    color: COLORS.purple,
    fontSize: 11,
    fontWeight: '800',
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E9F8F0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  completedPillText: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '800',
  },
  completedSection: {
    marginBottom: 15,
  },
  completedCount: {
    backgroundColor: '#E9F8F0',
    borderRadius: 15,
    minWidth: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCountText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  completedEmpty: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  completedEmptyText: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
  },
  autoDeleteNote: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 11,
  },
  bottomNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 3,
  },
  bottomNoteText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 21,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#F1F2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLabel: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 13,
  },
  modalInput: {
    height: 48,
    borderRadius: 11,
    backgroundColor: '#F7F8FB',
    paddingHorizontal: 13,
    color: COLORS.navy,
    fontSize: 14,
  },
  modalAmountInput: {
    height: 48,
    borderRadius: 11,
    backgroundColor: '#F7F8FB',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickerButton: {
    height: 48,
    borderRadius: 11,
    backgroundColor: '#F7F8FB',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  datePickerText: {
    flex: 1,
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '600',
  },
  datePlaceholder: {
    color: '#AAB1BF',
    fontWeight: '400',
  },
  clearDateButton: {
    alignSelf: 'flex-end',
    paddingTop: 8,
  },
  clearDateText: {
    color: COLORS.purple,
    fontSize: 11,
    fontWeight: '700',
  },
  datePickerContainer: {
    marginTop: 10,
    alignItems: 'center',
    backgroundColor: '#F7F8FB',
    borderRadius: 12,
    padding: 8,
  },
  modalSubmit: {
    height: 49,
    borderRadius: 13,
    backgroundColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 23,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  contributionGoalName: {
    color: COLORS.purple,
    fontSize: 15,
    fontWeight: '800',
  },
  modalDescription: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 6,
  },
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmationCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 23,
    paddingBottom: 21,
    borderRadius: 25,
    alignItems: 'center',
  },
  confirmationHandle: {
    width: 42,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#D9DCE3',
    marginBottom: 23,
  },
  confirmationIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },
  confirmationTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#171B28',
    textAlign: 'center',
  },
  confirmationMessage: {
    fontSize: 13,
    color: '#858995',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  confirmationButton: {
    width: '100%',
    height: 48,
    borderRadius: 13,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  confirmationButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
});