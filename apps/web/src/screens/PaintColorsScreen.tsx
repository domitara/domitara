import { useState, useMemo } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  ActionIcon,
  TextInput,
  Loader,
  Center,
  Menu,
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconPaint,
  IconEdit,
  IconDotsVertical,
  IconTrash,
} from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { usePaintColors, useDeletePaintColor } from '../api/queries';
import { NewPaintColorModal } from '../components/NewPaintColorModal';
import type { PaintColor } from '../api/types';

export function PaintColorsScreen() {
  const { data: colors = [], isLoading } = usePaintColors();
  const deleteColor = useDeletePaintColor();
  const [active, setActive] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaintColor | null>(null);

  const filtered = useMemo(
    () =>
      colors.filter((c) =>
        [c.name, c.brand, c.color_code]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [colors, search]
  );

  const activeColor = active ? colors.find((c) => c.id === active) : null;

  const confirmDelete = (color: PaintColor) =>
    modals.openConfirmModal({
      title: 'Delete paint color',
      children: (
        <Text size="sm">
          Delete <strong>{color.name}</strong>? This cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        deleteColor.mutate(color.id, {
          onSuccess: () => setActive(null),
          onError: (e) =>
            modals.open({
              title: "Can't delete this paint color",
              children: <Text size="sm">{e instanceof Error ? e.message : 'Delete failed.'}</Text>,
            }),
        }),
    });

  if (isLoading)
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );

  const detailLine = (label: string, value: string | null) =>
    value ? (
      <Text size="sm">
        <Text span c="dimmed">
          {label}:{' '}
        </Text>
        {value}
      </Text>
    ) : null;

  return (
    <Stack gap={14}>
      <Group justify="space-between">
        <Title order={1} style={{ fontSize: '1.75rem' }}>
          Paint colors
        </Title>
        <Button
          size="sm"
          leftSection={<IconPlus size={14} />}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          New paint color
        </Button>
      </Group>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <Paper withBorder p={8} radius="md">
          <TextInput
            placeholder="Search paint colors…"
            leftSection={<IconSearch size={16} />}
            size="sm"
            mb={6}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          {filtered.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py={24}>
              {search ? 'No paint colors match.' : 'No paint colors yet.'}
            </Text>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => setActive(c.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: active === c.id ? 'var(--dt-blue-0)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (active !== c.id) e.currentTarget.style.background = 'var(--dt-gray-1)';
                }}
                onMouseLeave={(e) => {
                  if (active !== c.id) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background: c.color,
                    border: '1px solid var(--dt-gray-3)',
                    flexShrink: 0,
                  }}
                />
                <Text
                  size="sm"
                  style={{
                    flex: 1,
                    color: active === c.id ? 'var(--dt-blue-8)' : 'var(--dt-fg-1)',
                    fontWeight: active === c.id ? 500 : 400,
                  }}
                >
                  {c.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {c.location_count}
                </Text>
              </div>
            ))
          )}
        </Paper>

        <Stack gap={14}>
          {activeColor ? (
            <Paper withBorder p={16} radius="md">
              <Group justify="space-between" align="flex-start">
                <Group gap={12} align="flex-start">
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 6,
                      background: activeColor.color,
                      border: '1px solid var(--dt-gray-3)',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <Title order={2} style={{ fontSize: '1.375rem' }}>
                      {activeColor.name}
                    </Title>
                    <Text size="sm" c="dimmed" mt={2}>
                      {activeColor.location_count} location surface
                      {activeColor.location_count === 1 ? '' : 's'}
                    </Text>
                  </div>
                </Group>
                <Group gap={6}>
                  <ActionIcon
                    variant="default"
                    size="lg"
                    onClick={() => {
                      setEditing(activeColor);
                      setModalOpen(true);
                    }}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <Menu shadow="md" width={180} position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="default" size="lg">
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => confirmDelete(activeColor)}
                      >
                        Delete paint color
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>

              <Stack gap={6} mt={14}>
                {detailLine('Swatch', activeColor.color)}
                {detailLine('Brand', activeColor.brand)}
                {detailLine('Color code', activeColor.color_code)}
                {detailLine('Sheen', activeColor.sheen)}
                {detailLine('Notes', activeColor.notes)}
              </Stack>
            </Paper>
          ) : (
            <Paper
              withBorder
              p={32}
              radius="md"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Group gap={8}>
                <IconPaint size={20} color="var(--dt-gray-5)" />
                <Text size="sm" c="dimmed">
                  Select a paint color to view details
                </Text>
              </Group>
            </Paper>
          )}
        </Stack>
      </div>

      <NewPaintColorModal
        key={editing?.id ?? 'new'}
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        paintColor={editing ?? undefined}
      />
    </Stack>
  );
}
