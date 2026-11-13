
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppearance } from '@/context/appearance-context';

export default function AboutScreen() {
  const router = useRouter();

  const { colors, accent, isDark } = useAppearance();
  const styles = createStyles(colors, accent.primary, isDark);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Back button */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={colors.text}
          />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>GET TO KNOW US</Text>
          <Text style={styles.title}>About</Text>
          <Text style={styles.subtitle}>
            Everything you need to know about RupeeTrack.
          </Text>
        </View>

        {/* App introduction */}
        <View style={styles.introCard}>
          <View style={styles.logoContainer}>
            <Ionicons
              name="wallet"
              size={35}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.appName}>RupeeTrack</Text>

          <Text style={styles.tagline}>
            Your money. Your control.
          </Text>

          <Text style={styles.description}>
            A simple and personal way to manage your income,
            track your expenses, plan your budget, and reach
            your savings goals.
          </Text>
        </View>

        {/* App information */}
        <Text style={styles.sectionLabel}>
          APP INFORMATION
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="apps-outline"
                size={20}
                color="#6256F5"
              />
            </View>

            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Application</Text>
              <Text style={styles.infoValue}>RupeeTrack</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBlue}>
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color="#2878E5"
              />
            </View>

            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Platform</Text>
              <Text style={styles.infoValue}>Android</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconGreen}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#16A673"
              />
            </View>

            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Data storage</Text>
              <Text style={styles.infoValue}>
                Stored locally on your device
              </Text>
            </View>
          </View>
        </View>

        {/* Branding footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Ionicons
              name="wallet"
              size={25}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.footerName}>RupeeTrack</Text>

          <Text style={styles.footerTagline}>
            Your money. Your control.
          </Text>

          <View style={styles.footerDivider} />

          <Text style={styles.versionLabel}>
            VERSION
          </Text>

          <Text style={styles.version}>1.0.0</Text>

          <Text style={styles.copyright}>
            Made with care for better money management.
          </Text>
        </View>
      </ScrollView>
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
      paddingTop: 12,
      paddingBottom: 40,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },

    header: {
      marginBottom: 25,
    },

    eyebrow: {
      color: primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
      marginBottom: 6,
    },

    title: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.6,
    },

    subtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 5,
    },

    introCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 25,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 27,
    },

    logoContainer: {
      width: 76,
      height: 76,
      borderRadius: 24,
      backgroundColor: primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 15,
      elevation: 4,
      shadowColor: primary,
      shadowOpacity: 0.2,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 4 },
    },

    appName: {
      color: colors.text,
      fontSize: 23,
      fontWeight: '800',
      letterSpacing: -0.5,
    },

    tagline: {
      color: primary,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 5,
    },

    description: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: 17,
    },

    sectionLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.3,
      marginBottom: 11,
      marginLeft: 3,
    },

    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
    },

    infoIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: isDark ? '#292442' : '#EFEDFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },

    infoIconBlue: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: isDark ? '#1D304A' : '#E8F2FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },

    infoIconGreen: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: isDark ? '#18372E' : '#E7F8F0',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },

    infoText: {
      flex: 1,
    },

    infoTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },

    infoValue: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 4,
    },

    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 55,
    },

    footer: {
      alignItems: 'center',
      marginTop: 45,
      paddingHorizontal: 15,
    },

    footerLogo: {
      width: 55,
      height: 55,
      borderRadius: 18,
      backgroundColor: primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },

    footerName: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '800',
      letterSpacing: -0.3,
    },

    footerTagline: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 5,
    },

    footerDivider: {
      width: '75%',
      height: 1,
      backgroundColor: colors.border,
      marginTop: 23,
      marginBottom: 17,
    },

    versionLabel: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1.5,
    },

    version: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      marginTop: 5,
    },

    copyright: {
      color: colors.muted,
      fontSize: 10,
      marginTop: 15,
      textAlign: 'center',
    },
  });
}
