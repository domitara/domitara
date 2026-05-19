import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth';
import { createMobileApi, type Item } from '@/context/mobileApi';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { serverUrl, token } = useAuth();
  const api = createMobileApi(serverUrl, token ?? '');

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getItem(id)
      .then(setItem)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2f95dc" /></View>;
  }

  if (!item) {
    return (
      <View style={s.center}>
        <Text style={s.notFound}>Item not found.</Text>
      </View>
    );
  }

  return (
    <View style={s.center}>
      <Text style={s.name}>{item.name}</Text>
      <Text style={s.sub}>Item detail coming soon.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  name: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  sub: { fontSize: 14, color: '#aaa' },
  notFound: { fontSize: 16, color: '#aaa' },
});
