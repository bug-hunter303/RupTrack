
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/context/appearance-context';
import { useSecurity } from '@/context/security-context';

type ModalMode = 'setup' | 'change' | 'remove' | null;

export default function SecurityScreen() {
  const router = useRouter();
  const { colors, accent, isDark } = useAppearance();

  const {
    hasPin,
    biometricEnabled,
    biometricAvailable,
    autoLockMinutes,
    setPin,
    verifyPin,
    disablePin,
    setBiometricEnabled,
    setAutoLockMinutes,
  } = useSecurity();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState('');

  const styles = createStyles(colors, accent.primary, isDark);

  const openModal = (mode: ModalMode) => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setModalError('');
    setModalMode(mode);
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode(null);
    setModalError('');
  };

  const handleSave = async () => {
    setModalError('');

    if (modalMode === 'remove' || modalMode === 'change') {
      if (currentPin.length !== 6) {
        setModalError('Enter your current six-digit PIN.');
        return;
      }

      const valid = await verifyPin(currentPin);

      if (!valid) {
        setModalError('Your current PIN is incorrect.');
        return;
      }
    }

    if (modalMode === 'remove') {
      setSaving(true);

      try {
        await disablePin();
        setModalMode(null);
      } catch {
        setModalError('Could not remove your PIN. Try again.');
      } finally {
        setSaving(false);
      }

      return;
    }

    if (newPin.length !== 6) {
      setModalError('Your new PIN must contain six digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setModalError('The PINs do not match.');
      return;
    }

    setSaving(true);

    try {
      await setPin(newPin);
      setModalMode(null);
    } catch {
      setModalError('Could not save your PIN. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    setBiometricMessage('');

    if (!hasPin) {
      setBiometricMessage('Create a PIN before enabling biometrics.');
      return;
    }

    if (enabled && !biometricAvailable) {
      setBiometricMessage(
        'No enrolled fingerprint or face authentication was found on this device.'
      );
      return;
    }

    const success = await setBiometricEnabled(enabled);

    if (!success && enabled) {
      setBiometricMessage(
        'Biometric verification was cancelled or unsuccessful.'
      );
    }
  };

  const autoLockOptions = [
    { label: 'Immediately', value: 0 },
    { label: '1 minute', value: 1 },
    { label: '5 minutes', value: 5 },
    { label: '15 minutes', value: 15 },
  ];

  const modalTitle =
    modalMode === 'setup'
      ? 'Create your PIN'
      : modalMode === 'change'
        ? 'Change your PIN'
        : 'Remove PIN protection';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color={colors.text}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>ACCOUNT PROTECTION</Text>
            <Text style={styles.title}>Security</Text>
            <Text style={styles.subtitle}>
              Keep your financial information safe.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="shield-checkmark"
              size={23}
              color={accent.primary}
            />
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons
              name="shield-checkmark"
              size={25}
              color={hasPin ? '#16A673' : colors.muted}
            />
          </View>

          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>
              {hasPin ? 'App protection is active' : 'Set up app protection'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {hasPin
                ? 'Your RupeeTrack app is protected with a PIN.'
                : 'Create a PIN to protect access to your finances.'}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              hasPin ? styles.activeBadge : styles.inactiveBadge,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                { color: hasPin ? '#16A673' : colors.muted },
              ]}
            >
              {hasPin ? 'ON' : 'OFF'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>APP LOCK</Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons
                name="keypad-outline"
                size={21}
                color={accent.primary}
              />
            </View>

            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>PIN protection</Text>
              <Text style={styles.settingSubtitle}>
                {hasPin
                  ? 'A six-digit PIN is required to unlock the app.'
                  : 'Create a six-digit PIN to lock the app.'}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          {hasPin ? (
            <>
              <Pressable
                style={styles.actionRow}
                onPress={() => openModal('change')}
              >
                <Text style={styles.actionText}>Change PIN</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>

              <View style={styles.separator} />

              <Pressable
                style={styles.actionRow}
                onPress={() => openModal('remove')}
              >
                <Text style={styles.dangerText}>Remove PIN protection</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#E45C68"
                />
              </Pressable>
            </>
          ) : (
            <Pressable
              style={styles.actionRow}
              onPress={() => openModal('setup')}
            >
              <Text style={styles.actionText}>Create PIN</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.muted}
              />
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionTitle}>BIOMETRIC AUTHENTICATION</Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons
                name="finger-print"
                size={24}
                color={accent.primary}
              />
            </View>

            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Fingerprint / Face ID</Text>
              <Text style={styles.settingSubtitle}>
                Unlock RupeeTrack using your device biometrics.
              </Text>
            </View>

            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!hasPin}
              trackColor={{
                false: colors.border,
                true: accent.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          {!!biometricMessage && (
            <Text style={styles.inlineMessage}>
              {biometricMessage}
            </Text>
          )}

          {!biometricAvailable && (
            <Text style={styles.helperText}>
              Biometric authentication is unavailable or not enrolled on this device.
            </Text>
          )}

          {!hasPin && (
            <Text style={styles.helperText}>
              Create a PIN first to enable biometric unlocking.
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>AUTOMATIC LOCK</Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons
                name="time-outline"
                size={22}
                color={accent.primary}
              />
            </View>

            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Lock after leaving</Text>
              <Text style={styles.settingSubtitle}>
                Choose how long RupeeTrack can remain in the background.
              </Text>
            </View>
          </View>

          <View style={styles.optionsContainer}>
            {autoLockOptions.map((option) => {
              const selected = autoLockMinutes === option.value;

              return (
                <Pressable
                  key={option.value}
                  disabled={!hasPin}
                  onPress={() => setAutoLockMinutes(option.value)}
                  style={[
                    styles.option,
                    selected && styles.selectedOption,
                    !hasPin && styles.disabledOption,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.selectedOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>

                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color={accent.primary}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.footerCard}>
          <Ionicons
            name="lock-closed-outline"
            size={19}
            color={colors.muted}
          />
          <Text style={styles.footerText}>
            Your PIN is stored securely on this device. It is not saved in your finance database.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={modalMode !== null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeModal}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons
                name={
                  modalMode === 'remove'
                    ? 'lock-open-outline'
                    : 'shield-checkmark-outline'
                }
                size={27}
                color={accent.primary}
              />
            </View>

            <Text style={styles.modalTitle}>{modalTitle}</Text>

            <Text style={styles.modalSubtitle}>
              {modalMode === 'setup'
                ? 'Choose a six-digit PIN for your app.'
                : modalMode === 'change'
                  ? 'Verify your current PIN and choose a new one.'
                  : 'Enter your current PIN to remove app protection.'}
            </Text>

            {(modalMode === 'change' || modalMode === 'remove') && (
              <TextInput
                value={currentPin}
                onChangeText={(value) =>
                  setCurrentPin(value.replace(/[^0-9]/g, '').slice(0, 6))
                }
                placeholder="Current PIN"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                style={styles.pinInput}
              />
            )}

            {modalMode !== 'remove' && (
              <>
                <TextInput
                  value={newPin}
                  onChangeText={(value) =>
                    setNewPin(value.replace(/[^0-9]/g, '').slice(0, 6))
                  }
                  placeholder="New six-digit PIN"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  style={styles.pinInput}
                />

                <TextInput
                  value={confirmPin}
                  onChangeText={(value) =>
                    setConfirmPin(value.replace(/[^0-9]/g, '').slice(0, 6))
                  }
                  placeholder="Confirm new PIN"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  style={styles.pinInput}
                />
              </>
            )}

            {!!modalError && (
              <Text style={styles.modalError}>{modalError}</Text>
            )}

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && { opacity: 0.8 },
                saving && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {saving
                  ? 'PLEASE WAIT...'
                  : modalMode === 'remove'
                    ? 'REMOVE PIN'
                    : 'SAVE PIN'}
              </Text>
            </Pressable>

            <Pressable
              onPress={closeModal}
              disabled={saving}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
  },
  primary: string,
  isDark: boolean
) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 15,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 25,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerText: {
      flex: 1,
    },
    eyebrow: {
      color: primary,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1.4,
      marginBottom: 4,
    },
    title: {
      color: colors.text,
      fontSize: 27,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 4,
    },
    headerIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    statusCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 27,
    },
    statusIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: isDark ? '#18372E' : '#E7F8F0',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    statusText: {
      flex: 1,
    },
    statusTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    statusSubtitle: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 4,
    },
    statusBadge: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 8,
      marginLeft: 5,
    },
    activeBadge: {
      backgroundColor: isDark ? '#18372E' : '#E7F8F0',
    },
    inactiveBadge: {
      backgroundColor: colors.background,
    },
    statusBadgeText: {
      fontSize: 9,
      fontWeight: '900',
    },
    sectionTitle: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      marginBottom: 10,
      marginLeft: 3,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 15,
      paddingVertical: 5,
      marginBottom: 24,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    settingInfo: {
      flex: 1,
      paddingRight: 8,
    },
    settingTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    settingSubtitle: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 4,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 52,
    },
    actionRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 52,
    },
    actionText: {
      color: primary,
      fontSize: 12,
      fontWeight: '700',
    },
    dangerText: {
      color: '#E45C68',
      fontSize: 12,
      fontWeight: '700',
    },
    inlineMessage: {
      color: '#E45C68',
      fontSize: 10,
      lineHeight: 15,
      marginBottom: 12,
      marginLeft: 52,
    },
    helperText: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
      marginLeft: 52,
      marginBottom: 12,
    },
    optionsContainer: {
      paddingLeft: 52,
      paddingBottom: 12,
      gap: 7,
    },
    option: {
      minHeight: 39,
      borderRadius: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectedOption: {
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      borderWidth: 1,
      borderColor: primary,
    },
    disabledOption: {
      opacity: 0.45,
    },
    optionText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '600',
    },
    selectedOptionText: {
      color: primary,
      fontWeight: '800',
    },
    footerCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    footerText: {
      flex: 1,
      color: colors.muted,
      fontSize: 10,
      lineHeight: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 22,
    },
    modalCard: {
      width: '100%',
      maxWidth: 390,
      borderRadius: 23,
      padding: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalIcon: {
      width: 52,
      height: 52,
      borderRadius: 17,
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 14,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '800',
      textAlign: 'center',
    },
    modalSubtitle: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'center',
      marginTop: 7,
      marginBottom: 17,
    },
    pinInput: {
      height: 49,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 14,
      color: colors.text,
      fontSize: 14,
      letterSpacing: 2,
      marginBottom: 10,
    },
    modalError: {
      color: '#E45C68',
      fontSize: 11,
      textAlign: 'center',
      marginBottom: 12,
    },
    primaryButton: {
      height: 49,
      borderRadius: 13,
      backgroundColor: primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 5,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.7,
    },
    cancelButton: {
      alignItems: 'center',
      paddingVertical: 13,
    },
    cancelText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
    },
  });
}
