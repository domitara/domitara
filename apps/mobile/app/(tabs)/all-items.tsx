import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import {
  createMobileApi,
  type Item,
  type Location,
  type Label,
  type ItemStatus,
} from '@/context/mobileApi';

// Deterministic avatar color from item id
const AVATAR_BG = ['#dbeafe', '#fce7f3', '#dcfce7', '#fef3c7', '#ede9fe', '#fee2e2', '#cffafe'];
const AVATAR_FG = ['#1d4ed8', '#be185d', '#15803d', '#b45309', '#6d28d9', '#b91c1c', '#0e7490'];
function avatarColor(id: string) {
  const i = id.charCodeAt(0) % AVATAR_BG.length;
  return { bg: AVATAR_BG[i], fg: AVATAR_FG[i] };
}

const STATUS_CONFIG: Record<ItemStatus, { label: string; bg: string; color: string }> = {
  owned:   { label: 'Owned',   bg: '#dcfce7', color: '#15803d' },
  loaned:  { label: 'Loaned',  bg: '#fef3c7', color: '#b45309' },
  missing: { label: 'Missing', bg: '#fee2e2', color: '#b91c1c' },
};

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  location,
  labels,
  onPress,
}: {
  item: Item;
  location: Location | undefined;
  labels: Label[];
  onPress: () => void;
}) {
  const { bg, fg } = avatarColor(item.id);
  const itemLabels = labels.filter((l) => item.label_ids.includes(l.id));
  const status = item.status !== 'owned' ? STATUS_CONFIG[item.status] : null;

  return (
    <Pressable style={({ pressed }) => [s.row, pressed && s.rowPressed]} onPress={onPress}>
      {/* Avatar */}
      <View style={[s.avatar, { backgroundColor: bg }]}>
        <Text style={[s.avatarText, { color: fg }]}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>

      {/* Main content */}
      <View style={s.rowMain}>
        <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
        <View style={s.rowMeta}>
          {location && (
            <Text style={s.rowLocation} numberOfLines={1}>
              <FontAwesome name="map-marker" size={10} color="#aaa" />
              {'  '}{location.name}
            </Text>
          )}
          {itemLabels.length > 0 && (
            <View style={s.labelDots}>
              {itemLabels.slice(0, 4).map((l) => (
                <View key={l.id} style={[s.labelDot, { backgroundColor: l.color }]} />
              ))}
              {itemLabels.length > 4 && (
                <Text style={s.labelMore}>+{itemLabels.length - 4}</Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Right side */}
      <View style={s.rowRight}>
        {item.purchase_price !== null && (
          <Text style={s.rowPrice}>
            ${item.purchase_price >= 1000
              ? `${(item.purchase_price / 1000).toFixed(1)}k`
              : item.purchase_price.toFixed(0)}
          </Text>
        )}
        {status && (
          <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        )}
      </View>

      <FontAwesome name="chevron-right" size={12} color="#ccc" style={{ marginLeft: 4 }} />
    </Pressable>
  );
}

// ─── Label filter chip ────────────────────────────────────────────────────────

function LabelChip({
  label,
  active,
  onPress,
}: {
  label: Label;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[s.chip, active && { backgroundColor: label.color + '33', borderColor: label.color }]}
      onPress={onPress}
    >
      <View style={[s.chipDot, { backgroundColor: label.color }]} />
      <Text style={[s.chipText, active && { color: '#1a1a1a', fontWeight: '600' }]}>
        {label.name}
      </Text>
      {active && <FontAwesome name="times" size={10} color={label.color} style={{ marginLeft: 2 }} />}
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AllItemsScreen() {
  const { serverUrl, token } = useAuth();
  const router = useRouter();
  const api = createMobileApi(serverUrl, token ?? '');

  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [search, setSearch] = useState('');
  const [activeLabels, setActiveLabels] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const searchRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    try {
      const [its, locs, labs] = await Promise.all([
        api.listItems(),
        api.listLocations(),
        api.listLabels(),
      ]);
      setItems(its);
      setLocations(locs);
      setLabels(labs);
    } catch {
      // empty state handles error
    }
  }, []);

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

  function toggleLabel(id: string) {
    setActiveLabels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let xs = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      xs = xs.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.manufacturer?.toLowerCase().includes(q) ||
          i.model?.toLowerCase().includes(q) ||
          i.serial?.toLowerCase().includes(q) ||
          i.asset_id?.toLowerCase().includes(q),
      );
    }
    if (activeLabels.size > 0) {
      xs = xs.filter((i) => i.label_ids.some((lid) => activeLabels.has(lid)));
    }
    return xs;
  }, [items, search, activeLabels]);

  const hasFilters = search.trim().length > 0 || activeLabels.size > 0;

  function clearFilters() {
    setSearch('');
    setActiveLabels(new Set());
  }

  const locationMap = useMemo(
    () => new Map(locations.map((l) => [l.id, l])),
    [locations],
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2f95dc" /></View>;
  }

  return (
    <View style={s.screen}>
      {/* Search bar */}
      <View style={s.searchBar}>
        <FontAwesome name="search" size={15} color="#aaa" style={{ marginRight: 8 }} />
        <TextInput
          ref={searchRef}
          style={s.searchInput}
          placeholder="Search items…"
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <FontAwesome name="times-circle" size={16} color="#bbb" />
          </Pressable>
        )}
      </View>

      {/* Label filter chips */}
      {labels.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipBar}
          contentContainerStyle={s.chipBarContent}
        >
          {labels.map((l) => (
            <LabelChip
              key={l.id}
              label={l}
              active={activeLabels.has(l.id)}
              onPress={() => toggleLabel(l.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Count + clear row */}
      <View style={s.countRow}>
        <Text style={s.countText}>
          {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          {hasFilters ? ' (filtered)' : ''}
        </Text>
        {hasFilters && (
          <Pressable onPress={clearFilters}>
            <Text style={s.clearText}>Clear filters</Text>
          </Pressable>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            location={item.location_id ? locationMap.get(item.location_id) : undefined}
            labels={labels}
            onPress={() => router.push({ pathname: '/item-detail', params: { id: item.id } } as any)}
          />
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        contentContainerStyle={filtered.length === 0 ? s.emptyContent : s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2f95dc" />
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            <FontAwesome name="inbox" size={48} color="#ddd" />
            <Text style={s.emptyTitle}>
              {hasFilters ? 'No items match' : 'No items yet'}
            </Text>
            <Text style={s.emptySub}>
              {hasFilters ? 'Try clearing your search or filters.' : 'Add items from the web app to get started.'}
            </Text>
            {hasFilters && (
              <Pressable style={s.clearBtn} onPress={clearFilters}>
                <Text style={s.clearBtnText}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    paddingVertical: 0,
  },

  chipBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ebebeb', flexGrow: 0 },
  chipBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, color: '#666', fontWeight: '500' },

  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countText: { fontSize: 12, color: '#aaa', fontWeight: '500' },
  clearText: { fontSize: 12, color: '#2f95dc', fontWeight: '600' },

  listContent: { paddingBottom: 24 },
  emptyContent: { flex: 1 },
  separator: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 70 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowPressed: { backgroundColor: '#f9f9f9' },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 17, fontWeight: '700' },

  rowMain: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 3 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowLocation: { fontSize: 12, color: '#aaa' },
  labelDots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  labelDot: { width: 8, height: 8, borderRadius: 4 },
  labelMore: { fontSize: 10, color: '#aaa', marginLeft: 2 },

  rowRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  rowPrice: { fontSize: 13, color: '#555', fontWeight: '500' },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#ccc' },
  emptySub: { fontSize: 14, color: '#ccc', textAlign: 'center', lineHeight: 20 },
  clearBtn: {
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#2f95dc',
  },
  clearBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
