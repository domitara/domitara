import { forwardRef, useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { SlotGeometry } from '@domitara/panel-core';
import type { FloorPlanArea, MobileApi } from '../context/mobileApi';

const AMPS = [15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 125, 150, 200];
const TYPES = ['standard', 'double_pole', 'tandem', 'blank'] as const;

interface BreakerBottomSheetProps {
  panelId: string;
  areas: FloorPlanArea[];
  api: MobileApi;
  onSaved: () => void;
}

export type BreakerBottomSheetRef = {
  open: (slot: SlotGeometry) => void;
  close: () => void;
};

export const BreakerBottomSheet = forwardRef<BreakerBottomSheetRef, BreakerBottomSheetProps>(
  ({ panelId, areas, api, onSaved }, ref) => {
    const sheetRef = ref as React.RefObject<BottomSheet>;
    const [slot, setSlot] = useState<SlotGeometry | null>(null);
    const [label, setLabel] = useState('');
    const [amps, setAmps] = useState<number | null>(null);
    const [type, setType] = useState<string>('standard');
    const [isGfci, setIsGfci] = useState(false);
    const [isAfci, setIsAfci] = useState(false);
    const [notes, setNotes] = useState('');
    const [areaId, setAreaId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const openSheet = useCallback((s: SlotGeometry) => {
      setSlot(s);
      setLabel(s.breaker?.label ?? '');
      setAmps(s.breaker?.amps ?? null);
      setType(s.breaker?.breaker_type ?? 'standard');
      setIsGfci(s.breaker?.is_gfci ?? false);
      setIsAfci(s.breaker?.is_afci ?? false);
      setNotes(s.breaker?.notes ?? '');
      setAreaId(s.breaker?.floor_plan_area_id ?? null);
      setError('');
      (sheetRef as React.RefObject<BottomSheet>).current?.expand();
    }, [sheetRef]);

    const closeSheet = useCallback(() => {
      (sheetRef as React.RefObject<BottomSheet>).current?.close();
    }, [sheetRef]);

    useEffect(() => {
      if (ref && typeof ref === 'object') {
        (ref as React.MutableRefObject<BreakerBottomSheetRef>).current = {
          open: openSheet,
          close: closeSheet,
        };
      }
    }, [ref, openSheet, closeSheet]);

    const handleSave = async () => {
      if (!slot) return;
      setError('');
      setSaving(true);
      try {
        if (slot.breaker) {
          await api.updateBreaker(slot.breaker.id, {
            label: label || undefined,
            amps: amps ?? undefined,
            breaker_type: type,
            is_gfci: isGfci,
            is_afci: isAfci,
            notes: notes || undefined,
            floor_plan_area_id: areaId,
          });
        } else {
          await api.createBreaker(panelId, {
            slot: slot.slot,
            label: label || undefined,
            amps: amps ?? undefined,
            breaker_type: type,
            is_gfci: isGfci,
            is_afci: isAfci,
            notes: notes || undefined,
            floor_plan_area_id: areaId ?? undefined,
          });
        }
        onSaved();
        closeSheet();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSaving(false);
      }
    };

    const handleDelete = async () => {
      if (!slot?.breaker) return;
      setSaving(true);
      try {
        await api.deleteBreaker(slot.breaker.id);
        onSaved();
        closeSheet();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSaving(false);
      }
    };

    return (
      <BottomSheet
        ref={sheetRef as React.RefObject<BottomSheet>}
        index={-1}
        snapPoints={['60%', '90%']}
        enablePanDownToClose
      >
        <BottomSheetScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>
            {slot?.breaker ? `Edit slot ${slot.slot}` : `Add breaker — slot ${slot?.slot ?? ''}`}
          </Text>

          <Text style={styles.label}>Label</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Kitchen outlets"
            maxLength={40}
          />

          <Text style={styles.label}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, type === t && styles.chipActive]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                    {t === 'double_pole' ? '240V' : t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.label}>Amps</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {AMPS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.chip, amps === a && styles.chipActive]}
                  onPress={() => setAmps(amps === a ? null : a)}
                >
                  <Text style={[styles.chipText, amps === a && styles.chipTextActive]}>
                    {a}A
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.row}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>GFCI</Text>
              <Switch value={isGfci} onValueChange={setIsGfci} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.label}>AFCI</Text>
              <Switch value={isAfci} onValueChange={setIsAfci} />
            </View>
          </View>

          {areas.length > 0 && (
            <>
              <Text style={styles.label}>Area / zone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.chip, !areaId && styles.chipActive]}
                    onPress={() => setAreaId(null)}
                  >
                    <Text style={[styles.chipText, !areaId && styles.chipTextActive]}>None</Text>
                  </TouchableOpacity>
                  {areas.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.chip, areaId === a.id && { ...styles.chipActive, backgroundColor: a.color }]}
                      onPress={() => setAreaId(a.id === areaId ? null : a.id)}
                    >
                      <Text style={[styles.chipText, areaId === a.id && styles.chipTextActive]}>
                        {a.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, { height: 64 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            {slot?.breaker && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => void handleDelete()}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={() => void handleSave()}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : slot?.breaker ? 'Save' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);

BreakerBottomSheet.displayName = 'BreakerBottomSheet';

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 16, color: '#1a1a1a' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 10, fontSize: 15, marginBottom: 12, backgroundColor: '#fafafa',
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f5f5f5',
  },
  chipActive: { backgroundColor: '#2f95dc', borderColor: '#2f95dc' },
  chipText: { fontSize: 13, color: '#333' },
  chipTextActive: { color: '#fff' },
  row: { flexDirection: 'row', gap: 24, marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  error: { color: 'red', fontSize: 13, marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  deleteBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: '#dc2626',
  },
  deleteBtnText: { color: '#dc2626', fontWeight: '600' },
  saveBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 8, backgroundColor: '#2f95dc',
  },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
