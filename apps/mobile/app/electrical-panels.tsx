import { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Alert,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '@/context/auth';
import { createMobileApi, type Home, type ElectricalPanel, type FloorPlanArea } from '@/context/mobileApi';
import { PanelSVG } from '@/components/PanelSVG';
import { BreakerBottomSheet, type BreakerBottomSheetRef } from '@/components/BreakerBottomSheet';
import type { ElectricalBreaker, SlotGeometry } from '@domitara/panel-core';
import { computeSlots } from '@domitara/panel-core';

export default function ElectricalPanelsScreen() {
  const { serverUrl, token } = useAuth();
  const api = createMobileApi(serverUrl, token ?? '');
  const { width } = useWindowDimensions();

  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [panels, setPanels] = useState<ElectricalPanel[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [breakers, setBreakers] = useState<ElectricalBreaker[]>([]);
  const [areas, setAreas] = useState<FloorPlanArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [addPanelVisible, setAddPanelVisible] = useState(false);
  const [newPanelName, setNewPanelName] = useState('');
  const [newPanelAmps, setNewPanelAmps] = useState('200');
  const [newPanelSlots, setNewPanelSlots] = useState('40');
  const [newPanelNote, setNewPanelNote] = useState('');
  const [savingPanel, setSavingPanel] = useState(false);

  const sheetRef = useRef<BreakerBottomSheetRef>(null);

  const selectedHome = homes.find((h) => h.id === selectedHomeId) ?? null;
  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null;

  useEffect(() => {
    void loadHomes();
  }, []);

  async function loadHomes() {
    setLoading(true);
    setError('');
    try {
      const list = await api.listHomes();
      setHomes(list);
      if (list.length === 1) {
        setSelectedHomeId(list[0].id);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedHomeId) return;
    void loadPanelsAndAreas(selectedHomeId);
  }, [selectedHomeId]);

  async function loadPanelsAndAreas(homeId: string) {
    setLoading(true);
    setError('');
    setPanels([]);
    setSelectedPanelId(null);
    setBreakers([]);
    try {
      const [panelList, areaList] = await Promise.all([
        api.listPanels(homeId),
        api.listFloorPlanAreas(homeId),
      ]);
      setPanels(panelList);
      setAreas(areaList);
      if (panelList.length > 0) setSelectedPanelId(panelList[0].id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedPanelId) return;
    void loadBreakers(selectedPanelId);
  }, [selectedPanelId]);

  async function loadBreakers(panelId: string) {
    setLoading(true);
    try {
      const list = await api.listBreakers(panelId);
      setBreakers(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const handleSlotPress = useCallback((slot: SlotGeometry) => {
    sheetRef.current?.open(slot);
  }, []);

  const handleSaved = useCallback(() => {
    if (selectedPanelId) void loadBreakers(selectedPanelId);
  }, [selectedPanelId]);

  async function handleAddPanel() {
    if (!selectedHomeId || !newPanelName.trim()) return;
    setSavingPanel(true);
    try {
      const panel = await api.createPanel(selectedHomeId, {
        name: newPanelName.trim(),
        total_amps: parseInt(newPanelAmps, 10) || 200,
        total_slots: parseInt(newPanelSlots, 10) || 40,
        location_note: newPanelNote.trim() || undefined,
      });
      setPanels((prev) => [...prev, panel]);
      setSelectedPanelId(panel.id);
      setAddPanelVisible(false);
      setNewPanelName('');
      setNewPanelAmps('200');
      setNewPanelSlots('40');
      setNewPanelNote('');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSavingPanel(false);
    }
  }

  async function handleDeletePanel() {
    if (!selectedPanelId) return;
    Alert.alert('Delete panel?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deletePanel(selectedPanelId);
            const remaining = panels.filter((p) => p.id !== selectedPanelId);
            setPanels(remaining);
            setSelectedPanelId(remaining[0]?.id ?? null);
            setBreakers([]);
          } catch (e) {
            Alert.alert('Error', (e as Error).message);
          }
        },
      },
    ]);
  }

  async function handleShare() {
    if (!selectedPanel) return;
    const slots = computeSlots(selectedPanel, breakers);
    const rows = slots
      .filter((s) => s.state !== 'main' && s.state !== 'blank' && s.col !== 'right')
      .map((s) => {
        const slotLabel = s.breaker?.breaker_type === 'double_pole'
          ? `${s.slot}–${s.slot + 2}`
          : `${s.slot}`;
        const label = s.breaker?.label ?? '—';
        const amps = s.breaker?.amps ? `${s.breaker.amps}A` : '—';
        const prot = [s.breaker?.is_gfci ? 'GFCI' : '', s.breaker?.is_afci ? 'AFCI' : '']
          .filter(Boolean).join(', ') || '—';
        return `<tr><td>${slotLabel}</td><td>${label}</td><td>${amps}</td><td>${prot}</td></tr>`;
      });

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: -apple-system, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0; }
  h2 { font-size: 14px; margin: 4px 0 16px; color: #555; }
  p.meta { font-size: 11px; color: #888; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #ccc; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #f9f9f9; }
</style>
</head>
<body>
  <h1>${selectedHome?.name ?? 'Home'}</h1>
  <h2>${selectedPanel.name}${selectedPanel.location_note ? ` — ${selectedPanel.location_note}` : ''}</h2>
  <p class="meta">Printed ${new Date().toLocaleDateString()}</p>
  <table>
    <thead><tr><th>Slot</th><th>Label</th><th>Amps</th><th>Protection</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>
</body>
</html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share panel directory' });
      } else {
        await Print.printAsync({ html });
      }
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  }

  const svgWidth = width - 32;

  return (
    <View style={styles.root}>
      {/* Home picker — only shown when multiple homes */}
      {homes.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.homePicker} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {homes.map((h) => (
            <TouchableOpacity
              key={h.id}
              style={[styles.homeChip, selectedHomeId === h.id && styles.homeChipActive]}
              onPress={() => setSelectedHomeId(h.id)}
            >
              <Text style={[styles.homeChipText, selectedHomeId === h.id && styles.homeChipTextActive]}>
                {h.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading && !selectedPanel && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2f95dc" />
        </View>
      )}

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!loading && selectedHomeId && panels.length === 0 && !error && (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No panels yet</Text>
          <Text style={styles.emptySub}>Add your main electrical panel to get started.</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddPanelVisible(true)}>
            <Text style={styles.addBtnText}>Add Panel</Text>
          </TouchableOpacity>
        </View>
      )}

      {!selectedHomeId && !loading && homes.length === 0 && !error && (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No homes found</Text>
          <Text style={styles.emptySub}>Add a home on the web app first.</Text>
        </View>
      )}

      {selectedPanel && (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Panel selector + actions */}
          <View style={styles.panelHeader}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 8 }}>
              {panels.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.panelChip, selectedPanelId === p.id && styles.panelChipActive]}
                  onPress={() => setSelectedPanelId(p.id)}
                >
                  <Text style={[styles.panelChipText, selectedPanelId === p.id && styles.panelChipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setAddPanelVisible(true)}>
              <Text style={styles.iconBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Panel meta */}
          <View style={styles.panelMeta}>
            <Text style={styles.panelMetaText}>
              {selectedPanel.total_amps}A · {selectedPanel.total_slots} slots
              {selectedPanel.location_note ? ` · ${selectedPanel.location_note}` : ''}
            </Text>
            <View style={styles.panelActions}>
              <TouchableOpacity style={styles.shareBtn} onPress={() => void handleShare()}>
                <Text style={styles.shareBtnText}>Share directory</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void handleDeletePanel()}>
                <Text style={styles.deletePanelText}>Delete panel</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#2f95dc" />
          ) : (
            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
              <PanelSVG
                panel={selectedPanel}
                breakers={breakers}
                areas={areas}
                onSlotPress={handleSlotPress}
                width={svgWidth}
              />
            </View>
          )}
        </ScrollView>
      )}

      {/* Add panel modal */}
      <Modal visible={addPanelVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddPanelVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add Panel</Text>

          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput style={styles.input} value={newPanelName} onChangeText={setNewPanelName} placeholder="Main Panel" />

          <Text style={styles.fieldLabel}>Total Amps</Text>
          <TextInput style={styles.input} value={newPanelAmps} onChangeText={setNewPanelAmps} keyboardType="number-pad" />

          <Text style={styles.fieldLabel}>Total Slots</Text>
          <TextInput style={styles.input} value={newPanelSlots} onChangeText={setNewPanelSlots} keyboardType="number-pad" />

          <Text style={styles.fieldLabel}>Location note</Text>
          <TextInput style={styles.input} value={newPanelNote} onChangeText={setNewPanelNote} placeholder="Garage, basement…" />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddPanelVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, (!newPanelName.trim() || savingPanel) && { opacity: 0.5 }]}
              onPress={() => void handleAddPanel()}
              disabled={!newPanelName.trim() || savingPanel}
            >
              <Text style={styles.saveBtnText}>{savingPanel ? 'Saving…' : 'Add Panel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Breaker bottom sheet */}
      {selectedPanelId && (
        <BreakerBottomSheet
          ref={sheetRef}
          panelId={selectedPanelId}
          areas={areas}
          api={api}
          onSaved={handleSaved}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center' },

  homePicker: { paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  homeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ddd' },
  homeChipActive: { backgroundColor: '#2f95dc', borderColor: '#2f95dc' },
  homeChipText: { fontSize: 14, color: '#444' },
  homeChipTextActive: { color: '#fff', fontWeight: '600' },

  panelHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', gap: 8 },
  panelChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ddd' },
  panelChipActive: { backgroundColor: '#1c1c1e', borderColor: '#1c1c1e' },
  panelChipText: { fontSize: 14, color: '#444' },
  panelChipTextActive: { color: '#fff', fontWeight: '600' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2f95dc', alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: '#fff', fontSize: 22, lineHeight: 24, fontWeight: '400' },

  panelMeta: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', gap: 8 },
  panelMetaText: { fontSize: 13, color: '#666' },
  panelActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  shareBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#2f95dc' },
  shareBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  deletePanelText: { color: '#dc2626', fontSize: 13 },

  addBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, backgroundColor: '#2f95dc', marginTop: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  modalContainer: { flex: 1, padding: 24, paddingTop: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 15, marginBottom: 16, backgroundColor: '#fafafa' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  cancelBtnText: { color: '#555', fontWeight: '500' },
  saveBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2f95dc' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
