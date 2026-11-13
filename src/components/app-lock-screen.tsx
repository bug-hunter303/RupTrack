import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/context/appearance-context';
import { useSecurity } from '@/context/security-context';

export function AppLockScreen() {
  const {
    isReady,
    isLocked,
    biometricEnabled,
    biometricAvailable,
    verifyPin,
    unlock,
    authenticateBiometric,
  } = useSecurity();

  const { colors, accent, isDark } = useAppearance();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  if (!isReady || !isLocked) return null;

  const handlePinChange = async (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 6);
    setPin(cleaned);
    setError('');

    if (cleaned.length !== 6) return;

    setChecking(true);

    const valid = await verifyPin(cleaned);

    setChecking(false);

    if (valid) {
      setPin('');
      unlock();
    } else {
      setPin('');
      setError('Incorrect PIN. Please try again.');
    }
  };

  const handleBiometric = async () => {
    setChecking(true);
    setError('');

    const success = await authenticateBiometric();

    setChecking(false);

    if (!success) {
      setError('Authentication was not successful. Use your PIN.');
    }
  };

  const styles = createStyles(
    colors,
    accent.primary,
    isDark
  );

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.logo}>
            <Ionicons
              name="shield-checkmark"
              size={36}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.brand}>RupeeTrack</Text>

          <Text style={styles.title}>Welcome back</Text>

          <Text style={styles.subtitle}>
            Enter your six-digit PIN to access your finances.
          </Text>

          <View style={styles.pinContainer}>
            {Array.from({ length: 6 }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  pin.length > index && styles.pinDotFilled,
                ]}
              />
            ))}
          </View>

          <TextInput
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            autoFocus
            editable={!checking}
            style={styles.hiddenInput}
            accessibilityLabel="Enter your six-digit PIN"
          />

          {checking && (
            <ActivityIndicator
              color={accent.primary}
              style={styles.status}
            />
          )}

          {!!error && (
            <Text style={styles.error}>{error}</Text>
          )}

          {biometricEnabled && biometricAvailable && (
            <Pressable
              style={({ pressed }) => [
                styles.biometricButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleBiometric}
              disabled={checking}
            >
              <Ionicons
                name="finger-print"
                size={27}
                color={accent.primary}
              />
              <Text style={styles.biometricText}>
                Unlock with biometrics
              </Text>
            </Pressable>
          )}

          <Text style={styles.footer}>
            Your financial information is protected.
          </Text>
        </View>
      </SafeAreaView>
    </View>
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
    overlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 9999,
      elevation: 9999,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
    },
    logo: {
      width: 76,
      height: 76,
      borderRadius: 25,
      backgroundColor: primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 17,
    },
    brand: {
      color: primary,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 1,
    },
    title: {
      color: colors.text,
      fontSize: 27,
      fontWeight: '800',
      marginTop: 34,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 9,
      lineHeight: 20,
    },
    pinContainer: {
      flexDirection: 'row',
      gap: 15,
      marginTop: 38,
      marginBottom: 20,
    },
    pinDot: {
      width: 13,
      height: 13,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: colors.muted,
      backgroundColor: 'transparent',
    },
    pinDotFilled: {
      backgroundColor: primary,
      borderColor: primary,
    },
    hiddenInput: {
      position: 'absolute',
      width: 1,
      height: 1,
      opacity: 0,
    },
    status: {
      marginTop: 12,
    },
    error: {
      color: '#E45C68',
      fontSize: 12,
      marginTop: 12,
      textAlign: 'center',
    },
    biometricButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      borderRadius: 15,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginTop: 27,
    },
    biometricText: {
      color: primary,
      fontSize: 13,
      fontWeight: '700',
    },
    footer: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 45,
    },
  });
}
