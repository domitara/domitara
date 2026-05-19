import { useState, useEffect } from 'react';
import {
  Drawer,
  Stack,
  TextInput,
  Select,
  Checkbox,
  Textarea,
  Button,
  Group,
  Text,
  ActionIcon,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { SlotGeometry } from '@domitara/panel-core';
import type { FloorPlanArea, UpdateBreakerInput, CreateBreakerInput } from '../api/types';
import { useCreateBreaker, useUpdateBreaker, useDeleteBreaker } from '../api/queries';

const AMPS_OPTIONS = [15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 125, 150, 200].map(
  (a) => ({ value: String(a), label: `${a}A` })
);

const TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'double_pole', label: 'Double-pole (240V)' },
  { value: 'tandem', label: 'Tandem' },
  { value: 'blank', label: 'Blank / filler' },
];

interface BreakerDrawerProps {
  panelId: string;
  slot: SlotGeometry | null;
  areas: FloorPlanArea[];
  onClose: () => void;
}

export function BreakerDrawer({ panelId, slot, areas, onClose }: BreakerDrawerProps) {
  const isEditing = !!slot?.breaker;
  const opened = slot !== null;

  const [label, setLabel] = useState('');
  const [amps, setAmps] = useState<string | null>(null);
  const [breakerType, setBreakerType] = useState<string>('standard');
  const [isGfci, setIsGfci] = useState(false);
  const [isAfci, setIsAfci] = useState(false);
  const [notes, setNotes] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const createBreaker = useCreateBreaker(panelId);
  const updateBreaker = useUpdateBreaker(panelId);
  const deleteBreaker = useDeleteBreaker(panelId);

  // Populate form when slot changes
  useEffect(() => {
    if (!slot) return;
    const b = slot.breaker;
    setLabel(b?.label ?? '');
    setAmps(b?.amps ? String(b.amps) : null);
    setBreakerType(b?.breaker_type ?? (slot.state === 'blank' ? 'blank' : 'standard'));
    setIsGfci(b?.is_gfci ?? false);
    setIsAfci(b?.is_afci ?? false);
    setNotes(b?.notes ?? '');
    setAreaId(b?.floor_plan_area_id ?? null);
    setError('');
    setConfirmDelete(false);
  }, [slot]);

  // Client-side double-pole validation
  const doublePoleError =
    breakerType === 'double_pole' && slot && slot.slot % 2 === 0
      ? 'Double-pole breakers must start on an odd slot'
      : '';

  const handleSave = async () => {
    setError('');
    if (doublePoleError) {
      setError(doublePoleError);
      return;
    }
    try {
      if (isEditing && slot?.breaker) {
        const body: UpdateBreakerInput = {
          label: label || undefined,
          amps: amps ? Number(amps) : undefined,
          breaker_type: breakerType as UpdateBreakerInput['breaker_type'],
          is_gfci: isGfci,
          is_afci: isAfci,
          notes: notes || undefined,
          floor_plan_area_id: areaId,
        };
        await updateBreaker.mutateAsync({ id: slot.breaker.id, body });
      } else if (slot) {
        const body: CreateBreakerInput = {
          slot: slot.slot,
          label: label || undefined,
          amps: amps ? Number(amps) : undefined,
          breaker_type: breakerType as CreateBreakerInput['breaker_type'],
          is_gfci: isGfci,
          is_afci: isAfci,
          notes: notes || undefined,
          floor_plan_area_id: areaId ?? undefined,
        };
        await createBreaker.mutateAsync(body);
      }
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!slot?.breaker) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await deleteBreaker.mutateAsync(slot.breaker.id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const areaOptions = [
    { value: '', label: '— None —' },
    ...areas.map((a) => ({ value: a.id, label: a.name })),
  ];

  const isPending = createBreaker.isPending || updateBreaker.isPending || deleteBreaker.isPending;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={isEditing ? `Edit slot ${slot?.slot ?? ''}` : `Add breaker — slot ${slot?.slot ?? ''}`}
      position="right"
      size="md"
    >
      <Stack gap="md">
        {doublePoleError && (
          <Text c="orange" size="sm">
            {doublePoleError}
          </Text>
        )}

        <TextInput
          label="Label"
          placeholder="Kitchen outlets"
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          maxLength={40}
          description={`${label.length}/40`}
        />

        <Group grow>
          <Select
            label="Type"
            data={TYPE_OPTIONS}
            value={breakerType}
            onChange={(v) => setBreakerType(v ?? 'standard')}
          />
          <Select
            label="Amperage"
            data={AMPS_OPTIONS}
            value={amps}
            onChange={setAmps}
            clearable
            placeholder="—"
          />
        </Group>

        <Group>
          <Checkbox
            label="GFCI protected"
            checked={isGfci}
            onChange={(e) => setIsGfci(e.currentTarget.checked)}
          />
          <Checkbox
            label="AFCI protected"
            checked={isAfci}
            onChange={(e) => setIsAfci(e.currentTarget.checked)}
          />
        </Group>

        <Select
          label="Area / zone"
          data={areaOptions}
          value={areaId ?? ''}
          onChange={(v) => setAreaId(v || null)}
          clearable
          placeholder="— None —"
        />

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          rows={2}
        />

        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}

        <Group justify="space-between" mt="sm">
          {isEditing ? (
            <ActionIcon
              color="red"
              variant={confirmDelete ? 'filled' : 'subtle'}
              size="lg"
              onClick={() => void handleDelete()}
              loading={deleteBreaker.isPending}
              title={confirmDelete ? 'Click again to confirm deletion' : 'Delete breaker'}
            >
              <IconTrash size={16} />
            </ActionIcon>
          ) : (
            <div />
          )}

          <Group>
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} loading={isPending}>
              {isEditing ? 'Save changes' : 'Add breaker'}
            </Button>
          </Group>
        </Group>

        {confirmDelete && (
          <Text c="red" size="sm" ta="center">
            Click the trash icon again to confirm deletion.
          </Text>
        )}
      </Stack>
    </Drawer>
  );
}
