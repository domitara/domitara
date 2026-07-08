import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Avatar,
  Loader,
  Center,
  Menu,
  ActionIcon,
} from '@mantine/core';
import {
  IconPlus,
  IconCalendar,
  IconClock,
  IconTool,
  IconChevronRight,
  IconHistory,
  IconX,
} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import {
  useDashboard,
  useItems,
  useReminders,
  useDismissReminder,
  useSnoozeReminder,
} from '../api/queries';
import type { Reminder } from '../api/types';
import { formatCurrency } from '../utils';
import { ItemCard } from './AllItemsScreen';

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const dismiss = useDismissReminder();
  const snooze = useSnoozeReminder();

  const colorMap = {
    info: { text: 'var(--dt-blue-7)', bg: 'var(--dt-blue-0)', border: 'var(--dt-blue-4)' },
    warn: { text: 'var(--dt-warn)', bg: 'var(--dt-warn-bg)', border: 'var(--dt-warn)' },
    danger: { text: 'var(--dt-danger)', bg: 'var(--dt-danger-bg)', border: 'var(--dt-danger)' },
  }[reminder.tone];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        borderRadius: 6,
        background: colorMap.bg,
        border: `1px solid ${colorMap.border}33`,
      }}
    >
      <div style={{ flex: 1 }}>
        <Text size="sm" fw={500}>
          {reminder.title}
        </Text>
        <Text size="xs" c="dimmed">
          {reminder.body}
        </Text>
      </div>
      <Menu withinPortal position="bottom-end" width={140}>
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" size="sm" title="Snooze">
            <IconClock size={14} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Snooze for</Menu.Label>
          <Menu.Item onClick={() => snooze.mutate({ id: reminder.id, days: 1 })}>1 day</Menu.Item>
          <Menu.Item onClick={() => snooze.mutate({ id: reminder.id, days: 3 })}>3 days</Menu.Item>
          <Menu.Item onClick={() => snooze.mutate({ id: reminder.id, days: 7 })}>1 week</Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        title="Dismiss"
        onClick={() => dismiss.mutate(reminder.id)}
      >
        <IconX size={14} />
      </ActionIcon>
    </div>
  );
}

export function DashboardScreen() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboard();
  const { data: items = [], isLoading: itemsLoading } = useItems();
  const { data: reminders = [] } = useReminders();

  const statCards = stats
    ? [
        { label: 'Total items', value: stats.total_items, delta: null },
        { label: 'Locations', value: stats.total_locations, delta: null },
        { label: 'Labels', value: stats.total_labels, delta: null },
        { label: 'Total value', value: formatCurrency(stats.total_value), delta: null },
        { label: 'Warranties expiring', value: stats.total_expiring_warranties, delta: null },
      ]
    : [];

  return (
    <Stack gap={16}>
      <Group justify="space-between">
        <Title order={1} style={{ fontSize: 28 }}>
          Dashboard
        </Title>
        <Group gap={8}>
          <Button variant="default" size="sm" leftSection={<IconCalendar size={14} />}>
            Last 30 days
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

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {statsLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Paper key={i} withBorder p={14} radius="md" style={{ minHeight: 72 }}>
                <Center h={44}>
                  <Loader size="xs" />
                </Center>
              </Paper>
            ))
          : statCards.map((s) => (
              <Paper key={s.label} withBorder p={14} radius="md">
                <Text size="xs" fw={600} tt="uppercase" lts="0.04em" c="dimmed">
                  {s.label}
                </Text>
                <Text style={{ fontSize: 26 }} fw={700} lh={1} mt={4}>
                  {s.value}
                </Text>
              </Paper>
            ))}
      </div>

      {/* Recently added */}
      <Paper withBorder p={16} radius="md">
        <Group justify="space-between" mb={12}>
          <Group gap={8}>
            <IconClock size={20} color="var(--dt-fg-2)" />
            <Title order={3} style={{ fontSize: '1.125rem' }}>
              Recently added
            </Title>
          </Group>
          <Button
            variant="subtle"
            size="sm"
            rightSection={<IconChevronRight size={14} />}
            onClick={() => navigate({ to: '/items' })}
          >
            See all
          </Button>
        </Group>
        {itemsLoading ? (
          <Center h={120}>
            <Loader size="sm" />
          </Center>
        ) : items.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py={32}>
            No items yet. Add your first item!
          </Text>
        ) : (
          <div className="item-card-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {items.slice(0, 6).map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                onClick={() => navigate({ to: '/items/$itemId', params: { itemId: it.id } })}
              />
            ))}
          </div>
        )}
      </Paper>

      {/* Lower row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Needs attention */}
        <Paper withBorder p={16} radius="md">
          <Group justify="space-between" mb={12}>
            <Group gap={8}>
              <IconTool size={20} color="var(--dt-fg-2)" />
              <Title order={3} style={{ fontSize: '1.125rem' }}>
                Needs attention
              </Title>
            </Group>
            <Button variant="subtle" size="sm" onClick={() => navigate({ to: '/maintenance' })}>
              View all
            </Button>
          </Group>
          {reminders.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py={16}>
              All clear — no reminders right now.
            </Text>
          ) : (
            <Stack gap={8}>
              {reminders.map((r) => (
                <ReminderRow key={r.id} reminder={r} />
              ))}
            </Stack>
          )}
        </Paper>

        {/* Activity */}
        <Paper withBorder p={16} radius="md">
          <Group gap={8} mb={12}>
            <IconHistory size={20} color="var(--dt-fg-2)" />
            <Title order={3} style={{ fontSize: '1.125rem' }}>
              Activity
            </Title>
          </Group>
          {items.slice(0, 4).map((a) => (
            <Group key={a.id} align="flex-start" gap={10} mb={10}>
              <Avatar size={24} radius="xl" color="blue" style={{ fontSize: 10 }}>
                {a.name.charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" truncate>
                  <span style={{ color: 'var(--dt-blue-7)' }}>{a.name}</span> added
                </Text>
                <Text size="xs" c="dimmed">
                  {new Date(a.created_at).toLocaleDateString()}
                </Text>
              </div>
            </Group>
          ))}
          {items.length === 0 && (
            <Text size="sm" c="dimmed">
              No recent activity.
            </Text>
          )}
        </Paper>
      </div>
    </Stack>
  );
}
