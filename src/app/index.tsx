import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const spendingData = [
  { day: 'Mon', amount: 2200, height: 80 },
  { day: 'Tue', amount: 2800, height: 106 },
  { day: 'Wed', amount: 1300, height: 50 },
  { day: 'Thu', amount: 3300, height: 128 },
  { day: 'Fri', amount: 2100, height: 76 },
  { day: 'Sat', amount: 1200, height: 48 },
  { day: 'Sun', amount: 700, height: 25 },
];

const transactions = [
  {
    title: 'Whole Foods Market',
    subtitle: 'Bill 1 · Today',
    amount: '-Rs. 1,000',
    icon: 'cart',
    color: '#72C94C',
  },
  {
    title: 'Salary',
    subtitle: 'Monthly income',
    amount: '+Rs. 7,650',
    icon: 'wallet',
    color: '#299DFA',
  },
  {
    title: 'Daraz',
    subtitle: 'Bill 2 · Yesterday',
    amount: '-Rs. 950',
    icon: 'bag-handle',
    color: '#9861F5',
  },
];

function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable>
          <Text style={styles.actionText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
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

          <Pressable style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={23} color="#777D89" />
            <View style={styles.notificationDot} />
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
              <Ionicons name="eye-outline" size={17} color="#FFFFFF" />
            </View>

            <Pressable style={styles.cardArrow}>
              <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          <Text style={styles.balanceAmount}>Rs. 4,820</Text>

          <View style={styles.balanceDetails}>
            <View style={styles.balanceColumn}>
              <Text style={styles.detailLabel}>Income</Text>
              <Text style={styles.detailAmount}>Rs. 7,650</Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.balanceColumn}>
              <Text style={styles.detailLabel}>Expenses</Text>
              <Text style={styles.detailAmount}>Rs. 2,829</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Spending Overview */}
        <View style={styles.spendingSection}>
          <SectionHeading title="Spending Overview" />

          <View style={styles.chartHeader}>
            <Text style={styles.chartPeriod}>This Week</Text>
            <View style={styles.periodSelector}>
              <Text style={styles.periodText}>This Week</Text>
              <Ionicons name="chevron-down" size={14} color="#777D89" />
            </View>
          </View>

          <View style={styles.chart}>
            <View style={styles.yAxis}>
              {['Rs. 5K', 'Rs. 4K', 'Rs. 3K', 'Rs. 2K', 'Rs. 1K'].map(
                (label) => (
                  <Text key={label} style={styles.axisLabel}>
                    {label}
                  </Text>
                ),
              )}
            </View>

            <View style={styles.chartContent}>
              <View style={styles.gridLines}>
                {[0, 1, 2, 3, 4].map((line) => (
                  <View key={line} style={styles.gridLine} />
                ))}
              </View>

              <View style={styles.bars}>
                {spendingData.map((item) => (
                  <View key={item.day} style={styles.barColumn}>
                    <View
                      style={[styles.bar, { height: item.height }]}
                    />
                    <Text style={styles.dayLabel}>{item.day}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <SectionHeading title="Recent Transactions" action="View All" />

          <View style={styles.transactionsCard}>
            {transactions.map((item, index) => (
              <View
                key={item.title}
                style={[
                  styles.transactionRow,
                  index !== transactions.length - 1 && styles.transactionBorder,
                ]}
              >
                <View
                  style={[styles.transactionIcon, { backgroundColor: item.color }]}
                >
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={19}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{item.title}</Text>
                  <Text style={styles.transactionSubtitle}>{item.subtitle}</Text>
                </View>

                <Text
                  style={[
                    styles.transactionAmount,
                    item.amount.startsWith('+') && styles.incomeAmount,
                  ]}
                >
                  {item.amount}
                </Text>
              </View>
            ))}
          </View>
        </View>
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
  notificationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1687FF',
    position: 'absolute',
    top: 3,
    right: 2,
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
    fontSize: 40,
    fontWeight: '500',
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
    width: 34,
    justifyContent: 'space-between',
    paddingBottom: 25,
    paddingTop: 1,
  },
  axisLabel: {
    fontSize: 9,
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
    paddingBottom: 0,
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
  dayLabel: {
    fontSize: 10,
    color: '#858995',
    height: 17,
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
    width: 32,
    height: 32,
    borderRadius: 17,
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
    fontWeight: '500',
  },
  transactionSubtitle: {
    color: '#9296A0',
    fontSize: 10,
  },
  transactionAmount: {
    color: '#171B28',
    fontSize: 11,
    fontWeight: '500',
  },
  incomeAmount: {
    color: '#16A36A',
  },
});