import { useState } from 'react';
import {
  Modal,
  Select,
  TextInput,
  Textarea,
  NumberInput,
  Button,
  Group,
  Stack,
  Text,
  Anchor,
} from '@mantine/core';
import { usePaintColors, useCreateLocationPaint, useUpdateLocationPaint } from '../api/queries';
import type { LocationPaint, PaintSurface } from '../api/types';
import { NewPaintColorModal } from './NewPaintColorModal';

const SURFACES: { value: PaintSurface; label: string }[] = [
  { value: 'walls', label: 'Walls' },
  { value: 'ceiling', label: 'Ceiling' },
  { value: 'trim', label: 'Trim' },
  { value: 'doors', label: 'Doors' },
  { value: 'accent', label: 'Accent' },
];

interface Props {
  opened: boolean;
  onClose: () => void;
  locationId: string;
  assignment?: LocationPaint;
}

export function AssignLocationPaintModal({ opened, onClose, locationId, assignment }: Props) {
  const { data: paintColors = [] } = usePaintColors();
  const create = useCreateLocationPaint(locationId);
  const update = useUpdateLocationPaint(locationId);
  const isEdit = !!assignment;

  const [paintColorId, setPaintColorId] = useState<string | null>(
    assignment?.paint_color_id ?? null
  );
  const [surface, setSurface] = useState<PaintSurface>(assignment?.surface ?? 'walls');
  const [surfaceNote, setSurfaceNote] = useState(assignment?.surface_note ?? '');
  const [paintedOn, setPaintedOn] = useState(assignment?.painted_on ?? '');
  const [coats, setCoats] = useState<number | string>(assignment?.coats ?? '');
  const [notes, setNotes] = useState(assignment?.notes ?? '');
  const [error, setError] = useState('');
  const [newColorOpen, setNewColorOpen] = useState(false);

  const mutation = isEdit ? update : create;

  const reset = () => {
    setPaintColorId(assignment?.paint_color_id ?? null);
    setSurface(assignment?.surface ?? 'walls');
    setSurfaceNote(assignment?.surface_note ?? '');
    setPaintedOn(assignment?.painted_on ?? '');
    setCoats(assignment?.coats ?? '');
    setNotes(assignment?.notes ?? '');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!paintColorId) {
      setError('Pick a paint color.');
      return;
    }
    setError('');
    const body = {
      paint_color_id: paintColorId,
      surface,
      surface_note: surface === 'accent' && surfaceNote.trim() ? surfaceNote.trim() : undefined,
      painted_on: paintedOn || undefined,
      coats: typeof coats === 'number' ? coats : undefined,
      notes: notes.trim() || undefined,
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: assignment.id, body });
      } else {
        await create.mutateAsync(body);
      }
      handleClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save. Please try again.');
    }
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        title={isEdit ? 'Edit paint assignment' : 'Assign paint'}
        size="sm"
      >
        <Stack gap={12}>
          <div>
            <Select
              label="Paint color"
              placeholder="Pick a color"
              data={paintColors.map((c) => ({ value: c.id, label: c.name }))}
              value={paintColorId}
              onChange={setPaintColorId}
              searchable
              nothingFoundMessage="No paint colors yet"
            />
            <Anchor
              component="button"
              type="button"
              size="xs"
              mt={4}
              onClick={() => setNewColorOpen(true)}
            >
              + Create a new paint color
            </Anchor>
          </div>
          <Select
            label="Surface"
            data={SURFACES}
            value={surface}
            onChange={(v) => setSurface((v as PaintSurface) ?? 'walls')}
            allowDeselect={false}
          />
          {surface === 'accent' && (
            <TextInput
              label="Accent note"
              placeholder="e.g. east wall"
              value={surfaceNote}
              onChange={(e) => setSurfaceNote(e.currentTarget.value)}
            />
          )}
          <Group grow>
            <TextInput
              label="Painted on"
              type="date"
              value={paintedOn}
              onChange={(e) => setPaintedOn(e.currentTarget.value)}
            />
            <NumberInput
              label="Coats"
              placeholder="Optional"
              min={1}
              value={coats}
              onChange={setCoats}
            />
          </Group>
          <Textarea
            label="Notes"
            placeholder="Optional"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            rows={2}
          />
          {error && (
            <Text size="sm" c="red">
              {error}
            </Text>
          )}
          <Group justify="flex-end" mt={4}>
            <Button variant="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={mutation.isPending} disabled={!paintColorId}>
              {isEdit ? 'Save' : 'Assign'}
            </Button>
          </Group>
        </Stack>
      </Modal>
      <NewPaintColorModal opened={newColorOpen} onClose={() => setNewColorOpen(false)} />
    </>
  );
}
