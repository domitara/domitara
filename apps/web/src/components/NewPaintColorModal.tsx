import { useState } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Autocomplete,
  ColorInput,
  Button,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { useCreatePaintColor, useUpdatePaintColor } from '../api/queries';
import type { PaintColor } from '../api/types';

// Neutral / earth-tone starting points — most interior paint lands in this range.
const PAINT_SWATCHES = [
  '#e7e5e4',
  '#d6d3cd',
  '#c9c6bd',
  '#b7b0a3',
  '#a8a29e',
  '#8d8478',
  '#6b7280',
  '#4b5563',
  '#f5f5f4',
  '#1f2937',
];

const SHEENS = ['Flat / Matte', 'Eggshell', 'Satin', 'Semi-gloss', 'Gloss', 'High-gloss'];

interface Props {
  opened: boolean;
  onClose: () => void;
  paintColor?: PaintColor;
}

export function NewPaintColorModal({ opened, onClose, paintColor }: Props) {
  const create = useCreatePaintColor();
  const update = useUpdatePaintColor();
  const isEdit = !!paintColor;

  const [name, setName] = useState(paintColor?.name ?? '');
  const [color, setColor] = useState(paintColor?.color ?? PAINT_SWATCHES[0]);
  const [brand, setBrand] = useState(paintColor?.brand ?? '');
  const [colorCode, setColorCode] = useState(paintColor?.color_code ?? '');
  const [sheen, setSheen] = useState(paintColor?.sheen ?? '');
  const [notes, setNotes] = useState(paintColor?.notes ?? '');
  const [error, setError] = useState('');

  const mutation = isEdit ? update : create;

  const handleClose = () => {
    setName(paintColor?.name ?? '');
    setColor(paintColor?.color ?? PAINT_SWATCHES[0]);
    setBrand(paintColor?.brand ?? '');
    setColorCode(paintColor?.color_code ?? '');
    setSheen(paintColor?.sheen ?? '');
    setNotes(paintColor?.notes ?? '');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setError('');
    const body = {
      name: name.trim(),
      color,
      brand: brand.trim() || undefined,
      color_code: colorCode.trim() || undefined,
      sheen: sheen.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: paintColor.id, body });
      } else {
        await create.mutateAsync(body);
      }
      handleClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save paint color. Please try again.');
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={isEdit ? 'Edit paint color' : 'New paint color'}
      size="sm"
    >
      <Stack gap={12}>
        <TextInput
          label="Name"
          placeholder="e.g. Repose Gray"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        <ColorInput
          label="Swatch color"
          value={color}
          onChange={setColor}
          swatches={PAINT_SWATCHES}
          swatchesPerRow={10}
        />
        <Group grow>
          <TextInput
            label="Brand"
            placeholder="e.g. Sherwin-Williams"
            value={brand}
            onChange={(e) => setBrand(e.currentTarget.value)}
          />
          <TextInput
            label="Color code"
            placeholder="e.g. SW 7015"
            value={colorCode}
            onChange={(e) => setColorCode(e.currentTarget.value)}
          />
        </Group>
        <Autocomplete
          label="Sheen / finish"
          placeholder="e.g. Eggshell"
          data={SHEENS}
          value={sheen}
          onChange={setSheen}
        />
        <Textarea
          label="Notes"
          placeholder="Optional — where it's used, when bought, etc."
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
          <Button onClick={handleSubmit} loading={mutation.isPending} disabled={!name.trim()}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
