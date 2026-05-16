import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Badge,
  ActionIcon,
  Loader,
  Center,
} from '@mantine/core';
import { IconPlus, IconTool, IconClock, IconShield, IconDotsVertical } from '@tabler/icons-react';
import { useMaintenance } from '../api/queries';
import { formatCurrency } from '../utils';

function AttentionRow({
  icon: Ico,
  title,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  sub: string;
  tone: 'warn' | 'danger' | 'info';
}) {
  const c = {
    warn: { text: 'var(--dt-warn)', bg: 'var(--dt-warn-bg)' },
    danger: { text: 'var(--dt-danger)', bg: 'var(--dt-danger-bg)' },
    info: { text: 'var(--dt-blue-7)', bg: 'var(--dt-blue-0)' },
  }[tone];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        borderRadius: 6,
        background: c.bg,
        border: `1px solid ${c.text}33`,
      }}
    >
      <Ico size={18} color={c.text} />
      <div style={{ flex: 1 }}>
        <Text size="sm" fw={500}>
          {title}
        </Text>
        <Text size="xs" c="dimmed">
          {sub}
        </Text>
      </div>
    </div>
  );
}

export function MaintenanceScreen() {
  const { data: logs = [], isLoading } = useMaintenance();

  if (isLoading)
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Group justify="space-between">
        <Title order={1} style={{ fontSize: '1.75rem' }}>
          Maintenance
        </Title>
        <Button size="sm" leftSection={<IconPlus size={14} />}>
          Log maintenance
        </Button>
      </Group>

      <Paper withBorder p={16} radius="md">
        <Group gap={8} mb={14}>
          <Badge color="yellow" variant="light">
            soon
          </Badge>
          <Title order={3} style={{ fontSize: '1.125rem', marginLeft: 4 }}>
            Reminders
          </Title>
        </Group>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AttentionRow
            icon={IconShield}
            title="Set up maintenance schedules"
            sub="Log your first maintenance to start tracking"
            tone="info"
          />
          <AttentionRow
            icon={IconTool}
            title="Add items to track"
            sub="Maintenance logs are linked to inventory items"
            tone="info"
          />
        </div>

        <Group gap={8} mt={22} mb={14}>
          <Badge color="green" variant="light">
            done
          </Badge>
          <Title order={3} style={{ fontSize: '1.125rem', marginLeft: 4 }}>
            Recent logs
          </Title>
        </Group>

        {logs.length === 0 ? (
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
            <IconClock size={32} color="var(--dt-gray-5)" />
            <Text fw={600}>No maintenance logs yet</Text>
            <Text size="sm" c="dimmed">
              Log your first maintenance event to start tracking.
            </Text>
          </div>
        ) : (
          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1.5fr 1fr 90px 40px',
                gap: 12,
                padding: '6px 12px',
                background: 'var(--dt-gray-1)',
                borderBottom: '1px solid var(--dt-border)',
                fontSize: 11,
                textTransform: 'uppercase',
                fontWeight: 700,
                color: 'var(--dt-fg-3)',
                letterSpacing: '.04em',
              }}
            >
              <span>Date</span>
              <span>What</span>
              <span>Item</span>
              <span>Cost</span>
              <span />
            </div>
            {logs.map((l) => (
              <div
                key={l.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1.5fr 1fr 90px 40px',
                  gap: 12,
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--dt-divider)',
                  fontSize: 13,
                }}
              >
                <Text size="xs" className="mono" c="dimmed">
                  {l.performed_at}
                </Text>
                <Text size="sm" fw={500}>
                  {l.title}
                </Text>
                <Text size="sm" c="dimmed">
                  {l.item_name ?? '—'}
                </Text>
                <Text size="xs" className="mono">
                  {formatCurrency(l.cost)}
                </Text>
                <ActionIcon variant="subtle" color="gray" size="sm">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </div>
            ))}
          </Paper>
        )}
      </Paper>
    </div>
  );
}
