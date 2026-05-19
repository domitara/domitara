import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Linking,
  TextInput,
  Modal,
  useWindowDimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth';
import {
  createMobileApi,
  type Home,
  type HomeMember,
  type HomePhoto,
  type HomeDocument,
  type HomeDocumentType,
} from '@/context/mobileApi';

type Tab = 'details' | 'photos' | 'documents' | 'members' | 'floor-plans';

const TABS: { id: Tab; label: string; icon: React.ComponentProps<typeof FontAwesome>['name'] }[] = [
  { id: 'details', label: 'Details', icon: 'home' },
  { id: 'photos', label: 'Photos', icon: 'photo' },
  { id: 'documents', label: 'Documents', icon: 'file-text-o' },
  { id: 'members', label: 'Members', icon: 'users' },
  { id: 'floor-plans', label: 'Floor Plans', icon: 'map-o' },
];

const DOC_TYPE_LABELS: Record<HomeDocumentType, string> = {
  deed: 'Deed', insurance: 'Insurance', inspection: 'Inspection',
  survey: 'Survey', hoa: 'HOA', warranty: 'Warranty',
  permit: 'Permit', tax: 'Tax Records', floor_plan: 'Floor Plan', other: 'Other',
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  house: 'House', condo: 'Condo', apartment: 'Apartment',
  townhouse: 'Townhouse', mobile: 'Mobile Home', land: 'Land',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(n: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

// ─── Details tab ─────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null;
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{String(value)}</Text>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailsTab({ home }: { home: Home }) {
  const addressParts = [
    home.address_street,
    home.address_city,
    home.address_state,
    home.address_zip,
    home.address_country,
  ].filter(Boolean);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <SectionCard title="Basic Info">
        <DetailRow label="Name" value={home.name} />
        <DetailRow label="Type" value={home.property_type ? PROPERTY_TYPE_LABELS[home.property_type] : null} />
        {addressParts.length > 0 && (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Address</Text>
            <Text style={s.detailValue}>{addressParts.join(', ')}</Text>
          </View>
        )}
        <DetailRow label="Year built" value={home.year_built} />
        <DetailRow label="Sq. footage" value={home.sqft ? `${home.sqft.toLocaleString()} sqft` : null} />
        <DetailRow label="Acreage" value={home.acreage ? `${home.acreage} acres` : null} />
        {home.notes ? (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Notes</Text>
            <Text style={[s.detailValue, { flex: 1 }]}>{home.notes}</Text>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Financial">
        <DetailRow label="Purchase price" value={formatCurrency(home.purchase_price)} />
        <DetailRow label="Purchase date" value={home.purchased_at ? new Date(home.purchased_at).toLocaleDateString() : null} />
        <DetailRow label="Est. value" value={formatCurrency(home.estimated_value)} />
        <DetailRow label="Mortgage lender" value={home.mortgage_lender} />
        <DetailRow label="Mortgage notes" value={home.mortgage_notes} />
      </SectionCard>

      {(home.hoa_name || home.hoa_contact || home.hoa_monthly_dues) ? (
        <SectionCard title="HOA">
          <DetailRow label="Name" value={home.hoa_name} />
          <DetailRow label="Contact" value={home.hoa_contact} />
          <DetailRow label="Monthly dues" value={formatCurrency(home.hoa_monthly_dues)} />
        </SectionCard>
      ) : null}
    </ScrollView>
  );
}

// ─── Photos tab ───────────────────────────────────────────────────────────────

function PhotosTab({
  homeId,
  serverUrl,
  api,
}: {
  homeId: string;
  serverUrl: string;
  api: ReturnType<typeof createMobileApi>;
}) {
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState<HomePhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setPhotos(await api.listHomePhotos(homeId));
    } finally {
      setLoading(false);
    }
  }, [homeId]);

  useEffect(() => { void load(); }, [load]);

  function handleDelete(photoId: string) {
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          api.deleteHomePhoto(homeId, photoId).catch(() => {});
          setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        },
      },
    ]);
  }

  const imgSize = (width - 16 * 2 - 8 * 2) / 3;

  if (loading) return <View style={s.center}><ActivityIndicator color="#2f95dc" /></View>;

  if (photos.length === 0) {
    return (
      <View style={s.empty}>
        <FontAwesome name="photo" size={40} color="#ccc" />
        <Text style={s.emptyText}>No photos yet.</Text>
      </View>
    );
  }

  const fullUrl = (url: string) => url.startsWith('http') ? url : `${serverUrl}${url}`;

  return (
    <ScrollView contentContainerStyle={s.photoGrid}>
      {photos.map((p) => (
        <View key={p.id} style={[s.photoWrap, { width: imgSize, height: imgSize }]}>
          <Pressable onPress={() => Linking.openURL(fullUrl(p.url))}>
            <Image source={{ uri: fullUrl(p.url) }} style={{ width: imgSize, height: imgSize, borderRadius: 8 }} />
          </Pressable>
          <Pressable style={s.photoDelete} onPress={() => handleDelete(p.id)}>
            <FontAwesome name="times" size={12} color="#fff" />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Documents tab ────────────────────────────────────────────────────────────

function DocumentsTab({
  homeId,
  serverUrl,
  api,
}: {
  homeId: string;
  serverUrl: string;
  api: ReturnType<typeof createMobileApi>;
}) {
  const [docs, setDocs] = useState<HomeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setDocs(await api.listHomeDocuments(homeId));
    } finally {
      setLoading(false);
    }
  }, [homeId]);

  useEffect(() => { void load(); }, [load]);

  function handleDelete(docId: string) {
    Alert.alert('Delete document?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          api.deleteHomeDocument(homeId, docId).catch(() => {});
          setDocs((prev) => prev.filter((d) => d.id !== docId));
        },
      },
    ]);
  }

  const fullUrl = (url: string) => url.startsWith('http') ? url : `${serverUrl}${url}`;

  if (loading) return <View style={s.center}><ActivityIndicator color="#2f95dc" /></View>;

  if (docs.length === 0) {
    return (
      <View style={s.empty}>
        <FontAwesome name="file-text-o" size={40} color="#ccc" />
        <Text style={s.emptyText}>No documents yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      {docs.map((d) => (
        <View key={d.id} style={s.docRow}>
          <FontAwesome name="file-text-o" size={20} color="#888" style={{ marginTop: 2 }} />
          <Pressable style={{ flex: 1 }} onPress={() => Linking.openURL(fullUrl(d.url))}>
            <Text style={s.docName} numberOfLines={1}>{d.filename}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
              {d.document_type && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{DOC_TYPE_LABELS[d.document_type]}</Text>
                </View>
              )}
              <Text style={s.docMeta}>{formatBytes(d.size)}</Text>
              <Text style={s.docMeta}>·</Text>
              <Text style={s.docMeta}>{new Date(d.created_at).toLocaleDateString()}</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => handleDelete(d.id)} hitSlop={8}>
            <FontAwesome name="trash-o" size={18} color="#f87171" />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Members tab ──────────────────────────────────────────────────────────────

function MembersTab({
  homeId,
  api,
  currentRole,
}: {
  homeId: string;
  api: ReturnType<typeof createMobileApi>;
  currentRole: string;
}) {
  const [members, setMembers] = useState<HomeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const load = useCallback(async () => {
    try {
      setMembers(await api.listHomeMembers(homeId));
    } finally {
      setLoading(false);
    }
  }, [homeId]);

  useEffect(() => { void load(); }, [load]);

  async function handleAdd() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setAdding(true);
    setAddError('');
    try {
      await api.addHomeMember(homeId, trimmed);
      setEmail('');
      await load();
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  function handleRemove(userId: number, name: string) {
    Alert.alert(`Remove ${name}?`, 'They will lose access to this home.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await api.removeHomeMember(homeId, userId).catch(() => {});
          setMembers((prev) => prev.filter((m) => m.user_id !== userId));
        },
      },
    ]);
  }

  if (loading) return <View style={s.center}><ActivityIndicator color="#2f95dc" /></View>;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {currentRole === 'owner' && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Invite member</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={s.input}
              placeholder="member@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={[s.inviteBtn, adding && { opacity: 0.6 }]}
              onPress={() => void handleAdd()}
              disabled={adding}
            >
              {adding
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.inviteBtnText}>Invite</Text>
              }
            </Pressable>
          </View>
          {addError ? <Text style={s.errorText}>{addError}</Text> : null}
        </View>
      )}

      {members.map((m) => {
        const initials = m.user_name
          .split(' ')
          .map((p) => p[0] ?? '')
          .join('')
          .toUpperCase()
          .slice(0, 2);
        return (
          <View key={m.user_id} style={s.memberRow}>
            <View style={s.memberAvatar}>
              <Text style={s.memberInitials}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.memberName}>{m.user_name}</Text>
              <Text style={s.memberEmail}>{m.user_email}</Text>
            </View>
            <View style={[s.badge, m.role === 'owner' ? s.badgeBlue : s.badgeGray]}>
              <Text style={[s.badgeText, m.role === 'owner' ? { color: '#1d4ed8' } : { color: '#6b7280' }]}>
                {m.role}
              </Text>
            </View>
            {currentRole === 'owner' && m.role !== 'owner' && (
              <Pressable onPress={() => handleRemove(m.user_id, m.user_name)} hitSlop={8} style={{ marginLeft: 8 }}>
                <FontAwesome name="times" size={16} color="#f87171" />
              </Pressable>
            )}
          </View>
        );
      })}

      {members.length === 0 && (
        <View style={s.empty}>
          <FontAwesome name="users" size={36} color="#ccc" />
          <Text style={s.emptyText}>No members found.</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Floor Plans tab ──────────────────────────────────────────────────────────

function FloorPlansTab({
  homeId,
  api,
}: {
  homeId: string;
  api: ReturnType<typeof createMobileApi>;
}) {
  const [areas, setAreas] = useState<Awaited<ReturnType<typeof api.listFloorPlanAreas>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listFloorPlanAreas(homeId)
      .then(setAreas)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [homeId]);

  if (loading) return <View style={s.center}><ActivityIndicator color="#2f95dc" /></View>;

  if (areas.length === 0) {
    return (
      <View style={s.empty}>
        <FontAwesome name="map-o" size={40} color="#ccc" />
        <Text style={s.emptyText}>No floor plan areas defined yet.</Text>
        <Text style={s.emptySubtext}>Use the web app to draw floor plan areas.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      {areas.map((area) => (
        <View key={area.id} style={s.areaRow}>
          <View style={[s.areaSwatch, { backgroundColor: area.color }]} />
          <Text style={s.areaName}>{area.name}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Home picker modal ────────────────────────────────────────────────────────

function HomePicker({
  homes,
  selectedId,
  onSelect,
}: {
  homes: Home[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = homes.find((h) => h.id === selectedId);
  const insets = useSafeAreaInsets();

  if (homes.length <= 1) return null;

  return (
    <>
      <Pressable style={s.pickerBtn} onPress={() => setOpen(true)}>
        <FontAwesome name="home" size={14} color="#2f95dc" />
        <Text style={s.pickerBtnText} numberOfLines={1}>{selected?.name ?? 'Select home'}</Text>
        <FontAwesome name="chevron-down" size={11} color="#999" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setOpen(false)} />
        <View style={[s.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={s.modalTitle}>Select home</Text>
          {homes.map((h) => (
            <Pressable
              key={h.id}
              style={[s.homeOption, h.id === selectedId && s.homeOptionActive]}
              onPress={() => { onSelect(h.id); setOpen(false); }}
            >
              <Text style={[s.homeOptionText, h.id === selectedId && { color: '#2f95dc', fontWeight: '600' }]}>
                {h.name}
              </Text>
              {h.id === selectedId && <FontAwesome name="check" size={14} color="#2f95dc" />}
            </Pressable>
          ))}
        </View>
      </Modal>
    </>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function HomeDetailScreen() {
  const { serverUrl, token } = useAuth();
  const api = createMobileApi(serverUrl, token ?? '');

  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.listHomes()
      .then((list) => {
        setHomes(list);
        if (list.length > 0) setSelectedHomeId(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const selectedHome = homes.find((h) => h.id === selectedHomeId) ?? null;

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2f95dc" /></View>;
  }

  if (homes.length === 0) {
    return (
      <View style={s.empty}>
        <FontAwesome name="home" size={48} color="#ccc" />
        <Text style={s.emptyText}>No homes yet.</Text>
        <Text style={s.emptySubtext}>Add a home from the web app to get started.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Home picker (only shown when multiple homes) */}
      <HomePicker homes={homes} selectedId={selectedHomeId} onSelect={setSelectedHomeId} />

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabBar}
        contentContainerStyle={s.tabBarContent}
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={[s.tab, activeTab === tab.id && s.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <FontAwesome
              name={tab.icon}
              size={13}
              color={activeTab === tab.id ? '#2f95dc' : '#888'}
            />
            <Text style={[s.tabLabel, activeTab === tab.id && s.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Tab content */}
      {selectedHome && activeTab === 'details' && <DetailsTab home={selectedHome} />}
      {selectedHomeId && activeTab === 'photos' && (
        <PhotosTab homeId={selectedHomeId} serverUrl={serverUrl} api={api} />
      )}
      {selectedHomeId && activeTab === 'documents' && (
        <DocumentsTab homeId={selectedHomeId} serverUrl={serverUrl} api={api} />
      )}
      {selectedHomeId && selectedHome && activeTab === 'members' && (
        <MembersTab homeId={selectedHomeId} api={api} currentRole={selectedHome.role} />
      )}
      {selectedHomeId && activeTab === 'floor-plans' && (
        <FloorPlansTab homeId={selectedHomeId} api={api} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyText: { fontSize: 15, color: '#aaa', fontWeight: '500' },
  emptySubtext: { fontSize: 13, color: '#bbb', textAlign: 'center' },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ebebeb',
  },
  pickerBtnText: { flex: 1, fontSize: 14, color: '#1a1a1a', fontWeight: '500' },

  tabBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ebebeb', flexGrow: 0 },
  tabBarContent: { paddingHorizontal: 12, gap: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#2f95dc' },
  tabLabel: { fontSize: 13, color: '#888', fontWeight: '500' },
  tabLabelActive: { color: '#2f95dc' },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  detailRow: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  detailLabel: { width: 130, fontSize: 13, color: '#888', fontWeight: '500' },
  detailValue: { fontSize: 13, color: '#1a1a1a', flexShrink: 1 },

  photoGrid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { position: 'relative' },
  photoDelete: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },

  docRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  docName: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  docMeta: { fontSize: 12, color: '#aaa' },

  badge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  badgeBlue: { backgroundColor: '#dbeafe' },
  badgeGray: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#555' },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  memberAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  memberInitials: { fontSize: 14, fontWeight: '700', color: '#2f95dc' },
  memberName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  memberEmail: { fontSize: 12, color: '#888', marginTop: 1 },

  input: {
    flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, backgroundColor: '#fafafa',
  },
  inviteBtn: {
    backgroundColor: '#2f95dc', borderRadius: 8, paddingHorizontal: 16,
    paddingVertical: 8, alignItems: 'center', justifyContent: 'center', minWidth: 72,
  },
  inviteBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  errorText: { fontSize: 12, color: '#f87171', marginTop: 6 },

  areaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  areaSwatch: { width: 20, height: 20, borderRadius: 4 },
  areaName: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, gap: 4,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  homeOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  homeOptionActive: { backgroundColor: '#f0f8ff' },
  homeOptionText: { fontSize: 15, color: '#1a1a1a' },
});
