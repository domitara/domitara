import { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  ActionIcon,
  Loader,
  Center,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconPaint } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { useLocationPaint, useDeleteLocationPaint } from '../api/queries';
import type { LocationPaint, PaintSurface } from '../api/types';
import { AssignLocationPaintModal } from './AssignLocationPaintModal';

const SURFACE_LABELS: Record<PaintSurface, string> = {
  walls: 'Walls',
  ceiling: 'Ceiling',
  trim: 'Trim',
  doors: 'Doors',
  accent: 'Accent',
};

interface Props {
  locationId: string;
}

export function LocationPaintPanel({ locationId }: Props) {
  const { data: rows = [], isLoading } = useLocationPaint(locationId);
  const deletePaint = useDeleteLocationPaint(locationId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LocationPaint | null>(null);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (row: LocationPaint) => {
    setEditing(row);
    setModalOpen(true);
  };

  const confirmDelete = (row: LocationPaint) =>
    modals.openConfirmModal({
      title: 'Remove paint assignment',
      children: (
        <Text size="sm">
          Remove <strong>{row.paint_name}</strong> from {SURFACE_LABELS[row.surface].toLowerCase()}?
        </Text>
      ),
      labels: { confirm: 'Remove', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deletePaint.mutate(row.id),
    });

  return (
    <Paper withBorder p={16} radius="md">
      <Group justify="space-between" mb={12}>
        <Title order={3} style={{ fontSize: '1.125rem' }}>
          Paint
        </Title>
        <Button size="sm" variant="default" leftSection={<IconPlus size={14} />} onClick={openNew}>
          Assign paint
        </Button>
      </Group>

      {isLoading ? (
        <Center py={16}>
          <Loader size="sm" />
        </Center>
      ) : rows.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <IconPaint size={28} color="var(--dt-gray-5)" />
          <Text size="sm" c="dimmed">
            No paint recorded for this location.
          </Text>
        </div>
      ) : (
        <Stack gap={8}>
          {rows.map((row) => (
            <Group
              key={row.id}
              wrap="nowrap"
              gap={10}
              style={{
                padding: '8px 10px',
                border: '1px solid var(--dt-gray-2)',
                borderRadius: 6,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: row.paint_color,
                  border: '1px solid var(--dt-gray-3)',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500}>
                  {SURFACE_LABELS[row.surface]}
                  {row.surface === 'accent' && row.surface_note ? ` · ${row.surface_note}` : ''}
                </Text>
                <Text size="xs" c="dimmed">
                  {row.paint_name}
                  {[
                    row.paint_brand,
                    row.paint_color_code,
                    row.paint_sheen,
                    row.painted_on ? `painted ${row.painted_on}` : null,
                    row.coats ? `${row.coats} coat${row.coats === 1 ? '' : 's'}` : null,
                  ]
                    .filter(Boolean)
                    .map((s) => ` · ${s}`)
                    .join('')}
                </Text>
                {row.notes && (
                  <Text size="xs" c="dimmed" fs="italic">
                    {row.notes}
                  </Text>
                )}
              </div>
              <ActionIcon variant="subtle" size="md" onClick={() => openEdit(row)}>
                <IconEdit size={15} />
              </ActionIcon>
              <ActionIcon variant="subtle" size="md" color="red" onClick={() => confirmDelete(row)}>
                <IconTrash size={15} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      )}

      <AssignLocationPaintModal
        key={editing?.id ?? 'new'}
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        locationId={locationId}
        assignment={editing ?? undefined}
      />
    </Paper>
  );
}
