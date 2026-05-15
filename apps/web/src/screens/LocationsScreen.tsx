import { useState } from 'react';
import { Paper, Title, Text, Button, Group, Stack, ActionIcon, TextInput, Loader, Center } from '@mantine/core';
import { IconPlus, IconUpload, IconSearch, IconChevronDown, IconChevronRight, IconFolder, IconFolderOpen, IconBox, IconEdit, IconDotsVertical } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useLocations, useItems } from '../api/queries';
import { getDescendants } from '../utils';
import { ItemCard } from './AllItemsScreen';

export function LocationsScreen() {
  const navigate = useNavigate();
  const { data: locations = [], isLoading } = useLocations();
  const { data: allItems = [] } = useItems();
  const [open, setOpen] = useState(new Set<string>());
  const [active, setActive] = useState<string | null>(null);

  const toggle = (id: string) => setOpen(p => {
    const n = new Set(p);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const rootLocations = locations.filter(l => l.parent_id === null);
  const activeLoc = active ? locations.find(l => l.id === active) : null;
  const itemsHere = activeLoc
    ? allItems.filter(i => i.location_id && getDescendants(locations, activeLoc.id).has(i.location_id)).slice(0, 6)
    : [];

  function TreeNode({ id, depth = 0 }: { id: string; depth?: number }) {
    const node = locations.find(l => l.id === id);
    if (!node) return null;
    const kids = locations.filter(l => l.parent_id === id);
    const isOpen = open.has(id);
    return (
      <div>
        <div onClick={() => setActive(id)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: `6px 10px 6px ${10 + depth * 16}px`, borderRadius: 6, cursor: 'pointer', background: active === id ? 'var(--dt-blue-0)' : 'transparent' }}
          onMouseEnter={e => { if (active !== id) e.currentTarget.style.background = 'var(--dt-gray-1)'; }}
          onMouseLeave={e => { if (active !== id) e.currentTarget.style.background = 'transparent'; }}>
          <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, visibility: kids.length === 0 ? 'hidden' : 'visible' }}
            onClick={e => { e.stopPropagation(); toggle(id); }}>
            {kids.length > 0 && (isOpen ? <IconChevronDown size={14} color="var(--dt-fg-3)"/> : <IconChevronRight size={14} color="var(--dt-fg-3)"/>)}
          </span>
          {isOpen && kids.length > 0
            ? <IconFolderOpen size={16} color={active === id ? 'var(--dt-blue-7)' : 'var(--dt-fg-2)'}/>
            : <IconFolder     size={16} color={active === id ? 'var(--dt-blue-7)' : 'var(--dt-fg-2)'}/>}
          <Text size="sm" style={{ flex: 1, color: active === id ? 'var(--dt-blue-8)' : 'var(--dt-fg-1)', fontWeight: active === id ? 500 : 400 }}>{node.name}</Text>
          <Text size="xs" c="dimmed">{node.item_count}</Text>
        </div>
        {isOpen && kids.map(k => <TreeNode key={k.id} id={k.id} depth={depth + 1}/>)}
      </div>
    );
  }

  if (isLoading) return <Center h={200}><Loader/></Center>;

  return (
    <Stack gap={14}>
      <Group justify="space-between">
        <Title order={1} style={{ fontSize: "1.75rem" }}>Locations</Title>
        <Group gap={8}>
          <Button variant="default" size="sm" leftSection={<IconUpload size={14}/>}>Import CSV</Button>
          <Button size="sm" leftSection={<IconPlus size={14}/>}>New location</Button>
        </Group>
      </Group>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <Paper withBorder p={8} radius="md">
          <TextInput placeholder="Search locations…" leftSection={<IconSearch size={16}/>} size="sm" mb={6}/>
          {locations.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py={24}>No locations yet.</Text>
          ) : (
            rootLocations.map(l => <TreeNode key={l.id} id={l.id}/>)
          )}
        </Paper>

        <Stack gap={14}>
          {activeLoc ? (
            <>
              <Paper withBorder p={16} radius="md">
                <Group justify="space-between">
                  <div>
                    <Title order={2} style={{ fontSize: "1.375rem" }}>{activeLoc.name}</Title>
                    <Text size="sm" c="dimmed" mt={4}>
                      {activeLoc.item_count} items · {locations.filter(l => l.parent_id === activeLoc.id).length} child locations
                    </Text>
                  </div>
                  <Group gap={6}>
                    <Button variant="default" size="sm" rightSection={<IconChevronRight size={14}/>}
                      onClick={() => navigate({ to: '/locations/$locationId', params: { locationId: activeLoc.id } })}>
                      View all items
                    </Button>
                    <ActionIcon variant="default" size="lg"><IconEdit size={16}/></ActionIcon>
                    <ActionIcon variant="default" size="lg"><IconDotsVertical size={16}/></ActionIcon>
                  </Group>
                </Group>
              </Paper>

              <Paper withBorder p={16} radius="md">
                <Group justify="space-between" mb={12}>
                  <Title order={3} style={{ fontSize: "1.125rem" }}>Items in this location</Title>
                  <Button variant="subtle" size="sm" onClick={() => navigate({ to: '/locations/$locationId', params: { locationId: activeLoc.id } })}>See all</Button>
                </Group>
                {itemsHere.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <IconBox size={32} color="var(--dt-gray-5)"/>
                    <Text fw={600}>No items here yet</Text>
                    <Button size="sm" leftSection={<IconPlus size={14}/>} mt={4}>Add item</Button>
                  </div>
                ) : (
                  <div className="item-card-grid">
                    {itemsHere.map(it => <ItemCard key={it.id} item={it} locations={locations}
                      onClick={() => navigate({ to: '/items/$itemId', params: { itemId: it.id } })}/>)}
                  </div>
                )}
              </Paper>
            </>
          ) : (
            <Paper withBorder p={32} radius="md" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text size="sm" c="dimmed">Select a location to view details</Text>
            </Paper>
          )}
        </Stack>
      </div>
    </Stack>
  );
}
