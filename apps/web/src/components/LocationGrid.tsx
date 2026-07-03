import { useState } from 'react';
import { Paper, Text, TextInput, ActionIcon, Group } from '@mantine/core';
import { IconPlus, IconBox } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useItems, useCreateItem } from '../api/queries';
import type { Location } from '../api/types';

interface Props {
  location: Location;
  onItemClick?: (itemId: string) => void;
}

export function LocationGrid({ location, onItemClick }: Props) {
  const navigate = useNavigate();
  const { data: items = [] } = useItems({ locationId: location.id, includeQuick: true });
  const createItem = useCreateItem();
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [quickName, setQuickName] = useState('');

  const rows = location.grid_rows ?? 0;
  const cols = location.grid_cols ?? 0;

  if (!rows || !cols) {
    return (
      <Text size="sm" c="dimmed">
        This container doesn't have a grid defined yet. Edit it to add rows and columns.
      </Text>
    );
  }

  const cellItems = (r: number, c: number) =>
    items.filter((it) => it.grid_row === r && it.grid_col === c);

  async function handleQuickAdd(r: number, c: number) {
    if (!quickName.trim()) return;
    await createItem.mutateAsync({
      name: quickName.trim(),
      location_id: location.id,
      grid_row: r,
      grid_col: c,
      tier: 'quick',
    });
    setQuickName('');
    setActiveCell(null);
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(130px, 1fr))`,
        gap: 8,
      }}
    >
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const cellKey = `${r},${c}`;
          const cellIts = cellItems(r, c);
          const isActive = activeCell === cellKey;
          return (
            <Paper
              key={cellKey}
              withBorder
              p={8}
              radius="sm"
              style={{
                minHeight: 96,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                background: 'var(--dt-gray-0)',
              }}
            >
              <Text size="xs" c="dimmed">
                Row {r + 1}, Col {c + 1}
              </Text>
              {cellIts.map((it) => (
                <Text
                  key={it.id}
                  size="sm"
                  fw={500}
                  lineClamp={1}
                  style={{ cursor: onItemClick ? 'pointer' : undefined }}
                  onClick={() => onItemClick?.(it.id)}
                >
                  {it.name}
                  {it.tier === 'quick' && (
                    <Text component="span" size="xs" c="dimmed">
                      {' '}
                      · quick
                    </Text>
                  )}
                </Text>
              ))}
              <div style={{ marginTop: 'auto' }}>
                {isActive ? (
                  <Group gap={4} wrap="nowrap">
                    <TextInput
                      size="xs"
                      placeholder="Item name"
                      value={quickName}
                      autoFocus
                      onChange={(e) => setQuickName(e.currentTarget.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd(r, c)}
                      onBlur={() => {
                        if (!quickName.trim()) setActiveCell(null);
                      }}
                      style={{ flex: 1 }}
                    />
                    <ActionIcon
                      size="sm"
                      onClick={() => handleQuickAdd(r, c)}
                      loading={createItem.isPending}
                    >
                      <IconPlus size={12} />
                    </ActionIcon>
                  </Group>
                ) : (
                  <Group gap={4}>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      title="Quick add"
                      onClick={() => {
                        setActiveCell(cellKey);
                        setQuickName('');
                      }}
                    >
                      <IconPlus size={12} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      title="Add with full details"
                      onClick={() => navigate({ to: '/items/new' })}
                    >
                      <IconBox size={12} />
                    </ActionIcon>
                  </Group>
                )}
              </div>
            </Paper>
          );
        })
      )}
    </div>
  );
}
