import { View, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function LocationsScreen() {
  return (
    <View style={styles.container}>
      <FontAwesome name="map-marker" size={48} color="#ccc" />
      <Text style={styles.title}>Locations</Text>
      <Text style={styles.sub}>Your storage locations will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  sub: { fontSize: 14, color: '#999' },
});
