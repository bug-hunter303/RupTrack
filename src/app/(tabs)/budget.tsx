import { View, Text, StyleSheet } from 'react-native';

export default function AnalyticsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Budget</Text>
      <Text>RupeeTrack spending analytics will go here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', padding: 24, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 10 },
});