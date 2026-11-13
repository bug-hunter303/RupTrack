
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAppearance } from '@/context/appearance-context';

type BillItem = {
  id: string;
  name: string;
  amount: string;
};

type BillRow = {
  id: number;
  name: string;
  date: string;
  total: number;
  is_locked: number;
};

export default function ExpenseScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { colors, accent, isDark, formatMoney } = useAppearance();
  const styles = createStyles(colors, accent.primary, isDark);

  const currencyLabel = formatMoney(0).replace(/[\d.,\s]/g, '');

  const [billId, setBillId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingBill, setLoadingBill] = useState(false);

  const [billName, setBillName] = useState('');
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  );

  const [items, setItems] = useState<BillItem[]>([
    { id: '1', name: '', amount: '' },
  ]);

  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [locked, setLocked] = useState(false);

  const [messageVisible, setMessageVisible] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageSuccess, setMessageSuccess] = useState(false);

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const amount = Number(item.amount) || 0;
      return sum + amount;
    }, 0);
  }, [items]);

  const validItemCount = items.filter(
    (item) => item.name.trim() && Number(item.amount) > 0
  ).length;

  function showMessage(
    title: string,
    message: string,
    success = false
  ) {
    setMessageTitle(title);
    setMessageText(message);
    setMessageSuccess(success);
    setMessageVisible(true);
  }

  useEffect(() => {
    if (!id) return;

    let active = true;

    async function loadBill() {
      setLoadingBill(true);

      try {
        const numericId = Number(id);

        if (!Number.isInteger(numericId) || numericId <= 0) {
          showMessage(
            'Invalid bill',
            'This bill ID is not valid.'
          );
          return;
        }

        const bill = await db.getFirstAsync<BillRow>(
          `SELECT id, name, date, total, is_locked
           FROM bills
           WHERE id = ?`,
          numericId
        );

        if (!bill) {
          showMessage(
            'Bill not found',
            'This bill may have been deleted.'
          );
          return;
        }

        const savedItems = await db.getAllAsync<{
          id: number;
          name: string;
          amount: number;
        }>(
          `SELECT id, name, amount
           FROM bill_items
           WHERE bill_id = ?
           ORDER BY id ASC`,
          numericId
        );

        if (!active) return;

        setBillId(bill.id);
        setBillName(bill.name);

        setDate(
          new Date(`${bill.date}T00:00:00`).toLocaleDateString(
            'en-GB',
            {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }
          )
        );

        setItems(
          savedItems.map((item) => ({
            id: String(item.id),
            name: item.name,
            amount: String(item.amount),
          }))
        );

        setLocked(bill.is_locked === 1);
      } catch (error) {
        console.error('Could not load bill:', error);

        if (active) {
          showMessage(
            'Unable to load bill',
            'Something went wrong while loading this bill.'
          );
        }
      } finally {
        if (active) {
          setLoadingBill(false);
        }
      }
    }

    void loadBill();

    return () => {
      active = false;
    };
  }, [id, db]);

  function addItem() {
    if (locked) return;

    setItems((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        name: '',
        amount: '',
      },
    ]);
  }

  function updateItem(
    itemId: string,
    field: 'name' | 'amount',
    value: string
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, [field]: value }
          : item
      )
    );
  }

  function removeItem(itemId: string) {
    if (locked || items.length === 1) return;

    setItems((current) =>
      current.filter((item) => item.id !== itemId)
    );
  }

  async function saveBill() {
    if (locked || saving) return;

    if (!billName.trim()) {
      showMessage(
        'Bill name required',
        'Give this bill a name first.'
      );
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.name.trim() &&
        Number.isFinite(Number(item.amount)) &&
        Number(item.amount) > 0
    );

    if (validItems.length === 0) {
      showMessage(
        'No expenses added',
        'Add at least one item with a name and a valid amount.'
      );
      return;
    }

    setSaving(true);

    try {
      const today = new Date();
      const dateKey = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
      ].join('-');

      const billTotal = validItems.reduce(
        (sum, item) => sum + Number(item.amount),
        0
      );

      let savedBillId = billId;

      await db.withTransactionAsync(async () => {
        if (savedBillId === null) {
          const result = await db.runAsync(
            `INSERT INTO bills (name, date, total)
             VALUES (?, ?, ?)`,
            billName.trim(),
            dateKey,
            billTotal
          );

          savedBillId = result.lastInsertRowId;
        } else {
          await db.runAsync(
            `UPDATE bills
             SET name = ?, total = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND is_locked = 0`,
            billName.trim(),
            billTotal,
            savedBillId
          );

          await db.runAsync(
            'DELETE FROM bill_items WHERE bill_id = ?',
            savedBillId
          );
        }

        for (const item of validItems) {
          await db.runAsync(
            `INSERT INTO bill_items (bill_id, name, amount)
             VALUES (?, ?, ?)`,
            savedBillId,
            item.name.trim(),
            Number(item.amount)
          );
        }
      });

      setBillId(savedBillId);
      setSaveModalVisible(true);
    } catch (error) {
      console.error('Error saving bill:', error);

      showMessage(
        'Could not save bill',
        'Something went wrong while saving your bill. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function lockBill() {
    if (billId === null) {
      showMessage(
        'Bill not saved',
        'Save the bill before locking it.'
      );
      return;
    }

    try {
      await db.runAsync(
        `UPDATE bills
         SET is_locked = 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        billId
      );

      setSaveModalVisible(false);
      setLocked(true);

      showMessage(
        'Bill locked',
        'Your bill has been permanently locked and can no longer be edited.',
        true
      );
    } catch (error) {
      console.error('Error locking bill:', error);

      showMessage(
        'Could not lock bill',
        'Please try again.'
      );
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={colors.text}
              />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>NEW EXPENSE</Text>
              <Text style={styles.headerSubtitle}>
                Create your bill
              </Text>
            </View>

            <Pressable
              style={styles.headerIcon}
              onPress={() => router.push('/bills')}
            >
              <Ionicons
                name="receipt-outline"
                size={23}
                color={accent.primary}
              />
            </Pressable>
          </View>

          {locked && (
            <View style={styles.lockedBanner}>
              <Ionicons
                name="lock-closed"
                size={17}
                color="#16A673"
              />
              <Text style={styles.lockedText}>
                This bill is locked and cannot be edited.
              </Text>
            </View>
          )}

          {loadingBill ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator
                size="large"
                color={accent.primary}
              />
              <Text style={styles.loadingText}>
                Loading your bill...
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.billCard}>
                <Text style={styles.sectionLabel}>
                  BILL DETAILS
                </Text>

                <Text style={styles.inputLabel}>
                  Bill name
                </Text>

                <TextInput
                  style={styles.billNameInput}
                  placeholder="e.g. Bill 1"
                  placeholderTextColor={colors.muted}
                  value={billName}
                  onChangeText={setBillName}
                  editable={!locked}
                />

                <View style={styles.dateRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={17}
                    color={colors.muted}
                  />
                  <Text style={styles.dateText}>{date}</Text>
                </View>
              </View>

              <View style={styles.itemsSection}>
                <View style={styles.itemsHeading}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Expense items
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Add anything you spent money on.
                    </Text>
                  </View>

                  <View style={styles.itemCount}>
                    <Text style={styles.itemCountText}>
                      {items.length} ITEMS
                    </Text>
                  </View>
                </View>

                <View style={styles.itemsCard}>
                  {items.map((item, index) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemNumber}>
                        <Text style={styles.itemNumberText}>
                          {String(index + 1).padStart(2, '0')}
                        </Text>
                      </View>

                      <View style={styles.itemInputs}>
                        <TextInput
                          style={styles.itemNameInput}
                          placeholder="Item name"
                          placeholderTextColor={colors.muted}
                          value={item.name}
                          onChangeText={(value) =>
                            updateItem(item.id, 'name', value)
                          }
                          editable={!locked}
                        />

                        <View style={styles.amountInputWrapper}>
                          <Text style={styles.currency}>
                            {currencyLabel}
                          </Text>

                          <TextInput
                            style={styles.amountInput}
                            placeholder="0"
                            placeholderTextColor={colors.muted}
                            keyboardType="decimal-pad"
                            value={item.amount}
                            onChangeText={(value) =>
                              updateItem(
                                item.id,
                                'amount',
                                value.replace(/[^0-9.]/g, '')
                              )
                            }
                            editable={!locked}
                          />
                        </View>
                      </View>

                      {!locked && (
                        <Pressable
                          style={styles.removeButton}
                          onPress={() => removeItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <Ionicons
                            name="close-circle-outline"
                            size={21}
                            color={
                              items.length === 1
                                ? colors.border
                                : '#E05B62'
                            }
                          />
                        </Pressable>
                      )}
                    </View>
                  ))}

                  {!locked && (
                    <Pressable
                      style={styles.addItemButton}
                      onPress={addItem}
                    >
                      <Ionicons
                        name="add-circle"
                        size={21}
                        color={accent.primary}
                      />
                      <Text style={styles.addItemText}>
                        Add another item
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={styles.totalCard}>
                <View>
                  <Text style={styles.totalLabel}>
                    TOTAL EXPENSE
                  </Text>
                  <Text style={styles.totalHint}>
                    {validItemCount} items added
                  </Text>
                </View>

                <Text style={styles.totalAmount}>
                  {formatMoney(total)}
                </Text>
              </View>

              {!locked ? (
                <Pressable
                  style={[
                    styles.saveButton,
                    saving && styles.disabledButton,
                  ]}
                  onPress={saveBill}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.saveButtonText}>
                        SAVE BILL
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color="#FFFFFF"
                      />
                    </>
                  )}
                </Pressable>
              ) : (
                <View style={styles.lockedFooter}>
                  <Ionicons
                    name="lock-closed"
                    size={18}
                    color="#16A673"
                  />
                  <Text style={styles.lockedFooterText}>
                    Permanently locked
                  </Text>
                </View>
              )}

              <Text style={styles.footerNote}>
                Your custom expenses
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save bill: Edit or Lock */}
      <Modal
        visible={saveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons
                name="checkmark"
                size={28}
                color="#16A673"
              />
            </View>

            <Text style={styles.modalTitle}>
              Bill saved!
            </Text>

            <Text style={styles.modalSubtitle}>
              What would you like to do with {billName}?
            </Text>

            <Pressable
              style={styles.editButton}
              onPress={() => setSaveModalVisible(false)}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={accent.primary}
              />
              <Text style={styles.editButtonText}>
                EDIT BILL
              </Text>
            </Pressable>

            <Pressable
              style={styles.printButton}
              onPress={lockBill}
            >
              <Ionicons
                name="print-outline"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.printButtonText}>
                PRINT & LOCK
              </Text>
            </Pressable>

            <Text style={styles.modalFootnote}>
              Your bill is saved on this device. Locking it permanently
              prevents further edits. Actual printing will be added later.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Custom RupeeTrack message popup */}
      <Modal
        visible={messageVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMessageVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.messageIcon,
                !messageSuccess && styles.messageIconError,
              ]}
            >
              <Ionicons
                name={
                  messageSuccess
                    ? 'checkmark'
                    : 'alert-circle-outline'
                }
                size={27}
                color={messageSuccess ? '#16A673' : '#D65353'}
              />
            </View>

            <Text style={styles.modalTitle}>
              {messageTitle}
            </Text>

            <Text style={styles.modalSubtitle}>
              {messageText}
            </Text>

            <Pressable
              style={styles.messageButton}
              onPress={() => setMessageVisible(false)}
            >
              <Text style={styles.messageButtonText}>
                Okay
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 35,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 25,
      gap: 13,
    },
    backButton: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    headerSubtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 3,
    },
    headerIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor: isDark ? '#263044' : '#EFEDFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingWrap: {
      minHeight: 250,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      color: colors.muted,
      fontSize: 12,
    },
    lockedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      padding: 13,
      borderRadius: 13,
      backgroundColor: isDark ? '#18372E' : '#E6F7EE',
      marginBottom: 18,
    },
    lockedText: {
      color: '#16A673',
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    billCard: {
      backgroundColor: colors.surface,
      padding: 18,
      borderRadius: 20,
      marginBottom: 27,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      marginBottom: 18,
    },
    inputLabel: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
    },
    billNameInput: {
      height: 49,
      borderRadius: 12,
      backgroundColor: colors.input,
      paddingHorizontal: 14,
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 15,
    },
    dateText: {
      color: colors.muted,
      fontSize: 12,
    },
    itemsSection: {
      marginBottom: 20,
    },
    itemsHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    sectionSubtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 5,
    },
    itemCount: {
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
    },
    itemCountText: {
      color: primary,
      fontSize: 9,
      fontWeight: '800',
    },
    itemsCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemNumber: {
      width: 29,
      height: 29,
      borderRadius: 9,
      backgroundColor: isDark ? '#292442' : '#F0EFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemNumberText: {
      color: primary,
      fontSize: 10,
      fontWeight: '800',
    },
    itemInputs: {
      flex: 1,
      gap: 8,
    },
    itemNameInput: {
      color: colors.text,
      fontSize: 13,
      paddingVertical: 3,
    },
    amountInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.input,
      borderRadius: 9,
      paddingHorizontal: 10,
      height: 36,
      borderWidth: 1,
      borderColor: colors.border,
    },
    currency: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      marginRight: 7,
    },
    amountInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      paddingVertical: 0,
    },
    removeButton: {
      padding: 4,
    },
    addItemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 17,
      paddingBottom: 5,
    },
    addItemText: {
      color: primary,
      fontSize: 13,
      fontWeight: '700',
    },
    totalCard: {
      backgroundColor: isDark ? '#222C40' : '#172B50',
      padding: 20,
      borderRadius: 19,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    totalLabel: {
      color: '#B9C9E3',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
    },
    totalHint: {
      color: '#B9C9E3',
      fontSize: 11,
      marginTop: 6,
    },
    totalAmount: {
      color: '#FFFFFF',
      fontSize: 21,
      fontWeight: '800',
    },
    saveButton: {
      backgroundColor: primary,
      height: 55,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
      shadowColor: primary,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    disabledButton: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1,
    },
    lockedFooter: {
      height: 55,
      borderRadius: 16,
      backgroundColor: isDark ? '#18372E' : '#E6F7EE',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },
    lockedFooterText: {
      color: '#16A673',
      fontSize: 13,
      fontWeight: '700',
    },
    footerNote: {
      textAlign: 'center',
      color: colors.muted,
      fontSize: 11,
      marginTop: 17,
    },
    modalBackground: {
      flex: 1,
      backgroundColor: 'rgba(10, 15, 30, 0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 370,
      backgroundColor: colors.surface,
      borderRadius: 25,
      padding: 23,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalIcon: {
      width: 55,
      height: 55,
      borderRadius: 18,
      backgroundColor: isDark ? '#18372E' : '#E6F7EE',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 15,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 21,
      fontWeight: '800',
      textAlign: 'center',
    },
    modalSubtitle: {
      color: colors.muted,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 22,
      lineHeight: 18,
    },
    editButton: {
      width: '100%',
      height: 49,
      borderRadius: 13,
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      marginBottom: 11,
    },
    editButtonText: {
      color: primary,
      fontSize: 12,
      fontWeight: '800',
    },
    printButton: {
      width: '100%',
      height: 49,
      borderRadius: 13,
      backgroundColor: isDark ? '#303B50' : '#172B50',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },
    printButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    modalFootnote: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
      textAlign: 'center',
      marginTop: 15,
    },
    messageIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: isDark ? '#18372E' : '#E8F8F1',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    messageIconError: {
      backgroundColor: isDark ? '#40262D' : '#FFF0F0',
    },
    messageButton: {
      height: 46,
      alignSelf: 'stretch',
      borderRadius: 12,
      backgroundColor: primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    messageButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
  });
}
