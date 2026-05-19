import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import {
  createMobileApi,
  type DashboardStats,
  type Item,
  type Reminder,
} from '@/context/mobileApi';

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TONE_COLORS = {
  info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#3b82f6' },
  warn: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', dot: '#f59e0b' },
  danger: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', dot: '#ef4444' },
};

function ReminderRow({
  reminder,
  onDismiss,
  onSnooze,
}: {
  reminder: Reminder;
  onDismiss: () => void;
  onSnooze: (days: number) => void;
}) {
  const colors = TONE_COLORS[reminder.tone];

  function handleSnooze() {
    Alert.alert('Snooze for', undefined, [
      { text: '1 day', onPress: () => onSnooze(1) },
      { text: '3 days', onPress: () => onSnooze(3) },
      { text: '1 week', onPress: () => onSnooze(7) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={[styles.reminderRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={[styles.reminderDot, { backgroundColor: colors.dot }]} />
      <View style={styles.reminderText}>
        <Text style={[styles.reminderTitle, { color: colors.text }]}>{reminder.title}</Text>
        <Text style={styles.reminderBody} numberOfLines={2}>
          {reminder.body}
        </Text>
      </View>
      <Pressable onPress={handleSnooze} style={styles.reminderAction} hitSlop={8}>
        <FontAwesome name="clock-o" size={16} color="#999" />
      </Pressable>
      <Pressable onPress={onDismiss} style={styles.reminderAction} hitSlop={8}>
        <FontAwesome name="times" size={16} color="#999" />
      </Pressable>
    </View>
  );
}

function ItemCard({ item }: { item: Item }) {
  const initial = item.name.charAt(0).toUpperCase();
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemAvatar}>
        <Text style={styles.itemInitial}>{initial}</Text>
      </View>
      <Text style={styles.itemName} numberOfLines={2}>
        {item.name}
      </Text>
      {item.purchase_price !== null && (
        <Text style={styles.itemPrice}>{formatCurrency(item.purchase_price)}</Text>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const { serverUrl, token } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const api = createMobileApi(serverUrl, token ?? '');

  async function load() {
    try {
      const [s, i, r] = await Promise.all([
        api.getDashboard(),
        api.listItems(),
        api.listReminders(),
      ]);
      setStats(s);
      setItems(i);
      setReminders(r);
    } catch {
      // errors shown via empty states
    }
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [token]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function handleDismiss(id: string) {
    api.dismissReminder(id).catch(() => {});
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  function handleSnooze(id: string, days: number) {
    api.snoozeReminder(id, days).catch(() => {});
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2f95dc" />
      </View>
    );
  }

  const statCards = [
    { label: 'Total Items', value: String(stats?.total_items ?? 0), icon: 'cube' as const },
    { label: 'Locations', value: String(stats?.total_locations ?? 0), icon: 'map-marker' as const },
    { label: 'Labels', value: String(stats?.total_labels ?? 0), icon: 'tag' as const },
    { label: 'Total Value', value: formatCurrency(stats?.total_value ?? 0), icon: 'dollar' as const },
  ];

  const recentItems = items.slice(0, 10);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2f95dc" />}
    >
      {/* Stats grid */}
      <View style={styles.statsGrid}>
        {statCards.map((card) => (
          <View key={card.label} style={styles.statCard}>
            <FontAwesome name={card.icon} size={16} color="#2f95dc" style={styles.statIcon} />
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      {/* Recently added */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <FontAwesome name="clock-o" size={16} color="#666" />
            <Text style={styles.sectionTitle}>Recently Added</Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/all-items' as any)}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {recentItems.length === 0 ? (
          <Text style={styles.empty}>No items yet. Add your first item!</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.itemScroll}
          >
            {recentItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Needs attention */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <FontAwesome name="wrench" size={16} color="#666" />
            <Text style={styles.sectionTitle}>Needs Attention</Text>
          </View>
          <Pressable onPress={() => router.push('/maintenance' as any)}>
            <Text style={styles.seeAll}>View all</Text>
          </Pressable>
        </View>

        {reminders.length === 0 ? (
          <Text style={styles.empty}>All clear — no reminders right now.</Text>
        ) : (
          <View style={styles.reminderList}>
            {reminders.map((r) => (
              <ReminderRow
                key={r.id}
                reminder={r}
                onDismiss={() => handleDismiss(r.id)}
                onSnooze={(days) => handleSnooze(r.id, days)}
              />
            ))}
          </View>
        )}
      </View>

      {/* Activity */}
      {items.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <FontAwesome name="history" size={16} color="#666" />
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>
          <View style={styles.activityList}>
            {items.slice(0, 5).map((item) => (
              <View key={item.id} style={styles.activityRow}>
                <View style={styles.activityDot} />
                <View style={styles.activityText}>
                  <Text style={styles.activityName} numberOfLines={1}>
                    <Text style={styles.activityLink}>{item.name}</Text>
                    <Text style={styles.activityAction}> added</Text>
                  </Text>
                  <Text style={styles.activityDate}>{formatDate(item.created_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 4,
  },
  statIcon: { marginBottom: 2 },
  statValue: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', lineHeight: 30 },
  statLabel: { fontSize: 12, color: '#888', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },

  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  seeAll: { fontSize: 14, color: '#2f95dc', fontWeight: '500' },
  empty: { fontSize: 14, color: '#aaa', textAlign: 'center', paddingVertical: 20 },

  itemScroll: { gap: 10, paddingRight: 4 },
  itemCard: {
    width: 110,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInitial: { fontSize: 18, fontWeight: '700', color: '#2f95dc' },
  itemName: { fontSize: 12, color: '#333', fontWeight: '500', textAlign: 'center', lineHeight: 16 },
  itemPrice: { fontSize: 11, color: '#888' },

  reminderList: { gap: 8 },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  reminderDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  reminderText: { flex: 1 },
  reminderTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  reminderBody: { fontSize: 12, color: '#666', lineHeight: 16 },
  reminderAction: { padding: 4 },

  activityList: { gap: 0 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2f95dc',
    marginTop: 5,
    flexShrink: 0,
  },
  activityText: { flex: 1 },
  activityName: { fontSize: 14, color: '#333' },
  activityLink: { color: '#2f95dc', fontWeight: '500' },
  activityAction: { color: '#666' },
  activityDate: { fontSize: 12, color: '#aaa', marginTop: 2 },
});
