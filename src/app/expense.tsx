import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  Alert,
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

type BillItem = {
  id: string;
  name: string;
  amount: string;
};

export default function ExpenseScreen() {
    const router = useRouter();
    const db = useSQLiteContext();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const [billId, setBillId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const [billName, setBillName] = useState('');
    const [items, setItems] = useState<BillItem[]>([
        { id: '1', name: '', amount: '' },
    ]);
    const [saveModalVisible, setSaveModalVisible] = useState(false);
    const [locked, setLocked] = useState(false);

    const total = useMemo(() => {
        return items.reduce((sum, item) => {
        const amount = Number(item.amount) || 0;
        return sum + amount;
        }, 0);
    }, [items]);


useEffect(() => {
  if (!id) return;

  let active = true;

  async function loadBill() {
    try {
      const numericId = Number(id);

      if (!Number.isInteger(numericId) || numericId <= 0) {
        Alert.alert('Invalid bill', 'This bill ID is not valid.');
        router.back();
        return;
      }

      const bill = await db.getFirstAsync<{
        id: number;
        name: string;
        date: string;
        total: number;
        is_locked: number;
      }>(
        `SELECT id, name, date, total, is_locked
         FROM bills
         WHERE id = ?`,
        numericId
      );

      if (!bill) {
        Alert.alert('Bill not found', 'This bill may have been deleted.');
        router.back();
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
        new Date(`${bill.date}T00:00:00`).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
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
        Alert.alert('Error', 'Could not load this bill.');
        }
    }

        loadBill();

        return () => {
            active = false;
        };
}, [id, db, router]);


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
        id: string,
        field: 'name' | 'amount',
        value: string
    ) {
        setItems((current) =>
        current.map((item) =>
            item.id === id ? { ...item, [field]: value } : item
        )
        );
    }

    function removeItem(id: string) {
        if (locked || items.length === 1) return;

        setItems((current) => current.filter((item) => item.id !== id));
    }

    
    async function saveBill() {
        if (locked || saving) return;

        if (!billName.trim()) {
            Alert.alert('Bill name required', 'Give this bill a name first.');
            return;
        }

        const validItems = items.filter(
            (item) =>
            item.name.trim() &&
            Number.isFinite(Number(item.amount)) &&
            Number(item.amount) > 0
        );

        if (validItems.length === 0) {
            Alert.alert(
            'No expenses added',
            'Add at least one item with a name and amount.'
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

            Alert.alert(
            'Could not save bill',
            'Something went wrong while saving your bill. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    }


    
    async function lockBill() {
        if (billId === null) {
            Alert.alert('Bill not saved', 'Save the bill before locking it.');
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
        } catch (error) {
            console.error('Error locking bill:', error);

            Alert.alert(
            'Could not lock bill',
            'Please try again.'
            );
        }
    }


    const [date, setDate] = useState(() =>
        new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    );

    return (
        <SafeAreaView style={styles.safeArea}>
        <StatusBarFallback />

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
                <Ionicons name="arrow-back" size={22} color="#172033" />
                </Pressable>

                <View style={styles.headerText}>
                <Text style={styles.headerTitle}>NEW EXPENSE</Text>
                <Text style={styles.headerSubtitle}>
                    Create your bill
                </Text>
                </View>

                <Pressable style={styles.headerIcon} onPress={() => router.push('/bills')}>
                <Ionicons name="receipt-outline" size={23} color="#6256F5" />
                </Pressable>
            </View>

            {locked && (
                <View style={styles.lockedBanner}>
                <Ionicons name="lock-closed" size={17} color="#16865B" />
                <Text style={styles.lockedText}>
                    This bill is locked and cannot be edited.
                </Text>
                </View>
            )}

            <View style={styles.billCard}>
                <Text style={styles.sectionLabel}>BILL DETAILS</Text>

                <Text style={styles.inputLabel}>Bill name</Text>
                <TextInput
                style={styles.billNameInput}
                placeholder="e.g. Bill 1"
                placeholderTextColor="#A0A5B1"
                value={billName}
                onChangeText={setBillName}
                editable={!locked}
                />

                <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={17} color="#858B99" />
                <Text style={styles.dateText}>{date}</Text>
                </View>
            </View>

            <View style={styles.itemsSection}>
                <View style={styles.itemsHeading}>
                <View>
                    <Text style={styles.sectionTitle}>Expense items</Text>
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
                        placeholderTextColor="#A0A5B1"
                        value={item.name}
                        onChangeText={(value) =>
                            updateItem(item.id, 'name', value)
                        }
                        editable={!locked}
                        />

                        <View style={styles.amountInputWrapper}>
                        <Text style={styles.currency}>Rs.</Text>
                        <TextInput
                            style={styles.amountInput}
                            placeholder="0"
                            placeholderTextColor="#A0A5B1"
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
                            color={items.length === 1 ? '#D9DCE3' : '#E05B62'}
                        />
                        </Pressable>
                    )}
                    </View>
                ))}

                {!locked && (
                    <Pressable style={styles.addItemButton} onPress={addItem}>
                    <Ionicons name="add-circle" size={21} color="#6256F5" />
                    <Text style={styles.addItemText}>Add another item</Text>
                    </Pressable>
                )}
                </View>
            </View>

            <View style={styles.totalCard}>
                <View>
                <Text style={styles.totalLabel}>TOTAL EXPENSE</Text>
                <Text style={styles.totalHint}>
                    {items.filter(
                    (item) => item.name.trim() && Number(item.amount) > 0
                    ).length} items added
                </Text>
                </View>

                <Text style={styles.totalAmount}>
                Rs. {total.toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                })}
                </Text>
            </View>

            {!locked ? (
                <Pressable style={styles.saveButton} onPress={saveBill} disabled={saving}>
                    <Text style={styles.saveButtonText}>
                        {saving ? 'SAVING...' : 'SAVE BILL'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </Pressable>
            ) : (
                <View style={styles.lockedFooter}>
                <Ionicons name="lock-closed" size={18} color="#16865B" />
                <Text style={styles.lockedFooterText}>
                    Permanently locked
                </Text>
                </View>
            )}

            <Text style={styles.footerNote}>
                Your custom expenses
            </Text>
            </ScrollView>
        </KeyboardAvoidingView>

        <Modal
            visible={saveModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setSaveModalVisible(false)}
        >
            <View style={styles.modalBackground}>
            <View style={styles.modalCard}>
                <View style={styles.modalIcon}>
                <Ionicons name="checkmark" size={28} color="#16865B" />
                </View>

                <Text style={styles.modalTitle}>Bill saved!</Text>
                <Text style={styles.modalSubtitle}>
                What would you like to do with {billName}?
                </Text>

                <Pressable
                style={styles.editButton}
                onPress={() => setSaveModalVisible(false)}
                >
                <Ionicons name="create-outline" size={20} color="#6256F5" />
                <Text style={styles.editButtonText}>EDIT BILL</Text>
                </Pressable>

                <Pressable
                style={styles.printButton}
                onPress={lockBill}
                >
                <Ionicons name="print-outline" size={20} color="#FFFFFF" />
                <Text style={styles.printButtonText}>PRINT & LOCK</Text>
                </Pressable>

                <Text style={styles.modalFootnote}>
                Your bill is saved on this device. Locking it permanently prevents further edits. Actual printing will be added later.
                </Text>
            </View>
            </View>
        </Modal>
        </SafeAreaView>
    );
}

function StatusBarFallback() {
  return null;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
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
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 13,
    borderRadius: 13,
    backgroundColor: '#E6F7EE',
    marginBottom: 18,
  },
  lockedText: {
    color: '#16865B',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 20,
    marginBottom: 27,
  },
  sectionLabel: {
    color: '#8A90A0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 18,
  },
  inputLabel: {
    color: '#51596A',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  billNameInput: {
    height: 49,
    borderRadius: 12,
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 14,
    color: '#172033',
    fontSize: 15,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 15,
  },
  dateText: {
    color: '#858B99',
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
    color: '#172033',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#858B99',
    fontSize: 12,
    marginTop: 5,
  },
  itemCount: {
    backgroundColor: '#EFEDFF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  itemCountText: {
    color: '#6256F5',
    fontSize: 9,
    fontWeight: '800',
  },
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F4',
  },
  itemNumber: {
    width: 29,
    height: 29,
    borderRadius: 9,
    backgroundColor: '#F0EFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNumberText: {
    color: '#6256F5',
    fontSize: 10,
    fontWeight: '800',
  },
  itemInputs: {
    flex: 1,
    gap: 8,
  },
  itemNameInput: {
    color: '#172033',
    fontSize: 13,
    paddingVertical: 3,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 9,
    paddingHorizontal: 10,
    height: 36,
  },
  currency: {
    color: '#858B99',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 7,
  },
  amountInput: {
    flex: 1,
    color: '#172033',
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
    color: '#6256F5',
    fontSize: 13,
    fontWeight: '700',
  },
  totalCard: {
    backgroundColor: '#172B50',
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
    backgroundColor: '#6256F5',
    height: 55,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#6256F5',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
    backgroundColor: '#E6F7EE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  lockedFooterText: {
    color: '#16865B',
    fontSize: 13,
    fontWeight: '700',
  },
  footerNote: {
    textAlign: 'center',
    color: '#A0A5B1',
    fontSize: 11,
    marginTop: 17,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 370,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 23,
    alignItems: 'center',
  },
  modalIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: '#E6F7EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    color: '#172033',
    fontSize: 21,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#858B99',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  editButton: {
    width: '100%',
    height: 49,
    borderRadius: 13,
    backgroundColor: '#EFEDFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginBottom: 11,
  },
  editButtonText: {
    color: '#6256F5',
    fontSize: 12,
    fontWeight: '800',
  },
  printButton: {
    width: '100%',
    height: 49,
    borderRadius: 13,
    backgroundColor: '#172B50',
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
    color: '#A0A5B1',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 15,
  },
});
