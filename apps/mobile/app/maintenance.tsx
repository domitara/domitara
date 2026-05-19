import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function MaintenanceScreen() {
  return (
    <View style={styles.container}>
      <FontAwesome name="wrench" size={48} color="#ccc" />
      <Text style={styles.title}>Maintenance</Text>
      <Text style={styles.sub}>Maintenance schedules coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  sub: { fontSize: 14, color: '#999' },
});
