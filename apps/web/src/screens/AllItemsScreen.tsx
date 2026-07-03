import { useState, useMemo } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  ActionIcon,
  TextInput,
  Loader,
  Center,
  Switch,
} from '@mantine/core';
import {
  IconPlus,
  IconDownload,
  IconPrinter,
  IconSearch,
  IconFilter,
  IconTag,
  IconCalendar,
  IconSortAscending,
  IconLayoutGrid,
  IconLayoutList,
  IconBox,
  IconX,
  IconCheck,
  IconDotsVertical,
  IconFolderOpen,
  IconTrash,
} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useItems, useLabels, useLocations } from '../api/queries';
import { getLocationChain, formatCurrency } from '../utils';
import type { Item } from '../api/types';

interface AllItemsScreenProps {
  filterLocationId?: string;
  filterLabelId?: string;
}

export function AllItemsScreen({ filterLocationId, filterLabelId }: AllItemsScreenProps) {
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selected, setSelected] = useState(new Set<string>());
  const [search, setSearch] = useState('');
  const [activeLabels, setActiveLabels] = useState(
    new Set<string>(filterLabelId ? [filterLabelId] : [])
  );
  const [includeQuick, setIncludeQuick] = useState(false);

  const { data: allItems = [], isLoading } = useItems({
    ...(filterLocationId ? { locationId: filterLocationId } : {}),
    ...(filterLabelId ? { labelId: filterLabelId } : {}),
    ...(search ? { q: search } : {}),
    includeQuick,
  });
  const { data: locations = [] } = useLocations();
  const { data: labels = [] } = useLabels();

  const items = useMemo(() => {
    let xs = allItems;
    if (activeLabels.size > 0) xs = xs.filter((i) => i.label_ids.some((l) => activeLabels.has(l)));
    return xs;
  }, [allItems, activeLabels]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  };

  const loc = filterLocationId ? locations.find((l) => l.id === filterLocationId) : null;
  const label = filterLabelId ? labels.find((l) => l.id === filterLabelId) : null;
  const crumbs = loc ? getLocationChain(locations, loc.id) : [];

  if (isLoading)
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );

  return (
    <Stack gap={14}>
      <Group justify="space-between">
        <div>
          {crumbs.length > 0 && (
            <Group gap={4} mb={6} style={{ fontSize: 13, color: 'var(--dt-fg-3)' }}>
              <button
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  color: 'var(--dt-fg-2)',
                  fontSize: 13,
                }}
                onClick={() => navigate({ to: '/locations' })}
              >
                Locations
              </button>
              {crumbs.slice(0, -1).map((c) => (
                <span key={c.id} style={{ display: 'contents' }}>
                  <span>/</span>
                  <button
                    style={{
                      background: 'none',
                      border: 0,
                      cursor: 'pointer',
                      color: 'var(--dt-fg-2)',
                      fontSize: 13,
                    }}
                    onClick={() =>
                      navigate({ to: '/locations/$locationId', params: { locationId: c.id } })
                    }
                  >
                    {c.name}
                  </button>
                </span>
              ))}
              <span>/</span>
              <span style={{ color: 'var(--dt-fg-1)', fontWeight: 500 }}>
                {crumbs[crumbs.length - 1].name}
              </span>
            </Group>
          )}
          {label && (
            <Group gap={4} mb={6} style={{ fontSize: 13, color: 'var(--dt-fg-3)' }}>
              <button
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  color: 'var(--dt-fg-2)',
                  fontSize: 13,
                }}
                onClick={() => navigate({ to: '/labels' })}
              >
                Labels
              </button>
              <span>/</span>
              <span style={{ color: 'var(--dt-fg-1)', fontWeight: 500 }}>{label.name}</span>
            </Group>
          )}
          <Title order={1} style={{ fontSize: '1.75rem' }}>
            {loc ? loc.name : label ? `Items labelled ${label.name}` : 'All items'}
          </Title>
          <Text c="dimmed" size="sm" mt={4}>
            {items.length} items
          </Text>
        </div>
        <Group gap={8}>
          <Button variant="default" size="sm" leftSection={<IconDownload size={14} />}>
            Export
          </Button>
          <Button variant="default" size="sm" leftSection={<IconPrinter size={14} />}>
            Print labels
          </Button>
          <Button
            size="sm"
            leftSection={<IconPlus size={14} />}
            onClick={() => navigate({ to: '/items/new' })}
          >
            Add item
          </Button>
        </Group>
      </Group>

      <Paper withBorder p={10} radius="md">
        <Group gap={8} wrap="wrap">
          <TextInput
            placeholder="Search items…"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={280}
            size="sm"
          />
          <Button variant="default" size="sm" leftSection={<IconFilter size={14} />}>
            All locations
          </Button>
          <Button variant="default" size="sm" leftSection={<IconTag size={14} />}>
            Labels
          </Button>
          <Button variant="default" size="sm" leftSection={<IconCalendar size={14} />}>
            Date
          </Button>
          <Switch
            size="sm"
            label="Show quick items"
            checked={includeQuick}
            onChange={(e) => setIncludeQuick(e.currentTarget.checked)}
          />
          {(activeLabels.size > 0 || search) && (
            <Button
              variant="subtle"
              size="sm"
              onClick={() => {
                setActiveLabels(new Set());
                setSearch('');
              }}
            >
              Clear filters
            </Button>
          )}
          <Group gap={8} ml="auto">
            <Button variant="default" size="sm" leftSection={<IconSortAscending size={14} />}>
              Recently added
            </Button>
            <ActionIcon.Group>
              <ActionIcon
                variant={view === 'grid' ? 'filled' : 'default'}
                onClick={() => setView('grid')}
                size="lg"
              >
                <IconLayoutGrid size={16} />
              </ActionIcon>
              <ActionIcon
                variant={view === 'list' ? 'filled' : 'default'}
                onClick={() => setView('list')}
                size="lg"
              >
                <IconLayoutList size={16} />
              </ActionIcon>
            </ActionIcon.Group>
          </Group>
        </Group>

        {activeLabels.size > 0 && (
          <Group gap={6} mt={10}>
            <Text size="xs" c="dimmed">
              Filter:
            </Text>
            {[...activeLabels].map((lid) => {
              const l = labels.find((x) => x.id === lid);
              if (!l) return null;
              return (
                <Badge
                  key={lid}
                  variant="outline"
                  color="gray"
                  size="sm"
                  leftSection={
                    <span
                      style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }}
                    />
                  }
                  rightSection={
                    <ActionIcon
                      size="xs"
                      variant="transparent"
                      onClick={() =>
                        setActiveLabels((p) => {
                          const n = new Set(p);
                          n.delete(lid);
                          return n;
                        })
                      }
                    >
                      <IconX size={10} />
                    </ActionIcon>
                  }
                >
                  {l.name}
                </Badge>
              );
            })}
          </Group>
        )}
      </Paper>

      {items.length === 0 ? (
        <Paper
          withBorder
          p={32}
          radius="md"
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <IconBox size={36} color="var(--dt-gray-5)" />
          <Text fw={600}>
            No items {search || activeLabels.size > 0 ? 'match these filters' : 'yet'}
          </Text>
          <Text size="sm" c="dimmed">
            {search || activeLabels.size > 0
              ? 'Try clearing filters.'
              : 'Add your first item to get started.'}
          </Text>
          <Button
            size="sm"
            leftSection={<IconPlus size={14} />}
            mt={4}
            onClick={() => navigate({ to: '/items/new' })}
          >
            Add item
          </Button>
        </Paper>
      ) : view === 'grid' ? (
        <div className="item-card-grid">
          {items.map((it) => (
            <ItemCard
              key={it.id}
              item={it}
              locations={locations}
              selected={selected.has(it.id)}
              selectMode={selected.size > 0}
              onClick={() => navigate({ to: '/items/$itemId', params: { itemId: it.id } })}
              onToggleSelect={() => toggleSelect(it.id)}
            />
          ))}
        </div>
      ) : (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 64px 1.5fr 1fr 1fr 90px 100px 40px',
              gap: 12,
              padding: '6px 12px',
              background: 'var(--dt-gray-1)',
              fontSize: 11,
              textTransform: 'uppercase',
              fontWeight: 700,
              color: 'var(--dt-fg-3)',
              letterSpacing: '.04em',
              borderBottom: '1px solid var(--dt-border)',
            }}
          >
            <span />
            <span />
            <span>Item</span>
            <span>Location</span>
            <span>Labels</span>
            <span>Value</span>
            <span>Status</span>
            <span />
          </div>
          {items.map((it) => {
            const lo = locations.find((l) => l.id === it.location_id);
            return (
              <div
                key={it.id}
                onClick={() => navigate({ to: '/items/$itemId', params: { itemId: it.id } })}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 64px 1.5fr 1fr 1fr 90px 100px 40px',
                  gap: 12,
                  alignItems: 'center',
                  padding: '8px 12px',
                  fontSize: 13,
                  borderBottom: '1px solid var(--dt-divider)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dt-gray-0)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    border: `1.5px solid ${selected.has(it.id) ? 'var(--dt-blue-6)' : 'var(--dt-border)'}`,
                    background: selected.has(it.id) ? 'var(--dt-blue-6)' : 'var(--dt-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(it.id);
                  }}
                >
                  {selected.has(it.id) && <IconCheck size={11} color="#fff" />}
                </span>
                <div className="row-thumb ph-1">
                  <IconBox size={16} color="rgba(255,255,255,.7)" />
                </div>
                <div>
                  <Group gap={6} wrap="nowrap">
                    <Text size="sm" fw={500}>
                      {it.name}
                    </Text>
                    {it.tier === 'quick' && (
                      <Badge size="xs" color="gray" variant="light">
                        quick
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" className="mono" c="dimmed">
                    {it.asset_id ?? '—'}
                  </Text>
                </div>
                <Text size="sm" c="dimmed">
                  {lo?.name ?? '—'}
                  {it.grid_row !== null && it.grid_col !== null
                    ? ` · R${it.grid_row + 1}C${it.grid_col + 1}`
                    : ''}
                </Text>
                <Group gap={4} wrap="wrap">
                  {it.label_ids.slice(0, 2).map((lid) => {
                    const l = labels.find((x) => x.id === lid);
                    return l ? (
                      <span
                        key={lid}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '0 6px',
                          height: 18,
                          borderRadius: 6,
                          border: '1px solid var(--dt-border)',
                          fontSize: 11,
                          color: 'var(--dt-fg-2)',
                        }}
                      >
                        <span
                          style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }}
                        />
                        {l.name}
                      </span>
                    ) : null;
                  })}
                  {it.label_ids.length > 2 && (
                    <Text size="xs" c="dimmed">
                      +{it.label_ids.length - 2}
                    </Text>
                  )}
                </Group>
                <Text size="xs" className="mono">
                  {formatCurrency(it.purchase_price)}
                </Text>
                <div>
                  <StatusBadge status={it.status} />
                </div>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </div>
            );
          })}
        </Paper>
      )}

      {selected.size > 0 && (
        <div className="bulk-bar">
          <Text size="sm" fw={600}>
            {selected.size} selected
          </Text>
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            style={{ color: '#fff' }}
            leftSection={<IconX size={14} />}
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
          <Group gap={4} ml="auto">
            <Button
              variant="subtle"
              size="sm"
              style={{ color: '#fff' }}
              leftSection={<IconFolderOpen size={14} />}
            >
              Move to…
            </Button>
            <Button
              variant="subtle"
              size="sm"
              style={{ color: '#fff' }}
              leftSection={<IconTag size={14} />}
            >
              Add label…
            </Button>
            <Button
              variant="subtle"
              size="sm"
              style={{ color: '#fff' }}
              leftSection={<IconPrinter size={14} />}
            >
              Print labels
            </Button>
            <Button
              variant="subtle"
              size="sm"
              style={{ color: '#fff' }}
              leftSection={<IconDownload size={14} />}
            >
              Export
            </Button>
            <Button color="red" size="sm" leftSection={<IconTrash size={14} />}>
              Delete
            </Button>
          </Group>
        </div>
      )}
    </Stack>
  );
}

export function ItemCard({
  item,
  locations = [],
  selected,
  selectMode,
  onClick,
  onToggleSelect,
}: {
  item: Item;
  locations?: { id: string; name: string }[];
  selected?: boolean;
  selectMode?: boolean;
  onClick?: () => void;
  onToggleSelect?: () => void;
}) {
  const loc = locations.find((l) => l.id === item.location_id);
  const ph = `ph-${(item.id.charCodeAt(0) % 8) + 1}`;
  return (
    <div
      style={{
        background: 'var(--dt-bg)',
        border: `1px solid ${selected ? 'var(--dt-blue-6)' : 'var(--dt-border)'}`,
        borderRadius: 8,
        padding: 12,
        boxShadow: 'var(--dt-shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        cursor: 'pointer',
        transition: 'transform .15s ease, box-shadow .15s ease',
        position: 'relative',
        outline: selected ? '2px solid var(--dt-blue-6)' : 'none',
        outlineOffset: -2,
      }}
      onClick={() => (selectMode ? onToggleSelect?.() : onClick?.())}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = 'var(--dt-shadow-lg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = 'var(--dt-shadow-sm)';
      }}
    >
      <div className={`item-card-thumb ${ph}`}>
        <IconBox size={32} color="rgba(255,255,255,.65)" />
        <div className="item-card-thumb-overlay">
          {item.status === 'loaned' && (
            <span
              style={{
                background: 'var(--dt-warn-bg)',
                color: 'var(--dt-warn)',
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 6,
                textTransform: 'uppercase',
              }}
            >
              loaned
            </span>
          )}
          {item.insured && (
            <span
              style={{
                background: '#e6fcf5',
                color: '#099268',
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 6,
                textTransform: 'uppercase',
              }}
            >
              insured
            </span>
          )}
        </div>
        {selectMode && (
          <div
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 18,
              height: 18,
              borderRadius: 4,
              border: '1.5px solid #fff',
              background: selected ? 'var(--dt-blue-6)' : 'rgba(0,0,0,.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
          >
            {selected && <IconCheck size={12} />}
          </div>
        )}
      </div>
      <div>
        <Group gap={6} wrap="nowrap">
          <Text size="sm" fw={600} lh={1.3} lineClamp={1}>
            {item.name}
          </Text>
          {item.tier === 'quick' && (
            <Badge size="xs" color="gray" variant="light">
              quick
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {loc?.name ?? '—'}
          {item.grid_row !== null && item.grid_col !== null
            ? ` · R${item.grid_row + 1}C${item.grid_col + 1}`
            : ''}
        </Text>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: Item['status'] }) {
  if (status === 'loaned')
    return (
      <Badge size="sm" color="yellow" variant="light">
        loaned
      </Badge>
    );
  if (status === 'missing')
    return (
      <Badge size="sm" color="red" variant="light">
        missing
      </Badge>
    );
  return (
    <Badge size="sm" color="green" variant="light">
      owned
    </Badge>
  );
}
