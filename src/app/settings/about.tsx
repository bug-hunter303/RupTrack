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

const COLORS = {
  background: '#F5F6FA',
  white: '#FFFFFF',
  navy: '#17233D',
  muted: '#8992A5',
  purple: '#6256F5',
  blue: '#2878E5',
  green: '#16A673',
  border: '#E9ECF2',
};

export default function AboutScreen() {
  const router = useRouter();

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
            color={COLORS.navy}
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
                color={COLORS.purple}
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
                color={COLORS.blue}
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
                color={COLORS.green}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  header: {
    marginBottom: 25,
  },

  eyebrow: {
    color: COLORS.purple,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },

  title: {
    color: COLORS.navy,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },

  introCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 27,
  },

  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    elevation: 4,
    shadowColor: COLORS.purple,
    shadowOpacity: 0.2,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
  },

  appName: {
    color: COLORS.navy,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  tagline: {
    color: COLORS.purple,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },

  description: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 17,
  },

  sectionLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 11,
    marginLeft: 3,
  },

  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: '#EFEDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  infoIconBlue: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E8F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  infoIconGreen: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E7F8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  infoText: {
    flex: 1,
  },

  infoTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '700',
  },

  infoValue: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },

  separator: {
    height: 1,
    backgroundColor: '#F0F1F5',
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
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  footerName: {
    color: COLORS.navy,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  footerTagline: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },

  footerDivider: {
    width: '75%',
    height: 1,
    backgroundColor: '#DDE1EA',
    marginTop: 23,
    marginBottom: 17,
  },

  versionLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  version: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 5,
  },

  copyright: {
    color: '#AAB1BF',
    fontSize: 10,
    marginTop: 15,
    textAlign: 'center',
  },
});
