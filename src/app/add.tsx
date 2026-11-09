
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function AddScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={27} color="#171B28" />
        </Pressable>
        <Text style={styles.heading}>Add to RupeeTrack</Text>
        <View style={{ width: 27 }} />
      </View>

      <Text style={styles.subtitle}>What would you like to add?</Text>

      <Pressable
        style={styles.option}
        onPress={() => router.push('/income')}
      >
        <View style={[styles.iconBox, { backgroundColor: '#E0F7EB' }]}>
          <Ionicons name="trending-up" size={25} color="#16A36A" />
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Add Income</Text>
          <Text style={styles.optionDescription}>
            Monthly salary or extra money
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9296A0" />
      </Pressable>

      <Pressable
        style={styles.option}
        onPress={() => router.push('/expense')}
      >
        <View style={[styles.iconBox, { backgroundColor: '#FCE8E8' }]}>
          <Ionicons name="receipt-outline" size={25} color="#E34D4D" />
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Add Expense</Text>
          <Text style={styles.optionDescription}>
            Create a bill and add your expenses
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9296A0" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    padding: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#171B28',
  },
  subtitle: {
    fontSize: 14,
    color: '#858995',
    marginTop: 35,
    marginBottom: 18,
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 13,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 5,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#171B28',
  },
  optionDescription: {
    fontSize: 12,
    color: '#858995',
  },
});
