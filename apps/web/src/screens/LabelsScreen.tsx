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
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconChevronRight,
  IconTag,
  IconBox,
  IconEdit,
  IconDotsVertical,
} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useLabels, useItems, useLocations } from '../api/queries';
import { ItemCard } from './AllItemsScreen';
import { NewLabelModal } from '../components/NewLabelModal';

export function LabelsScreen() {
  const navigate = useNavigate();
  const { data: labels = [], isLoading } = useLabels();
  const { data: allItems = [] } = useItems();
  const { data: locations = [] } = useLocations();
  const [active, setActive] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(
    () => labels.filter((l) => l.name.toLowerCase().includes(search.toLowerCase())),
    [labels, search]
  );

  const activeLabel = active ? labels.find((l) => l.id === active) : null;
  const itemsHere = activeLabel
    ? allItems.filter((i) => i.label_ids?.includes(activeLabel.id)).slice(0, 6)
    : [];

  if (isLoading)
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );

  return (
    <Stack gap={14}>
      <Group justify="space-between">
        <Title order={1} style={{ fontSize: '1.75rem' }}>
          Labels
        </Title>
        <Button size="sm" leftSection={<IconPlus size={14} />} onClick={() => setModalOpen(true)}>
          New label
        </Button>
      </Group>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <Paper withBorder p={8} radius="md">
          <TextInput
            placeholder="Search labels…"
            leftSection={<IconSearch size={16} />}
            size="sm"
            mb={6}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          {filtered.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py={24}>
              {search ? 'No labels match.' : 'No labels yet.'}
            </Text>
          ) : (
            filtered.map((l) => (
              <div
                key={l.id}
                onClick={() => setActive(l.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: active === l.id ? 'var(--dt-blue-0)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (active !== l.id) e.currentTarget.style.background = 'var(--dt-gray-1)';
                }}
                onMouseLeave={(e) => {
                  if (active !== l.id) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: l.color,
                    flexShrink: 0,
                  }}
                />
                <Text
                  size="sm"
                  style={{
                    flex: 1,
                    color: active === l.id ? 'var(--dt-blue-8)' : 'var(--dt-fg-1)',
                    fontWeight: active === l.id ? 500 : 400,
                  }}
                >
                  {l.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {l.item_count}
                </Text>
              </div>
            ))
          )}
        </Paper>

        <Stack gap={14}>
          {activeLabel ? (
            <>
              <Paper withBorder p={16} radius="md">
                <Group justify="space-between">
                  <Group gap={10}>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: activeLabel.color,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <Title order={2} style={{ fontSize: '1.375rem' }}>
                        {activeLabel.name}
                      </Title>
                      <Text size="sm" c="dimmed" mt={4}>
                        {activeLabel.item_count} items
                      </Text>
                    </div>
                  </Group>
                  <Group gap={6}>
                    <Button
                      variant="default"
                      size="sm"
                      rightSection={<IconChevronRight size={14} />}
                      onClick={() =>
                        navigate({ to: '/labels/$labelId', params: { labelId: activeLabel.id } })
                      }
                    >
                      View all items
                    </Button>
                    <Button size="sm" leftSection={<IconPlus size={14} />}>
                      Add label
                    </Button>
                    <ActionIcon variant="default" size="lg">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="default" size="lg">
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>

              <Paper withBorder p={16} radius="md">
                <Group justify="space-between" mb={12}>
                  <Title order={3} style={{ fontSize: '1.125rem' }}>
                    Items with this label
                  </Title>
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() =>
                      navigate({ to: '/labels/$labelId', params: { labelId: activeLabel.id } })
                    }
                  >
                    See all
                  </Button>
                </Group>
                {itemsHere.length === 0 ? (
                  <div
                    style={{
                      padding: 32,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <IconBox size={32} color="var(--dt-gray-5)" />
                    <Text fw={600}>No items with this label</Text>
                    <Button size="sm" leftSection={<IconPlus size={14} />} mt={4}>
                      Add item
                    </Button>
                  </div>
                ) : (
                  <div className="item-card-grid">
                    {itemsHere.map((it) => (
                      <ItemCard
                        key={it.id}
                        item={it}
                        locations={locations}
                        onClick={() =>
                          navigate({ to: '/items/$itemId', params: { itemId: it.id } })
                        }
                      />
                    ))}
                  </div>
                )}
              </Paper>
            </>
          ) : (
            <Paper
              withBorder
              p={32}
              radius="md"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Group gap={8}>
                <IconTag size={20} color="var(--dt-gray-5)" />
                <Text size="sm" c="dimmed">
                  Select a label to view details
                </Text>
              </Group>
            </Paper>
          )}
        </Stack>
      </div>

      <NewLabelModal opened={modalOpen} onClose={() => setModalOpen(false)} />
    </Stack>
  );
}
