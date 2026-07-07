import { useState } from 'react';
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
  Menu,
} from '@mantine/core';
import {
  IconPlus,
  IconClock,
  IconDotsVertical,
  IconX,
  IconTrash,
  IconCheck,
  IconPencil,
  IconCalendar,
  IconHelp,
} from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import {
  useMaintenance,
  useSchedules,
  useReminders,
  useDismissReminder,
  useSnoozeReminder,
  useDeleteMaintenance,
  useDeleteSchedule,
} from '../api/queries';
import type { MaintenanceLog, MaintenanceSchedule, Reminder } from '../api/types';
import { formatCurrency } from '../utils';
import { LogMaintenanceModal } from '../components/LogMaintenanceModal';
import { MaintenanceScheduleModal } from '../components/MaintenanceScheduleModal';

function dueStatus(nextDueAt: string): { label: string; color: string } {
  const due = new Date(nextDueAt);
  const now = new Date();
  const days = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: 'Overdue', color: 'red' };
  if (days <= 7) return { label: 'Due soon', color: 'yellow' };
  return { label: 'Upcoming', color: 'green' };
}

function formatFrequency(value: number, unit: string): string {
  return `Every ${value} ${value === 1 ? unit.replace(/s$/, '') : unit}`;
}

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

interface ScheduleRowProps {
  schedule: MaintenanceSchedule;
  onMarkDone: (s: MaintenanceSchedule) => void;
  onEdit: (s: MaintenanceSchedule) => void;
}

function ScheduleRow({ schedule, onMarkDone, onEdit }: ScheduleRowProps) {
  const del = useDeleteSchedule();
  const status = dueStatus(schedule.next_due_at);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '100px 1.5fr 1fr 130px 80px',
        gap: 12,
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid var(--dt-divider)',
        fontSize: 13,
      }}
    >
      <Badge color={status.color} variant="light" size="sm">
        {status.label}
      </Badge>
      <div>
        <Text size="sm" fw={500}>
          {schedule.title}
        </Text>
        {schedule.item_name && (
          <Text size="xs" c="dimmed">
            {schedule.item_name}
          </Text>
        )}
      </div>
      <Text size="xs" c="dimmed">
        {formatFrequency(schedule.frequency_value, schedule.frequency_unit)}
      </Text>
      <Text size="xs" className="mono" c="dimmed">
        Due {schedule.next_due_at}
      </Text>
      <Group gap={4} justify="flex-end">
        <ActionIcon
          variant="subtle"
          color="green"
          size="sm"
          title="Mark done"
          onClick={() => onMarkDone(schedule)}
        >
          <IconCheck size={14} />
        </ActionIcon>
        <Menu withinPortal position="bottom-end" width={130}>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" size="sm">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => onEdit(schedule)}>
              Edit
            </Menu.Item>
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={() =>
                modals.openConfirmModal({
                  title: 'Delete schedule',
                  children: (
                    <Text size="sm">
                      Are you sure you want to delete <strong>{schedule.title}</strong>? This cannot
                      be undone.
                    </Text>
                  ),
                  labels: { confirm: 'Delete', cancel: 'Cancel' },
                  confirmProps: { color: 'red' },
                  onConfirm: () => del.mutate(schedule.id),
                })
              }
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </div>
  );
}

function LogRow({ log }: { log: MaintenanceLog }) {
  const del = useDeleteMaintenance();
  return (
    <div
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
        {log.performed_at}
      </Text>
      <Text size="sm" fw={500}>
        {log.title}
      </Text>
      <Text size="sm" c="dimmed">
        {log.item_name ?? '—'}
      </Text>
      <Text size="xs" className="mono">
        {formatCurrency(log.cost)}
      </Text>
      <Menu withinPortal position="bottom-end" width={130}>
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" size="sm">
            <IconDotsVertical size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={() =>
              modals.openConfirmModal({
                title: 'Delete log entry',
                children: (
                  <Text size="sm">
                    Are you sure you want to delete <strong>{log.title}</strong>? This cannot be
                    undone.
                  </Text>
                ),
                labels: { confirm: 'Delete', cancel: 'Cancel' },
                confirmProps: { color: 'red' },
                onConfirm: () => del.mutate(log.id),
              })
            }
          >
            Delete
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}

export function MaintenanceScreen() {
  const { data: logs = [], isLoading: logsLoading } = useMaintenance();
  const { data: schedules = [], isLoading: schedulesLoading } = useSchedules();
  const { data: reminders = [] } = useReminders();

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logModalDefaults, setLogModalDefaults] = useState<{
    title?: string;
    itemId?: string;
    scheduleId?: string;
  }>({});

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | undefined>();

  const openLogModal = () => {
    setLogModalDefaults({});
    setLogModalOpen(true);
  };

  const markDone = (s: MaintenanceSchedule) => {
    setLogModalDefaults({
      title: s.title,
      itemId: s.item_id ?? undefined,
      scheduleId: s.id,
    });
    setLogModalOpen(true);
  };

  const openNewSchedule = () => {
    setEditingSchedule(undefined);
    setScheduleModalOpen(true);
  };

  const openEditSchedule = (s: MaintenanceSchedule) => {
    setEditingSchedule(s);
    setScheduleModalOpen(true);
  };

  const isLoading = logsLoading || schedulesLoading;

  if (isLoading)
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );

  return (
    <>
      <LogMaintenanceModal
        opened={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        defaultTitle={logModalDefaults.title}
        defaultItemId={logModalDefaults.itemId}
        scheduleId={logModalDefaults.scheduleId}
      />
      <MaintenanceScheduleModal
        opened={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        editing={editingSchedule}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Group justify="space-between">
          <Group gap={6}>
            <Title order={1} style={{ fontSize: '1.75rem' }}>
              Maintenance
            </Title>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              title="Schedule ideas"
              component="a"
              href="https://domitara.github.io/domitara/features/maintenance-schedules"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconHelp size={18} />
            </ActionIcon>
          </Group>
          <Group gap={8}>
            <Button
              size="sm"
              variant="default"
              leftSection={<IconCalendar size={14} />}
              onClick={openNewSchedule}
            >
              Add schedule
            </Button>
            <Button size="sm" leftSection={<IconPlus size={14} />} onClick={openLogModal}>
              Log maintenance
            </Button>
          </Group>
        </Group>

        {reminders.length > 0 && (
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
              {reminders.map((r) => (
                <ReminderRow key={r.id} reminder={r} />
              ))}
            </div>
          </Paper>
        )}

        <Paper withBorder p={16} radius="md">
          <Group justify="space-between" mb={14}>
            <Group gap={8}>
              <Badge color="blue" variant="light">
                scheduled
              </Badge>
              <Title order={3} style={{ fontSize: '1.125rem', marginLeft: 4 }}>
                Schedules
              </Title>
            </Group>
          </Group>

          {schedules.length === 0 ? (
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
              <IconCalendar size={28} color="var(--dt-gray-5)" />
              <Text fw={600}>No schedules yet</Text>
              <Text size="sm" c="dimmed">
                Add a schedule to track recurring maintenance tasks.
              </Text>
              <Button size="xs" variant="light" mt={4} onClick={openNewSchedule}>
                Add your first schedule
              </Button>
            </div>
          ) : (
            <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1.5fr 1fr 130px 80px',
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
                <span>Status</span>
                <span>Task</span>
                <span>Frequency</span>
                <span>Next due</span>
                <span />
              </div>
              {schedules.map((s) => (
                <ScheduleRow
                  key={s.id}
                  schedule={s}
                  onMarkDone={markDone}
                  onEdit={openEditSchedule}
                />
              ))}
            </Paper>
          )}
        </Paper>

        <Paper withBorder p={16} radius="md">
          <Group gap={8} mb={14}>
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
                <LogRow key={l.id} log={l} />
              ))}
            </Paper>
          )}
        </Paper>
      </div>
    </>
  );
}
