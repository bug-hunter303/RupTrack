
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/context/appearance-context';

type TableName =
  | 'bills'
  | 'bill_items'
  | 'income'
  | 'salary_settings'
  | 'monthly_budgets'
  | 'savings_goals'
  | 'goal_contributions'
  | 'notifications'
  | 'notification_preferences'
  | 'app_settings';

type BackupData = {
  app: string;
  backupVersion: number;
  createdAt: string;
  data: Record<TableName, Record<string, unknown>[]>;
};

type StorageCounts = {
  bills: number;
  billItems: number;
  income: number;
  budgets: number;
  goals: number;
  notifications: number;
};

type ModalState = {
  title: string;
  message: string;
  confirmText: string;
  destructive?: boolean;
  action?: 'restore' | 'clear';
} | null;

const TABLES: TableName[] = [
  'bills',
  'bill_items',
  'income',
  'salary_settings',
  'monthly_budgets',
  'savings_goals',
  'goal_contributions',
  'notifications',
  'notification_preferences',
  'app_settings',
];

const INSERT_COLUMNS: Record<TableName, string[]> = {
  bills: [
    'id',
    'name',
    'date',
    'total',
    'is_locked',
    'created_at',
    'updated_at',
  ],
  bill_items: [
    'id',
    'bill_id',
    'name',
    'amount',
  ],
  income: [
    'id',
    'description',
    'amount',
    'type',
    'date',
    'period_key',
    'created_at',
  ],
  salary_settings: [
    'id',
    'amount',
    'credit_day',
    'enabled',
  ],
  monthly_budgets: [
    'month_key',
    'savings_target',
    'spending_limit',
    'weekly_allowance',
    'updated_at',
  ],
  savings_goals: [
    'id',
    'name',
    'target_amount',
    'saved_amount',
    'target_date',
    'created_at',
    'is_completed',
    'completed_at',
  ],
  goal_contributions: [
    'id',
    'goal_id',
    'amount',
    'date',
  ],
  notifications: [
    'id',
    'title',
    'message',
    'type',
    'goal_id',
    'created_at',
    'is_read',
  ],
  notification_preferences: [
    'id',
    'enabled',
    'salary_credits',
    'spending_alerts',
    'budget_warnings',
    'savings_reminders',
    'daily_summary',
  ],
  app_settings: [
    'id',
    'theme_mode',
    'accent_color',
    'currency_code',
    'show_balance',
    'show_savings_goals',
    'show_completed_goals',
    'show_spending_overview',
    'show_recent_transactions',
  ],
};

const EMPTY_COUNTS: StorageCounts = {
  bills: 0,
  billItems: 0,
  income: 0,
  budgets: 0,
  goals: 0,
  notifications: 0,
};

export default function DataManagementScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const { colors, accent, isDark } = useAppearance();
  const styles = createStyles(colors, accent.primary, isDark);

  const [counts, setCounts] = useState<StorageCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  // Holds the selected backup until the user confirms restoration.
  const pendingBackup = useRef<BackupData | null>(null);

  const loadStorageInfo = useCallback(async () => {
    try {
      const [
        bills,
        billItems,
        income,
        budgets,
        goals,
        notifications,
      ] = await Promise.all([
        db.getFirstAsync<{ total: number }>(
          'SELECT COUNT(*) AS total FROM bills'
        ),
        db.getFirstAsync<{ total: number }>(
          'SELECT COUNT(*) AS total FROM bill_items'
        ),
        db.getFirstAsync<{ total: number }>(
          'SELECT COUNT(*) AS total FROM income'
        ),
        db.getFirstAsync<{ total: number }>(
          'SELECT COUNT(*) AS total FROM monthly_budgets'
        ),
        db.getFirstAsync<{ total: number }>(
          'SELECT COUNT(*) AS total FROM savings_goals'
        ),
        db.getFirstAsync<{ total: number }>(
          'SELECT COUNT(*) AS total FROM notifications'
        ),
      ]);

      setCounts({
        bills: bills?.total ?? 0,
        billItems: billItems?.total ?? 0,
        income: income?.total ?? 0,
        budgets: budgets?.total ?? 0,
        goals: goals?.total ?? 0,
        notifications: notifications?.total ?? 0,
      });
    } catch (error) {
      console.error('Could not load storage information:', error);

      setModal({
        title: 'Storage information unavailable',
        message: 'RupeeTrack could not read your database information.',
        confirmText: 'Okay',
      });
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    void loadStorageInfo();
  }, [loadStorageInfo]);

  const createBackupData = async (): Promise<BackupData> => {
    const data = {} as BackupData['data'];

    for (const table of TABLES) {
      data[table] = await db.getAllAsync<Record<string, unknown>>(
        `SELECT * FROM ${table}`
      );
    }

    return {
      app: 'RupeeTrack',
      backupVersion: 1,
      createdAt: new Date().toISOString(),
      data,
    };
  };

  const exportBackup = async () => {
    if (processing) return;

    setProcessing(true);

    try {
      const backup = await createBackupData();

      const date = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `RupeeTrack-Backup-${date}.json`;

      const file = new File(Paths.cache, fileName);

      if (file.exists) {
        file.delete();
      }

      file.create();
      await file.write(JSON.stringify(backup, null, 2));

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        setModal({
          title: 'Sharing unavailable',
          message:
            'Your backup was created, but this device does not support the sharing feature.',
          confirmText: 'Okay',
        });
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Save your RupeeTrack backup',
        UTI: 'public.json',
      });
    } catch (error) {
      console.error('Backup creation failed:', error);

      setModal({
        title: 'Backup failed',
        message:
          'RupeeTrack could not create your backup. Please try again.',
        confirmText: 'Okay',
      });
    } finally {
      setProcessing(false);
    }
  };

  const validateBackup = (
    backup: unknown
  ): backup is BackupData => {
    if (!backup || typeof backup !== 'object') {
      return false;
    }

    const candidate = backup as Partial<BackupData>;

    if (
      candidate.app !== 'RupeeTrack' ||
      candidate.backupVersion !== 1 ||
      !candidate.data ||
      typeof candidate.data !== 'object'
    ) {
      return false;
    }

    for (const table of TABLES) {
      if (!Array.isArray(candidate.data[table])) {
        return false;
      }

      for (const row of candidate.data[table]!) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          return false;
        }

        const allowedColumns = INSERT_COLUMNS[table];

        if (
          Object.keys(row).some(
            (key) => !allowedColumns.includes(key)
          )
        ) {
          return false;
        }
      }
    }

    return true;
  };

  const insertBackupRows = async (
    table: TableName,
    rows: Record<string, unknown>[]
  ) => {
    const allowedColumns = INSERT_COLUMNS[table];

    for (const row of rows) {
      const columns = Object.keys(row).filter((key) =>
        allowedColumns.includes(key)
      );

      if (columns.length === 0) continue;

      const placeholders = columns.map(() => '?').join(', ');
      const columnNames = columns.join(', ');
      const values = columns.map((key) => row[key]);

      await db.runAsync(
        `INSERT INTO ${table} (${columnNames})
         VALUES (${placeholders})`,
        ...(values as any[])
      );
    }
  };

  const restoreBackup = async () => {
    if (processing) return;

    setProcessing(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const selectedFile = new File(result.assets[0].uri);
      const content = await selectedFile.text();

      let parsedBackup: unknown;

      try {
        parsedBackup = JSON.parse(content);
      } catch {
        setModal({
          title: 'Invalid backup',
          message: 'The selected file is not valid JSON.',
          confirmText: 'Okay',
        });
        return;
      }

      if (!validateBackup(parsedBackup)) {
        setModal({
          title: 'Invalid backup',
          message:
            'This file is not a valid RupeeTrack backup or uses an unsupported backup version.',
          confirmText: 'Okay',
        });
        return;
      }

      pendingBackup.current = parsedBackup;

      setModal({
        title: 'Restore this backup?',
        message:
          'Restoring will replace your current bills, income, budgets, savings goals, notification records, and app preferences with the contents of this backup. This cannot be undone. Export your current data first if you want to keep it.',
        confirmText: 'Restore backup',
        destructive: true,
        action: 'restore',
      });
    } catch (error) {
      console.error('Could not select backup:', error);

      setModal({
        title: 'Could not open backup',
        message:
          'RupeeTrack could not read the selected file. Please try another backup file.',
        confirmText: 'Okay',
      });
    } finally {
      setProcessing(false);
    }
  };

  const performRestore = async () => {
    const backup = pendingBackup.current;

    if (!backup || processing) return;

    setProcessing(true);
    setModal(null);

    try {
      await db.withTransactionAsync(async () => {
        // Delete child records before parent records.
        await db.runAsync('DELETE FROM goal_contributions');
        await db.runAsync('DELETE FROM bill_items');
        await db.runAsync('DELETE FROM notifications');
        await db.runAsync('DELETE FROM bills');
        await db.runAsync('DELETE FROM income');
        await db.runAsync('DELETE FROM salary_settings');
        await db.runAsync('DELETE FROM monthly_budgets');
        await db.runAsync('DELETE FROM savings_goals');
        await db.runAsync('DELETE FROM notification_preferences');
        await db.runAsync('DELETE FROM app_settings');

        // Restore parent records before child records.
        await insertBackupRows('bills', backup.data.bills);
        await insertBackupRows('income', backup.data.income);
        await insertBackupRows(
          'salary_settings',
          backup.data.salary_settings
        );
        await insertBackupRows(
          'monthly_budgets',
          backup.data.monthly_budgets
        );
        await insertBackupRows(
          'savings_goals',
          backup.data.savings_goals
        );
        await insertBackupRows('bill_items', backup.data.bill_items);
        await insertBackupRows(
          'goal_contributions',
          backup.data.goal_contributions
        );
        await insertBackupRows(
          'notifications',
          backup.data.notifications
        );
        await insertBackupRows(
          'notification_preferences',
          backup.data.notification_preferences
        );
        await insertBackupRows(
          'app_settings',
          backup.data.app_settings
        );

        // Ensure default preference rows exist if absent.
        await db.runAsync(`
          INSERT OR IGNORE INTO app_settings (id)
          VALUES (1)
        `);

        await db.runAsync(`
          INSERT OR IGNORE INTO notification_preferences (id)
          VALUES (1)
        `);
      });

      pendingBackup.current = null;

      await loadStorageInfo();

      setModal({
        title: 'Backup restored',
        message:
          'Your RupeeTrack data has been successfully restored. Restart the app to refresh all screens and preferences.',
        confirmText: 'Done',
      });
    } catch (error) {
      console.error('Backup restoration failed:', error);

      setModal({
        title: 'Restore failed',
        message:
          'Your backup could not be restored. The database transaction was rolled back, so your previous records should remain unchanged.',
        confirmText: 'Okay',
      });
    } finally {
      setProcessing(false);
    }
  };

  const clearAllData = async () => {
    if (processing) return;

    setProcessing(true);
    setModal(null);

    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM goal_contributions');
        await db.runAsync('DELETE FROM bill_items');
        await db.runAsync('DELETE FROM notifications');
        await db.runAsync('DELETE FROM bills');
        await db.runAsync('DELETE FROM income');
        await db.runAsync('DELETE FROM salary_settings');
        await db.runAsync('DELETE FROM monthly_budgets');
        await db.runAsync('DELETE FROM savings_goals');
        await db.runAsync('DELETE FROM notification_preferences');
        await db.runAsync('DELETE FROM app_settings');

        await db.runAsync(`
          INSERT OR IGNORE INTO app_settings (id)
          VALUES (1)
        `);

        await db.runAsync(`
          INSERT OR IGNORE INTO notification_preferences (id)
          VALUES (1)
        `);
      });

      await loadStorageInfo();

      setModal({
        title: 'Data cleared',
        message:
          'Your financial records have been cleared. Your database structure remains intact.',
        confirmText: 'Okay',
      });
    } catch (error) {
      console.error('Could not clear database:', error);

      setModal({
        title: 'Could not clear data',
        message:
          'RupeeTrack could not complete the operation. Your database transaction was rolled back.',
        confirmText: 'Okay',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleModalConfirm = () => {
    const action = modal?.action;

    if (action === 'restore') {
      void performRestore();
    } else if (action === 'clear') {
      void clearAllData();
    } else {
      setModal(null);
    }
  };

  const storageItems = [
    {
      title: 'Bills',
      value: counts.bills,
      icon: 'receipt-outline' as const,
      color: '#DB6373',
      background: isDark ? '#40262D' : '#FDECEF',
    },
    {
      title: 'Bill items',
      value: counts.billItems,
      icon: 'list-outline' as const,
      color: '#E49A35',
      background: isDark ? '#3B3021' : '#FFF2E2',
    },
    {
      title: 'Income records',
      value: counts.income,
      icon: 'wallet-outline' as const,
      color: '#2878E5',
      background: isDark ? '#1D304A' : '#E8F2FF',
    },
    {
      title: 'Monthly budgets',
      value: counts.budgets,
      icon: 'pie-chart-outline' as const,
      color: '#8B7FF7',
      background: isDark ? '#292442' : '#F0EDFF',
    },
    {
      title: 'Savings goals',
      value: counts.goals,
      icon: 'flag-outline' as const,
      color: '#16A673',
      background: isDark ? '#18372E' : '#E7F8F0',
    },
    {
      title: 'Notifications',
      value: counts.notifications,
      icon: 'notifications-outline' as const,
      color: '#8291A7',
      background: isDark ? '#293241' : '#EDF1F6',
    },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={23}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.headerTitle}>Data Management</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.introSection}>
          <View style={styles.introIcon}>
            <Ionicons
              name="server-outline"
              size={29}
              color={accent.primary}
            />
          </View>

          <Text style={styles.introTitle}>
            Your data, your control
          </Text>

          <Text style={styles.introDescription}>
            Keep your financial information safe. Export backups
            and manage your stored records whenever you need.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>BACKUP & RESTORE</Text>

        <View style={styles.actionCard}>
          <Pressable
            style={styles.actionItem}
            onPress={exportBackup}
            disabled={processing}
          >
            <View style={[styles.itemIcon, styles.blueIcon]}>
              <Ionicons
                name="cloud-download-outline"
                size={22}
                color="#2878E5"
              />
            </View>

            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>
                Export / Create backup
              </Text>
              <Text style={styles.itemDescription}>
                Save all your RupeeTrack data as a JSON backup file.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={colors.muted}
            />
          </Pressable>

          <View style={styles.separator} />

          <Pressable
            style={styles.actionItem}
            onPress={restoreBackup}
            disabled={processing}
          >
            <View style={[styles.itemIcon, styles.greenIcon]}>
              <Ionicons
                name="cloud-upload-outline"
                size={22}
                color="#16A673"
              />
            </View>

            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>Restore backup</Text>
              <Text style={styles.itemDescription}>
                Import a previously exported RupeeTrack backup.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={colors.muted}
            />
          </Pressable>
        </View>

        <View style={styles.warningCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={accent.primary}
          />

          <Text style={styles.warningText}>
            Keep a backup somewhere safe. Restoring a backup
            replaces your current records.
          </Text>
        </View>

        <View style={styles.storageHeader}>
          <Text style={styles.sectionTitle}>
            STORAGE INFORMATION
          </Text>

          <Pressable
            onPress={loadStorageInfo}
            disabled={loading || processing}
          >
            <Ionicons
              name="refresh-outline"
              size={19}
              color={accent.primary}
            />
          </Pressable>
        </View>

        <View style={styles.storageCard}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator
                size="small"
                color={accent.primary}
              />
              <Text style={styles.loadingText}>
                Reading your database...
              </Text>
            </View>
          ) : (
            <View style={styles.storageGrid}>
              {storageItems.map((item) => (
                <View key={item.title} style={styles.storageItem}>
                  <View
                    style={[
                      styles.storageIcon,
                      { backgroundColor: item.background },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={19}
                      color={item.color}
                    />
                  </View>

                  <View style={styles.storageText}>
                    <Text style={styles.storageValue}>
                      {item.value.toLocaleString()}
                    </Text>
                    <Text style={styles.storageLabel}>
                      {item.title}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.storageFootnote}>
          Counts show records stored locally on this device.
        </Text>

        <Text style={styles.sectionTitle}>DANGER ZONE</Text>

        <View style={styles.dangerCard}>
          <View style={styles.dangerItem}>
            <View style={styles.dangerIcon}>
              <Ionicons
                name="trash-outline"
                size={22}
                color="#D65353"
              />
            </View>

            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>Clear all data</Text>
              <Text style={styles.itemDescription}>
                Permanently delete your financial records and
                saved app preferences.
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.clearButton}
            disabled={processing}
            onPress={() =>
              setModal({
                title: 'Clear all data?',
                message:
                  'This will permanently delete your bills, income, salary settings, budgets, savings goals, notifications, and saved app preferences. This action cannot be undone. Create a backup first if you might need this information.',
                confirmText: 'Clear everything',
                destructive: true,
                action: 'clear',
              })
            }
          >
            <Text style={styles.clearButtonText}>
              Clear all data
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Ionicons
            name="lock-closed-outline"
            size={15}
            color={colors.muted}
          />
          <Text style={styles.footerText}>
            Your RupeeTrack database is stored locally on your device.
          </Text>
        </View>
      </ScrollView>

      {processing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator
              size="large"
              color={accent.primary}
            />
            <Text style={styles.processingText}>
              Please wait...
            </Text>
          </View>
        </View>
      )}

      {modal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIcon,
                modal.destructive && styles.modalDangerIcon,
              ]}
            >
              <Ionicons
                name={
                  modal.destructive
                    ? 'warning-outline'
                    : 'information-circle-outline'
                }
                size={28}
                color={
                  modal.destructive ? '#D65353' : accent.primary
                }
              />
            </View>

            <Text style={styles.modalTitle}>
              {modal.title}
            </Text>

            <Text style={styles.modalMessage}>
              {modal.message}
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  pendingBackup.current = null;
                  setModal(null);
                }}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmButton,
                  modal.destructive && styles.destructiveButton,
                ]}
                onPress={handleModalConfirm}
              >
                <Text style={styles.confirmButtonText}>
                  {modal.confirmText}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
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
    input: string;
  },
  primary: string,
  isDark: boolean
) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    header: {
      height: 58,
      paddingHorizontal: 19,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    backButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },

    headerTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },

    headerSpacer: {
      width: 38,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 15,
      paddingBottom: 45,
    },

    introSection: {
      alignItems: 'center',
      paddingVertical: 18,
      marginBottom: 18,
    },

    introIcon: {
      width: 66,
      height: 66,
      borderRadius: 22,
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 13,
    },

    introTitle: {
      color: colors.text,
      fontSize: 21,
      fontWeight: '800',
    },

    introDescription: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: 7,
      paddingHorizontal: 12,
    },

    sectionTitle: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.3,
      marginBottom: 12,
      marginLeft: 3,
    },

    actionCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },

    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 17,
    },

    itemIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },

    blueIcon: {
      backgroundColor: isDark ? '#1D304A' : '#E8F2FF',
    },

    greenIcon: {
      backgroundColor: isDark ? '#18372E' : '#E7F8F0',
    },

    itemText: {
      flex: 1,
      paddingRight: 8,
    },

    itemTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },

    itemDescription: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 4,
    },

    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 57,
    },

    warningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginTop: 14,
      marginBottom: 27,
    },

    warningText: {
      flex: 1,
      color: colors.muted,
      fontSize: 10,
      lineHeight: 16,
    },

    storageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    storageCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },

    storageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 20,
    },

    storageItem: {
      width: '50%',
      flexDirection: 'row',
      alignItems: 'center',
    },

    storageIcon: {
      width: 39,
      height: 39,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 9,
    },

    storageText: {
      flex: 1,
    },

    storageValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },

    storageLabel: {
      color: colors.muted,
      fontSize: 9,
      marginTop: 3,
    },

    storageFootnote: {
      color: colors.muted,
      fontSize: 9,
      marginTop: 9,
      marginBottom: 26,
      marginLeft: 3,
    },

    loadingWrap: {
      minHeight: 90,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },

    loadingText: {
      color: colors.muted,
      fontSize: 11,
    },

    dangerCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#59343A' : '#F2D8DC',
      padding: 15,
    },

    dangerItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    dangerIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: isDark ? '#40262D' : '#FDECEF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },

    clearButton: {
      height: 45,
      borderRadius: 12,
      backgroundColor: isDark ? '#48272D' : '#FFF0F0',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 17,
    },

    clearButtonText: {
      color: '#D65353',
      fontSize: 12,
      fontWeight: '800',
    },

    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 7,
      marginTop: 25,
    },

    footerText: {
      color: colors.muted,
      fontSize: 9,
    },

    processingOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(17, 24, 39, 0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5,
    },

    processingCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 30,
      paddingVertical: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },

    processingText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 12,
    },

    modalOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(17, 24, 39, 0.58)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 23,
      zIndex: 10,
    },

    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 22,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },

    modalIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },

    modalDangerIcon: {
      backgroundColor: isDark ? '#40262D' : '#FDECEF',
    },

    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },

    modalMessage: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: 9,
    },

    modalActions: {
      flexDirection: 'row',
      width: '100%',
      gap: 10,
      marginTop: 22,
    },

    cancelButton: {
      flex: 1,
      height: 45,
      borderRadius: 12,
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cancelButtonText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },

    confirmButton: {
      flex: 1,
      minHeight: 45,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    destructiveButton: {
      backgroundColor: '#D65353',
    },

    confirmButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
      textAlign: 'center',
    },
  });
}
