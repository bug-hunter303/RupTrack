import { View, Text } from 'react-native';

export default function ExpenseScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F7F8FA', padding: 24, paddingTop: 60 }}>
      <Text style={{ fontSize: 26, fontWeight: 'bold' }}>Create a Bill</Text>
    </View>
  );
}