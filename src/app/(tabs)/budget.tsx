
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getMonthKey = () => getLocalDate().slice(0, 7);

const parseStoredDate = (value: string): string | null => {
  if (!value) return null;

  // ISO date: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  // Existing RupeeTrack date format: DD MMM YYYY
  const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);

  if (match) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const monthIndex = months.findIndex(
      (month) => month.toLowerCase() === match[2].toLowerCase()
    );

    if (monthIndex !== -1) {
      return `${match[3]}-${String(monthIndex + 1).padStart(2, '0')}-${String(
        Number(match[1])
      ).padStart(2, '0')}`;
    }
  }

  return null;
};

const getMonday = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
};

const getProgress = (current: number, target: number) => {
  if (target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
};

export default function BudgetScreen() {
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(true);

  const [savingsTarget, setSavingsTarget] = useState('0');
  const [spendingLimit, setSpendingLimit] = useState('0');
  const [weeklyAllowance, setWeeklyAllowance] = useState('0');

  const [monthlySpent, setMonthlySpent] = useState(0);
  const [weeklySpent, setWeeklySpent] = useState(0);
  const [savedThisMonth, setSavedThisMonth] = useState(0);

  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  const [modalType, setModalType] = useState<'goal' | 'contribution' | null>(
    null
  );

  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDate, setGoalDate] = useState('');

  const [contributionAmount, setContributionAmount] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  const monthKey = getMonthKey();

  const loadBudget = useCallback(async () => {
    try {
      setLoading(true);

      const budget = await db.getFirstAsync<BudgetSettings>(
        `SELECT savings_target, spending_limit, weekly_allowance
         FROM monthly_budgets
         WHERE month_key = ?`,
        monthKey
      );

      setSavingsTarget(String(budget?.savings_target ?? 0));
      setSpendingLimit(String(budget?.spending_limit ?? 0));
      setWeeklyAllowance(String(budget?.weekly_allowance ?? 0));

      // Load all bills and calculate spending using their stored dates.
      const bills = await db.getAllAsync<BillRow>(
        'SELECT date, total FROM bills'
      );

      const today = getLocalDate();
      const currentMonth = today.slice(0, 7);
      const monday = getMonday(new Date());

      const mondayISO = [
        monday.getFullYear(),
        String(monday.getMonth() + 1).padStart(2, '0'),
        String(monday.getDate()).padStart(2, '0'),
      ].join('-');

      let monthTotal = 0;
      let weekTotal = 0;

      bills.forEach((bill) => {
        const date = parseStoredDate(bill.date);
        if (!date) return;

        const amount = Number(bill.total) || 0;

        if (date.slice(0, 7) === currentMonth) {
          monthTotal += amount;
        }

        if (date >= mondayISO && date <= today) {
          weekTotal += amount;
        }
      });

      setMonthlySpent(monthTotal);
      setWeeklySpent(weekTotal);

      // Load savings goals.
      const savedGoals = await db.getAllAsync<SavingsGoal>(
        `SELECT id, name, target_amount, saved_amount, target_date
         FROM savings_goals
         ORDER BY created_at DESC, id DESC`
      );

      setGoals(savedGoals);

      // Sum contributions made during the current month.
      const contributions = await db.getAllAsync<ContributionRow>(
        `SELECT amount, date
         FROM goal_contributions
         WHERE date LIKE ?`,
        `${currentMonth}%`
      );

      const monthlySavings = contributions.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

      setSavedThisMonth(monthlySavings);
    } catch (error) {
      console.error('Failed to load budget:', error);
      Alert.alert('Error', 'Could not load your budget information.');
    } finally {
      setLoading(false);
    }
  }, [db, monthKey]);

  useFocusEffect(
    useCallback(() => {
      void loadBudget();
    }, [loadBudget])
  );

  const saveBudget = async () => {
    const savings = Number(savingsTarget);
    const spending = Number(spendingLimit);
    const weekly = Number(weeklyAllowance);

    if (
      !Number.isFinite(savings) ||
      !Number.isFinite(spending) ||
      !Number.isFinite(weekly) ||
      savings < 0 ||
      spending < 0 ||
      weekly < 0
    ) {
      Alert.alert('Invalid amount', 'Please enter valid positive amounts.');
      return;
    }

    try {
      await db.runAsync(
        `INSERT INTO monthly_budgets (
          month_key, savings_target, spending_limit, weekly_allowance
        )
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

      Alert.alert('Saved', 'Your budget has been updated.');
      await loadBudget();
    } catch (error) {
      console.error('Failed to save budget:', error);
      Alert.alert('Error', 'Could not save your budget.');
    }
  };

  const openGoalModal = () => {
    setGoalName('');
    setGoalTarget('');
    setGoalDate('');
    setModalType('goal');
  };

  const saveGoal = async () => {
    const name = goalName.trim();
    const target = Number(goalTarget);

    if (!name) {
      Alert.alert('Missing name', 'Please enter a name for your goal.');
      return;
    }

    if (!goalTarget.trim() || !Number.isFinite(target) || target <= 0) {
      Alert.alert('Invalid target', 'Please enter a valid target amount.');
      return;
    }

    const date = goalDate.trim();

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Invalid date', 'Use the format YYYY-MM-DD.');
      return;
    }

    try {
      await db.runAsync(
        `INSERT INTO savings_goals (
          name, target_amount, saved_amount, target_date
        ) VALUES (?, ?, 0, ?)`,
        name,
        target,
        date || null
      );

      setModalType(null);
      await loadBudget();
    } catch (error) {
      console.error('Failed to create goal:', error);
      Alert.alert('Error', 'Could not create your savings goal.');
    }
  };

  const openContributionModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setContributionAmount('');
    setModalType('contribution');
  };

  const saveContribution = async () => {
    const amount = Number(contributionAmount);

    if (
      !contributionAmount.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }

    if (!selectedGoal) return;

    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `UPDATE savings_goals
           SET saved_amount = saved_amount + ?
           WHERE id = ?`,
          amount,
          selectedGoal.id
        );

        await db.runAsync(
          `INSERT INTO goal_contributions (goal_id, amount, date)
           VALUES (?, ?, ?)`,
          selectedGoal.id,
          amount,
          getLocalDate()
        );
      });

      setModalType(null);
      setSelectedGoal(null);
      await loadBudget();
    } catch (error) {
      console.error('Failed to add contribution:', error);
      Alert.alert('Error', 'Could not add money to this goal.');
    }
  };

  const deleteGoal = (goal: SavingsGoal) => {
    Alert.alert(
      'Delete savings goal?',
      `Are you sure you want to delete "${goal.name}"? Its contribution history will also be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync(
                'DELETE FROM savings_goals WHERE id = ?',
                goal.id
              );
              await loadBudget();
            } catch (error) {
              console.error('Failed to delete goal:', error);
              Alert.alert('Error', 'Could not delete this goal.');
            }
          },
        },
      ]
    );
  };

  const savingsTargetNumber = Number(savingsTarget) || 0;
  const spendingLimitNumber = Number(spendingLimit) || 0;
  const weeklyAllowanceNumber = Number(weeklyAllowance) || 0;

  const monthlyRemaining = spendingLimitNumber - monthlySpent;
  const weeklyRemaining = weeklyAllowanceNumber - weeklySpent;

  const monthlyProgress = getProgress(monthlySpent, spendingLimitNumber);
  const weeklyProgress = getProgress(weeklySpent, weeklyAllowanceNumber);
  const savingsProgress = getProgress(savedThisMonth, savingsTargetNumber);

  const getLimitColor = (progress: number) => {
    if (progress >= 100) return COLORS.red;
    if (progress >= 80) return COLORS.orange;
    return COLORS.green;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.purple} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Budget</Text>
            <Text style={styles.headerSubtitle}>
              Plan your money. Reach your goals.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="wallet-outline" size={23} color={COLORS.purple} />
          </View>
        </View>

        {/* Monthly savings */}
        <View style={styles.savingsCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.savingsLabel}>MONTHLY SAVINGS GOAL</Text>
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
              {formatMoney(Math.max(0, savingsTargetNumber - savedThisMonth))}{' '}
              to go
            </Text>
          </View>
        </View>

        {/* Spending overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Spending overview</Text>
          <Text style={styles.sectionCaption}>This month</Text>
        </View>

        <View style={styles.spendingCard}>
          <View style={styles.spendingTop}>
            <View>
              <Text style={styles.cardLabel}>MONTHLY SPENDING</Text>
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
              <Text style={styles.cardLabel}>THIS WEEK'S ALLOWANCE</Text>
              <Text style={styles.spentAmount}>
                {formatMoney(weeklySpent)}
              </Text>
            </View>

            <View style={[styles.spendingIcon, { backgroundColor: '#EAF8F2' }]}>
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
          <Text style={styles.sectionTitle}>Set your budget</Text>
          <Text style={styles.sectionCaption}>Monthly</Text>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.inputLabel}>Monthly savings target</Text>
          <View style={styles.amountInput}>
            <Text style={styles.currency}>Rs.</Text>
            <TextInput
              style={styles.input}
              value={savingsTarget}
              onChangeText={setSavingsTarget}
              keyboardType="decimal-pad"
              placeholder="5000"
              placeholderTextColor="#AAB1BF"
            />
          </View>

          <View style={styles.inputDivider} />

          <Text style={styles.inputLabel}>Monthly spending limit</Text>
          <View style={styles.amountInput}>
            <Text style={styles.currency}>Rs.</Text>
            <TextInput
              style={styles.input}
              value={spendingLimit}
              onChangeText={setSpendingLimit}
              keyboardType="decimal-pad"
              placeholder="20000"
              placeholderTextColor="#AAB1BF"
            />
          </View>

          <View style={styles.inputDivider} />

          <Text style={styles.inputLabel}>Weekly spending allowance</Text>
          <View style={styles.amountInput}>
            <Text style={styles.currency}>Rs.</Text>
            <TextInput
              style={styles.input}
              value={weeklyAllowance}
              onChangeText={setWeeklyAllowance}
              keyboardType="decimal-pad"
              placeholder="5000"
              placeholderTextColor="#AAB1BF"
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveBudget}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={19} color="#FFF" />
            <Text style={styles.saveButtonText}>SAVE BUDGET</Text>
          </TouchableOpacity>
        </View>

        {/* Savings goals */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>My savings goals</Text>
            <Text style={styles.sectionCaption}>
              Little by little, reach something big.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addGoalButton}
            onPress={openGoalModal}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addGoalText}>Add goal</Text>
          </TouchableOpacity>
        </View>

        {goals.length === 0 ? (
          <View style={styles.emptyGoals}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="flag-outline"
                size={27}
                color={COLORS.purple}
              />
            </View>
            <Text style={styles.emptyTitle}>No savings goals yet</Text>
            <Text style={styles.emptyDescription}>
              Create your first goal and start saving for something important.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={openGoalModal}
            >
              <Text style={styles.emptyButtonText}>Create a goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals.map((goal) => {
            const progress = getProgress(
              goal.saved_amount,
              goal.target_amount
            );

            const completed = goal.saved_amount >= goal.target_amount;

            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalTop}>
                  <View style={styles.goalIcon}>
                    <Ionicons
                      name={completed ? 'trophy-outline' : 'flag-outline'}
                      size={21}
                      color={completed ? COLORS.green : COLORS.purple}
                    />
                  </View>

                  <View style={styles.goalInfo}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Text style={styles.goalDeadline}>
                      {completed
                        ? 'Goal completed!'
                        : goal.target_date
                          ? `Target date: ${goal.target_date}`
                          : 'No deadline set'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => deleteGoal(goal)}
                    style={styles.deleteButton}
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={19}
                      color={COLORS.muted}
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
                  <Text style={styles.goalPercentage}>
                    {Math.round(progress)}% completed
                  </Text>

                  {!completed && (
                    <TouchableOpacity
                      onPress={() => openContributionModal(goal)}
                      style={styles.contributeButton}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={17}
                        color={COLORS.purple}
                      />
                      <Text style={styles.contributeText}>Add money</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={styles.bottomNote}>
          <Ionicons
            name="information-circle-outline"
            size={17}
            color={COLORS.muted}
          />
          <Text style={styles.bottomNoteText}>
            Savings contributions are tracked separately. They do not count as
            new income or expenses.
          </Text>
        </View>
      </ScrollView>

      {/* Add goal / contribution modal */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModalType(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'goal'
                  ? 'Create savings goal'
                  : 'Add money to goal'}
              </Text>

              <TouchableOpacity
                onPress={() => setModalType(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={21} color={COLORS.navy} />
              </TouchableOpacity>
            </View>

            {modalType === 'goal' ? (
              <>
                <Text style={styles.modalLabel}>What are you saving for?</Text>
                <TextInput
                  style={styles.modalInput}
                  value={goalName}
                  onChangeText={setGoalName}
                  placeholder="e.g. New laptop"
                  placeholderTextColor="#AAB1BF"
                />

                <Text style={styles.modalLabel}>Target amount</Text>
                <View style={styles.modalAmountInput}>
                  <Text style={styles.currency}>Rs.</Text>
                  <TextInput
                    style={styles.input}
                    value={goalTarget}
                    onChangeText={setGoalTarget}
                    keyboardType="decimal-pad"
                    placeholder="50000"
                    placeholderTextColor="#AAB1BF"
                  />
                </View>

                <Text style={styles.modalLabel}>
                  Target date (optional)
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={goalDate}
                  onChangeText={setGoalDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#AAB1BF"
                />

                <TouchableOpacity
                  style={styles.modalSubmit}
                  onPress={saveGoal}
                >
                  <Text style={styles.modalSubmitText}>CREATE GOAL</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.contributionGoalName}>
                  {selectedGoal?.name}
                </Text>

                <Text style={styles.modalDescription}>
                  Current savings: {formatMoney(selectedGoal?.saved_amount ?? 0)}
                </Text>

                <Text style={styles.modalLabel}>Amount to add</Text>
                <View style={styles.modalAmountInput}>
                  <Text style={styles.currency}>Rs.</Text>
                  <TextInput
                    style={styles.input}
                    value={contributionAmount}
                    onChangeText={setContributionAmount}
                    keyboardType="decimal-pad"
                    placeholder="1000"
                    placeholderTextColor="#AAB1BF"
                  />
                </View>

                <TouchableOpacity
                  style={styles.modalSubmit}
                  onPress={saveContribution}
                >
                  <Text style={styles.modalSubmitText}>ADD TO SAVINGS</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 115,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 23,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.navy,
  },
  headerSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
  },
  headerIcon: {
    height: 45,
    width: 45,
    borderRadius: 15,
    backgroundColor: '#EFEDFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsCard: {
    backgroundColor: COLORS.purple,
    borderRadius: 23,
    padding: 21,
    marginBottom: 27,
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
    backgroundColor: 'rgba(255,255,255,0.19)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsLabel: {
    color: '#E5E2FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  savingsAmount: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '800',
    marginTop: 19,
  },
  savingsSubtext: {
    color: '#E5E2FF',
    fontSize: 12,
    marginTop: 4,
  },
  progressTrackLight: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 22,
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
    color: '#E5E2FF',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.navy,
  },
  sectionCaption: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },
  spendingCard: {
    backgroundColor: COLORS.white,
    padding: 18,
    borderRadius: 19,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  spendingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  spentAmount: {
    fontSize: 23,
    color: COLORS.navy,
    fontWeight: '800',
    marginTop: 6,
  },
  spendingIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EDF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 7,
    borderRadius: 10,
    backgroundColor: '#EDF0F5',
    overflow: 'hidden',
    marginTop: 17,
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  spendingBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  spendingHint: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 28,
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
});
