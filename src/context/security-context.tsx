
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
  AppState,
  AppStateStatus,
} from 'react-native';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

type SecurityContextType = {
  isReady: boolean;
  isLocked: boolean;
  hasPin: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  autoLockMinutes: number;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  disablePin: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<boolean>;
  setAutoLockMinutes: (minutes: number) => Promise<void>;
  unlock: () => void;
  authenticateBiometric: () => Promise<boolean>;
};

const PIN_HASH_KEY = 'rupeetrack_security_pin_hash';
const PIN_SALT_KEY = 'rupeetrack_security_pin_salt';
const BIOMETRIC_KEY = 'rupeetrack_security_biometric';
const AUTO_LOCK_KEY = 'rupeetrack_security_auto_lock';

const SecurityContext = createContext<SecurityContextType | null>(null);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [autoLockMinutes, setAutoLockMinutesState] = useState(0);

  const lastBackgroundTime = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSecuritySettings() {
      try {
        const [
          storedHash,
          storedBiometric,
          storedAutoLock,
          hasHardware,
          isEnrolled,
        ] = await Promise.all([
          SecureStore.getItemAsync(PIN_HASH_KEY),
          SecureStore.getItemAsync(BIOMETRIC_KEY),
          SecureStore.getItemAsync(AUTO_LOCK_KEY),
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);

        if (!mounted) return;

        const configured = Boolean(storedHash);

        setHasPin(configured);
        setBiometricEnabledState(
          configured && storedBiometric === 'true'
        );
        setAutoLockMinutesState(
          storedAutoLock ? Number(storedAutoLock) : 0
        );
        setBiometricAvailable(hasHardware && isEnrolled);

        // A configured app always asks for authentication on a fresh launch.
        setIsLocked(configured);
      } catch (error) {
        console.warn('Could not load security settings:', error);
      } finally {
        if (mounted) setIsReady(true);
      }
    }

    loadSecuritySettings();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active') {
        lastBackgroundTime.current = Date.now();
        return;
      }

      if (!hasPin || lastBackgroundTime.current === null) return;

      const elapsed =
        Date.now() - lastBackgroundTime.current;

      const lockAfter = autoLockMinutes * 60 * 1000;

      if (autoLockMinutes === 0 || elapsed >= lockAfter) {
        setIsLocked(true);
      }

      lastBackgroundTime.current = null;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => subscription.remove();
  }, [hasPin, autoLockMinutes]);

  const createHash = useCallback(
    async (pin: string, salt: string) => {
      return Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${salt}:${pin}`
      );
    },
    []
  );

  const setPin = useCallback(
    async (pin: string) => {
      const randomBytes = await Crypto.getRandomBytesAsync(16);
      const salt = Array.from(randomBytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');

      const hash = await createHash(pin, salt);

      await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
      await SecureStore.setItemAsync(PIN_HASH_KEY, hash);

      setHasPin(true);
      setIsLocked(false);
    },
    [createHash]
  );

  const verifyPin = useCallback(
    async (pin: string) => {
      try {
        const [storedHash, salt] = await Promise.all([
          SecureStore.getItemAsync(PIN_HASH_KEY),
          SecureStore.getItemAsync(PIN_SALT_KEY),
        ]);

        if (!storedHash || !salt) return false;

        const enteredHash = await createHash(pin, salt);

        return enteredHash === storedHash;
      } catch (error) {
        console.warn('PIN verification failed:', error);
        return false;
      }
    },
    [createHash]
  );

  const disablePin = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(PIN_HASH_KEY),
      SecureStore.deleteItemAsync(PIN_SALT_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_KEY),
    ]);

    setHasPin(false);
    setBiometricEnabledState(false);
    setIsLocked(false);
  }, []);

  const setBiometricEnabled = useCallback(
    async (enabled: boolean) => {
      if (!hasPin) return false;

      if (enabled) {
        const [hasHardware, isEnrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);

        if (!hasHardware || !isEnrolled) {
          setBiometricAvailable(false);
          return false;
        }

        const result =
          await LocalAuthentication.authenticateAsync({
            promptMessage: 'Confirm biometric authentication',
            cancelLabel: 'Cancel',
            disableDeviceFallback: true,
          });

        if (!result.success) return false;
      }

      await SecureStore.setItemAsync(
        BIOMETRIC_KEY,
        enabled ? 'true' : 'false'
      );

      setBiometricEnabledState(enabled);
      return true;
    },
    [hasPin]
  );

  const setAutoLockMinutes = useCallback(
    async (minutes: number) => {
      await SecureStore.setItemAsync(
        AUTO_LOCK_KEY,
        String(minutes)
      );

      setAutoLockMinutesState(minutes);
    },
    []
  );

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const authenticateBiometric = useCallback(async () => {
    if (!biometricEnabled || !biometricAvailable) return false;

    try {
      const result =
        await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock RupeeTrack',
          cancelLabel: 'Use PIN',
          disableDeviceFallback: true,
        });

      if (result.success) {
        setIsLocked(false);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Biometric authentication failed:', error);
      return false;
    }
  }, [biometricEnabled, biometricAvailable]);

  return (
    <SecurityContext.Provider
      value={{
        isReady,
        isLocked,
        hasPin,
        biometricEnabled,
        biometricAvailable,
        autoLockMinutes,
        setPin,
        verifyPin,
        disablePin,
        setBiometricEnabled,
        setAutoLockMinutes,
        unlock,
        authenticateBiometric,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);

  if (!context) {
    throw new Error(
      'useSecurity must be used inside SecurityProvider'
    );
  }

  return context;
}
