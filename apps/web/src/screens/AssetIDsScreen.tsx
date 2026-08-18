import { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Checkbox,
  Badge,
  Loader,
  Center,
  Select,
  Tooltip,
  Modal,
} from '@mantine/core';
import { IconPrinter, IconQrcode, IconRefresh, IconSearch } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useItems, useLocations, useGenerateMissingAssetIds } from '../api/queries';
import { ItemLabelsPrintView } from '../components/ItemLabelsPrintView';
import type { Item } from '../api/types';

function QrPlaceholder({ value }: { value: string | null }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 4,
        flexShrink: 0,
        background: value ? 'var(--dt-gray-2)' : 'var(--dt-gray-1)',
        border: '1px solid var(--dt-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: value ? 'var(--dt-fg-2)' : 'var(--dt-fg-4)',
      }}
    >
      <IconQrcode size={20} />
    </div>
  );
}

export function AssetIDsScreen() {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useItems();
  const { data: locations = [] } = useLocations();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'with-id' | 'without-id'>('all');
  const [printOpen, setPrintOpen] = useState(false);
  const generateMissing = useGenerateMissingAssetIds();

  const filtered = items.filter((item) => {
    if (filter === 'with-id') return item.asset_id !== null;
    if (filter === 'without-id') return item.asset_id === null;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id));
  const someSelected = filtered.some((i) => selected.has(i.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const s = new Set(prev);
        filtered.forEach((i) => s.delete(i.id));
        return s;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...filtered.map((i) => i.id)]));
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
      } else {
        s.add(id);
      }
      return s;
    });
  };

  const selectedCount = filtered.filter((i) => selected.has(i.id)).length;
  const withoutId = items.filter((i) => i.asset_id === null).length;
  const printItems = filtered.filter((i) => selected.has(i.id));
  const getLocationName = (item: Item) =>
    locations.find((l) => l.id === item.location_id)?.name ?? null;

  if (isLoading)
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Group justify="space-between">
        <div>
          <Title order={1} style={{ fontSize: '1.75rem' }}>
            Asset IDs
          </Title>
          {withoutId > 0 && (
            <Text size="xs" c="dimmed" mt={2}>
              {withoutId} item{withoutId !== 1 ? 's' : ''} without an asset ID
            </Text>
          )}
        </div>
        <Group gap={8}>
          {withoutId > 0 && (
            <Tooltip label="Auto-assign IDs to all items missing one">
              <Button
                size="sm"
                variant="default"
                leftSection={<IconRefresh size={14} />}
                loading={generateMissing.isPending}
                onClick={() => generateMissing.mutate()}
              >
                Generate missing
              </Button>
            </Tooltip>
          )}
          <Button
            size="sm"
            leftSection={<IconPrinter size={14} />}
            disabled={selectedCount === 0}
            onClick={() => setPrintOpen(true)}
          >
            Print {selectedCount > 0 ? `(${selectedCount})` : 'selected'}
          </Button>
        </Group>
      </Group>

      <Group gap={8}>
        <Select
          size="xs"
          value={filter}
          onChange={(v) => setFilter((v ?? 'all') as typeof filter)}
          data={[
            { value: 'all', label: 'All items' },
            { value: 'with-id', label: 'Has asset ID' },
            { value: 'without-id', label: 'No asset ID' },
          ]}
          style={{ width: 160 }}
        />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '32px 44px 1fr 160px 120px 100px',
            gap: 12,
            padding: '6px 12px',
            background: 'var(--dt-gray-1)',
            borderBottom: '1px solid var(--dt-border)',
            fontSize: 11,
            textTransform: 'uppercase',
            fontWeight: 700,
            color: 'var(--dt-fg-3)',
            letterSpacing: '.04em',
            alignItems: 'center',
          }}
        >
          <Checkbox
            size="xs"
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onChange={toggleAll}
          />
          <span />
          <span>Item</span>
          <span>Asset ID</span>
          <span>Location</span>
          <span>Status</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <IconSearch size={32} style={{ color: 'var(--dt-fg-4)', marginBottom: 8 }} />
            <Text size="sm" c="dimmed">
              No items match this filter.
            </Text>
          </div>
        ) : (
          filtered.map((item) => (
            <AssetRow
              key={item.id}
              item={item}
              checked={selected.has(item.id)}
              onToggle={() => toggle(item.id)}
              onNavigate={() => navigate({ to: '/items/$itemId', params: { itemId: item.id } })}
            />
          ))
        )}
      </Paper>

      <Modal
        opened={printOpen}
        onClose={() => setPrintOpen(false)}
        title="Print asset ID labels"
        size="lg"
      >
        <ItemLabelsPrintView
          items={printItems}
          getLocationName={getLocationName}
          onPrint={() => window.print()}
        />
      </Modal>
    </div>
  );
}

function AssetRow({
  item,
  checked,
  onToggle,
  onNavigate,
}: {
  item: Item;
  checked: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 44px 1fr 160px 120px 100px',
        gap: 12,
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid var(--dt-divider)',
        background: checked ? 'var(--mantine-color-blue-light)' : undefined,
        fontSize: 13,
      }}
      onMouseEnter={(e) => {
        if (!checked) e.currentTarget.style.background = 'var(--dt-gray-0)';
      }}
      onMouseLeave={(e) => {
        if (!checked) e.currentTarget.style.background = '';
      }}
    >
      <Checkbox
        size="xs"
        checked={checked}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <QrPlaceholder value={item.asset_id} />
      <Text size="sm" fw={500} style={{ cursor: 'pointer' }} onClick={onNavigate}>
        {item.name}
      </Text>
      <Text size="xs" className="mono" c={item.asset_id ? undefined : 'dimmed'}>
        {item.asset_id ?? '—'}
      </Text>
      <Text size="xs" c="dimmed" truncate>
        —
      </Text>
      <Badge size="xs" variant="light" color={statusColor(item.status)}>
        {item.status}
      </Badge>
    </div>
  );
}

function statusColor(s: Item['status']) {
  if (s === 'owned') return 'green';
  if (s === 'loaned') return 'blue';
  return 'red';
}
