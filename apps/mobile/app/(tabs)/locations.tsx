import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/context/auth';
import { createMobileApi, type Location, type Item } from '@/context/mobileApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDescendantIds(locations: Location[], rootId: string): Set<string> {
  const result = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const l of locations) {
      if (l.parent_id === cur && !result.has(l.id)) {
        result.add(l.id);
        queue.push(l.id);
      }
    }
  }
  return result;
}

// ─── Item row (compact) ───────────────────────────────────────────────────────

const AVATAR_BG = ['#dbeafe','#fce7f3','#dcfce7','#fef3c7','#ede9fe','#fee2e2','#cffafe'];
const AVATAR_FG = ['#1d4ed8','#be185d','#15803d','#b45309','#6d28d9','#b91c1c','#0e7490'];
function avatarColor(id: string) {
  const i = id.charCodeAt(0) % AVATAR_BG.length;
  return { bg: AVATAR_BG[i], fg: AVATAR_FG[i] };
}

function ItemRow({ item, locationName }: { item: Item; locationName?: string }) {
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

// ─── Tree node ────────────────────────────────────────────────────────────────

function TreeNode({
  location,
  allLocations,
  depth,
  expanded,
  selected,
  onToggleExpand,
  onSelect,
}: {
  location: Location;
  allLocations: Location[];
  depth: number;
  expanded: Set<string>;
  selected: string | null;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const children = allLocations.filter((l) => l.parent_id === location.id);
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(location.id);
  const isSelected = selected === location.id;

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          s.treeRow,
          { paddingLeft: 16 + depth * 20 },
          isSelected && s.treeRowSelected,
          pressed && !isSelected && s.treeRowPressed,
        ]}
        onPress={() => onSelect(location.id)}
      >
        {/* Expand/collapse chevron */}
        <Pressable
          style={s.chevronWrap}
          onPress={() => hasChildren && onToggleExpand(location.id)}
          hitSlop={8}
        >
          {hasChildren ? (
            <FontAwesome
              name={isExpanded ? 'chevron-down' : 'chevron-right'}
              size={11}
              color={isSelected ? '#2f95dc' : '#bbb'}
            />
          ) : (
            <View style={{ width: 11 }} />
          )}
        </Pressable>

        <FontAwesome
          name={isExpanded && hasChildren ? 'folder-open' : 'folder'}
          size={15}
          color={isSelected ? '#2f95dc' : '#999'}
          style={{ marginRight: 8 }}
        />

        <Text
          style={[s.treeName, isSelected && s.treeNameSelected]}
          numberOfLines={1}
        >
          {location.name}
        </Text>

        <View style={[s.countBadge, isSelected && s.countBadgeSelected]}>
          <Text style={[s.countBadgeText, isSelected && { color: '#2f95dc' }]}>
            {location.item_count}
          </Text>
        </View>

        <FontAwesome name="chevron-right" size={11} color={isSelected ? '#2f95dc' : '#ddd'} />
      </Pressable>

      {isExpanded && children.map((child) => (
        <TreeNode
          key={child.id}
          location={child}
          allLocations={allLocations}
          depth={depth + 1}
          expanded={expanded}
          selected={selected}
          onToggleExpand={onToggleExpand}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LocationsScreen() {
  const { serverUrl, token } = useAuth();
  const api = createMobileApi(serverUrl, token ?? '');

  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [locs, its] = await Promise.all([api.listLocations(), api.listItems()]);
      setLocations(locs);
      setItems(its);
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

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelect(id: string) {
    setSelected((prev) => (prev === id ? null : id));
  }

  const locationMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);

  const filteredLocations = useMemo(() => {
    if (!search.trim()) return locations;
    const q = search.toLowerCase();
    return locations.filter((l) => l.name.toLowerCase().includes(q));
  }, [locations, search]);

  const rootLocations = useMemo(
    () => (search.trim()
      ? filteredLocations
      : filteredLocations.filter((l) => l.parent_id === null)
    ),
    [filteredLocations, search],
  );

  const selectedLocation = selected ? locationMap.get(selected) : null;

  const selectedItems = useMemo(() => {
    if (!selected) return [];
    const descIds = getDescendantIds(locations, selected);
    return items.filter((i) => i.location_id && descIds.has(i.location_id));
  }, [selected, locations, items]);

  const selectedChildren = useMemo(
    () => (selected ? locations.filter((l) => l.parent_id === selected) : []),
    [selected, locations],
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
          style={s.searchInput}
          placeholder="Search locations…"
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={(t) => { setSearch(t); setSelected(null); }}
          returnKeyType="search"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <FontAwesome name="times-circle" size={16} color="#bbb" />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2f95dc" />}
      >
        {/* Tree */}
        <View style={s.treeCard}>
          {rootLocations.length === 0 ? (
            <Text style={s.empty}>
              {search ? 'No locations match.' : 'No locations yet.'}
            </Text>
          ) : (
            rootLocations.map((l) => (
              <TreeNode
                key={l.id}
                location={l}
                allLocations={locations}
                depth={0}
                expanded={search.trim() ? new Set(locations.map((x) => x.id)) : expanded}
                selected={selected}
                onToggleExpand={toggleExpand}
                onSelect={handleSelect}
              />
            ))
          )}
        </View>

        {/* Detail panel */}
        {selectedLocation && (
          <View style={s.detailCard}>
            {/* Header */}
            <View style={s.detailHeader}>
              <FontAwesome name="folder-open" size={18} color="#2f95dc" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.detailName}>{selectedLocation.name}</Text>
                <Text style={s.detailMeta}>
                  {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
                  {selectedChildren.length > 0 && ` · ${selectedChildren.length} sub-location${selectedChildren.length !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <Pressable onPress={() => setSelected(null)} hitSlop={8}>
                <FontAwesome name="times" size={16} color="#bbb" />
              </Pressable>
            </View>

            {/* Sub-locations */}
            {selectedChildren.length > 0 && (
              <View style={s.subLocationList}>
                {selectedChildren.map((child) => (
                  <Pressable
                    key={child.id}
                    style={s.subLocationRow}
                    onPress={() => handleSelect(child.id)}
                  >
                    <FontAwesome name="folder" size={13} color="#aaa" />
                    <Text style={s.subLocationName}>{child.name}</Text>
                    <Text style={s.subLocationCount}>{child.item_count}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Items */}
            <Text style={s.sectionLabel}>
              {selectedItems.length === 0 ? 'No items in this location' : 'Items'}
            </Text>
            {selectedItems.slice(0, 20).map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                locationName={
                  item.location_id !== selected
                    ? locationMap.get(item.location_id!)?.name
                    : undefined
                }
              />
            ))}
            {selectedItems.length > 20 && (
              <Text style={s.moreItems}>+{selectedItems.length - 20} more items</Text>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ebebeb',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1a1a1a', paddingVertical: 0 },

  treeCard: {
    margin: 12, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    overflow: 'hidden',
  },
  empty: { fontSize: 14, color: '#bbb', textAlign: 'center', padding: 32 },

  treeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingRight: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  treeRowSelected: { backgroundColor: '#eff6ff' },
  treeRowPressed: { backgroundColor: '#f9f9f9' },
  chevronWrap: { width: 24, alignItems: 'center' },
  treeName: { flex: 1, fontSize: 14, color: '#1a1a1a', marginRight: 8 },
  treeNameSelected: { color: '#1d4ed8', fontWeight: '600' },
  countBadge: {
    backgroundColor: '#f0f0f0', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 1, marginRight: 8,
  },
  countBadgeSelected: { backgroundColor: '#dbeafe' },
  countBadgeText: { fontSize: 11, color: '#888', fontWeight: '600' },

  detailCard: {
    marginHorizontal: 12, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  detailName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  detailMeta: { fontSize: 12, color: '#aaa', marginTop: 2 },

  subLocationList: { paddingHorizontal: 16, paddingVertical: 8, gap: 4 },
  subLocationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f8f8f8',
  },
  subLocationName: { flex: 1, fontSize: 13, color: '#555' },
  subLocationCount: { fontSize: 12, color: '#aaa' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#aaa',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#f5f5f5',
  },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f8f8f8',
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
  moreItems: { fontSize: 13, color: '#aaa', textAlign: 'center', padding: 12 },
});
