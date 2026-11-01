import { useState } from 'react';
import { ActionIcon, Button, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import {
  useLocations,
  usePaintColorAssignments,
  useAssignPaintToLocation,
  useRemovePaintAssignment,
} from '../api/queries';
import type { PaintSurface } from '../api/types';

const SURFACES: { value: PaintSurface; label: string }[] = [
  { value: 'walls', label: 'Walls' },
  { value: 'ceiling', label: 'Ceiling' },
  { value: 'trim', label: 'Trim' },
  { value: 'doors', label: 'Doors' },
  { value: 'accent', label: 'Accent' },
];

export function surfaceLabel(surface: PaintSurface, note: string | null): string {
  const label = SURFACES.find((s) => s.value === surface)?.label ?? surface;
  return surface === 'accent' && note ? `${label} (${note})` : label;
}

/**
 * Lists the location surfaces a paint color is used on and lets you assign it to
 * more (or remove existing ones). Changes apply immediately, independent of the
 * surrounding form's Save.
 */
export function PaintColorSurfaces({ paintColorId }: { paintColorId: string }) {
  const { data: assignments = [] } = usePaintColorAssignments(paintColorId);
  const { data: locations = [] } = useLocations();
  const assign = useAssignPaintToLocation();
  const remove = useRemovePaintAssignment();

  const [locationId, setLocationId] = useState<string | null>(null);
  const [surface, setSurface] = useState<PaintSurface>('walls');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleAssign = async () => {
    if (!locationId) return;
    setError('');
    try {
      await assign.mutateAsync({
        locationId,
        body: {
          paint_color_id: paintColorId,
          surface,
          surface_note: surface === 'accent' && note.trim() ? note.trim() : undefined,
        },
      });
      setLocationId(null);
      setNote('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to assign. Please try again.');
    }
  };

  return (
    <Stack gap={8}>
      <Text size="sm" fw={500}>
        Location surfaces
      </Text>
      {assignments.length === 0 ? (
        <Text size="sm" c="dimmed">
          Not assigned to any location yet.
        </Text>
      ) : (
        assignments.map((a) => (
          <Group key={a.id} justify="space-between" wrap="nowrap">
            <Text size="sm">
              {a.location_name} · {surfaceLabel(a.surface, a.surface_note)}
            </Text>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              aria-label="Remove assignment"
              loading={remove.isPending && remove.variables === a.id}
              onClick={() => remove.mutate(a.id)}
            >
              <IconX size={14} />
            </ActionIcon>
          </Group>
        ))
      )}
      <Group grow align="flex-end" gap={8}>
        <Select
          label="Assign to location"
          placeholder="Pick a location"
          data={locations.map((l) => ({ value: l.id, label: l.name }))}
          value={locationId}
          onChange={setLocationId}
          searchable
          nothingFoundMessage="No locations"
        />
        <Select
          label="Surface"
          data={SURFACES}
          value={surface}
          onChange={(v) => setSurface((v as PaintSurface) ?? 'walls')}
          allowDeselect={false}
        />
      </Group>
      {surface === 'accent' && (
        <TextInput
          placeholder="Accent note, e.g. east wall"
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />
      )}
      {error && (
        <Text size="sm" c="red">
          {error}
        </Text>
      )}
      <Button
        variant="light"
        size="xs"
        onClick={handleAssign}
        loading={assign.isPending}
        disabled={!locationId}
      >
        Assign
      </Button>
    </Stack>
  );
}
