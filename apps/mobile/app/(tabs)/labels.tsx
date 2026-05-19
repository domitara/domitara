import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/context/auth';
import { createMobileApi, type Label, type Item, type Location } from '@/context/mobileApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_BG = ['#dbeafe','#fce7f3','#dcfce7','#fef3c7','#ede9fe','#fee2e2','#cffafe'];
const AVATAR_FG = ['#1d4ed8','#be185d','#15803d','#b45309','#6d28d9','#b91c1c','#0e7490'];
function avatarColor(id: string) {
  const i = id.charCodeAt(0) % AVATAR_BG.length;
  return { bg: AVATAR_BG[i], fg: AVATAR_FG[i] };
}

// ─── Label list row ───────────────────────────────────────────────────────────

function LabelRow({
  label,
  selected,
  onPress,
}: {
  label: Label;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        s.labelRow,
        selected && s.labelRowSelected,
        pressed && !selected && s.labelRowPressed,
      ]}
      onPress={onPress}
    >
      <View style={[s.colorDot, { backgroundColor: label.color }]} />
      <Text style={[s.labelName, selected && s.labelNameSelected]} numberOfLines={1}>
        {label.name}
      </Text>
      <View style={[s.countBadge, selected && { backgroundColor: label.color + '33' }]}>
        <Text style={[s.countText, selected && { color: label.color }]}>
          {label.item_count}
        </Text>
      </View>
      <FontAwesome name="chevron-right" size={11} color={selected ? label.color : '#ddd'} />
    </Pressable>
  );
}

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  locationName,
}: {
  item: Item;
  locationName?: string;
}) {
  const { bg, fg } = avatarColor(item.id);
  return (
    <View style={s.itemRow}>
      <View style={[s.itemAvatar, { backgroundColor: bg }]}>
        <Text style={[s.itemInitial, { color: fg }]}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={s.itemMain}>
        <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
        {locationName && <Text style={s.itemSub} numberOfLines={1}>{locationName}</Text>}
      </View>
      {item.purchase_price !== null && (
        <Text style={s.itemPrice}>
          ${item.purchase_price >= 1000
            ? `${(item.purchase_price / 1000).toFixed(1)}k`
            : item.purchase_price.toFixed(0)}
        </Text>
      )}
    </View>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function LabelDetail({
  label,
  items,
  locationMap,
  onClose,
}: {
  label: Label;
  items: Item[];
  locationMap: Map<string, Location>;
  onClose: () => void;
}) {
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      refreshing={false}
      ListHeaderComponent={() => (
        <View>
          {/* Label header */}
          <View style={s.detailHeader}>
            <View style={[s.detailDot, { backgroundColor: label.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.detailName}>{label.name}</Text>
              <Text style={s.detailMeta}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={s.closeBtn}>
              <FontAwesome name="arrow-left" size={15} color="#888" />
              <Text style={s.closeBtnText}>All labels</Text>
            </Pressable>
          </View>
          <Text style={s.sectionLabel}>
            {items.length === 0 ? 'No items with this label' : 'Items'}
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <ItemRow
          item={item}
          locationName={item.location_id ? locationMap.get(item.location_id)?.name : undefined}
        />
      )}
      ItemSeparatorComponent={() => <View style={s.separator} />}
      ListEmptyComponent={() => (
        <View style={s.emptyDetail}>
          <FontAwesome name="tag" size={32} color="#ddd" />
          <Text style={s.emptyDetailText}>No items with this label yet.</Text>
        </View>
      )}
      contentContainerStyle={{ paddingBottom: 32 }}
    />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LabelsScreen() {
  const { serverUrl, token } = useAuth();
  const api = createMobileApi(serverUrl, token ?? '');

  const [labels, setLabels] = useState<Label[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [labs, its, locs] = await Promise.all([
        api.listLabels(),
        api.listItems(),
        api.listLocations(),
      ]);
      setLabels(labs);
      setItems(its);
      setLocations(locs);
    } catch { /* empty state */ }
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

  const locationMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return labels;
    const q = search.toLowerCase();
    return labels.filter((l) => l.name.toLowerCase().includes(q));
  }, [labels, search]);

  const selectedLabel = selected ? labels.find((l) => l.id === selected) : null;

  const selectedItems = useMemo(
    () => (selected ? items.filter((i) => i.label_ids.includes(selected)) : []),
    [selected, items],
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2f95dc" /></View>;
  }

  // Detail view
  if (selectedLabel) {
    return (
      <View style={s.screen}>
        <LabelDetail
          label={selectedLabel}
          items={selectedItems}
          locationMap={locationMap}
          onClose={() => setSelected(null)}
        />
      </View>
    );
  }

  // List view
  return (
    <View style={s.screen}>
      {/* Search bar */}
      <View style={s.searchBar}>
        <FontAwesome name="search" size={15} color="#aaa" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search labels…"
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <FontAwesome name="times-circle" size={16} color="#bbb" />
          </Pressable>
        )}
      </View>

      {/* Count */}
      <View style={s.countRow}>
        <Text style={s.countRowText}>{filtered.length} label{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(l) => l.id}
        renderItem={({ item: label }) => (
          <LabelRow
            label={label}
            selected={selected === label.id}
            onPress={() => setSelected(label.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2f95dc" />
        }
        contentContainerStyle={filtered.length === 0 ? s.emptyContent : undefined}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <FontAwesome name="tag" size={48} color="#ddd" />
            <Text style={s.emptyTitle}>{search ? 'No labels match' : 'No labels yet'}</Text>
            <Text style={s.emptySub}>
              {search ? 'Try a different search.' : 'Create labels from the web app.'}
            </Text>
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
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ebebeb',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1a1a1a', paddingVertical: 0 },

  countRow: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  countRowText: { fontSize: 12, color: '#aaa', fontWeight: '500' },

  labelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff',
  },
  labelRowSelected: { backgroundColor: '#f8fbff' },
  labelRowPressed: { backgroundColor: '#f9f9f9' },
  colorDot: { width: 14, height: 14, borderRadius: 7, flexShrink: 0 },
  labelName: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  labelNameSelected: { fontWeight: '600' },
  countBadge: {
    backgroundColor: '#f0f0f0', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  countText: { fontSize: 12, color: '#888', fontWeight: '600' },

  separator: { height: 1, backgroundColor: '#f0f0f0' },
  emptyContent: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#ccc' },
  emptySub: { fontSize: 14, color: '#ccc', textAlign: 'center' },

  // Detail view
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  detailDot: { width: 20, height: 20, borderRadius: 10, flexShrink: 0 },
  detailName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  detailMeta: { fontSize: 13, color: '#aaa', marginTop: 2 },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8 },
  closeBtnText: { fontSize: 13, color: '#888', fontWeight: '500' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#aaa',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
  },
  itemAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  itemInitial: { fontSize: 14, fontWeight: '700' },
  itemMain: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  itemSub: { fontSize: 12, color: '#aaa', marginTop: 1 },
  itemPrice: { fontSize: 13, color: '#888' },

  emptyDetail: { alignItems: 'center', gap: 12, padding: 48 },
  emptyDetailText: { fontSize: 14, color: '#ccc' },
});
