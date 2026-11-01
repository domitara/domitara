import { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Tabs,
  TextInput,
  PasswordInput,
  Select,
  Badge,
  ActionIcon,
  Alert,
  Loader,
  Center,
  Modal,
} from '@mantine/core';
import {
  IconSettings,
  IconUsers,
  IconAlertTriangle,
  IconDotsVertical,
  IconTrash,
  IconAlertCircle,
  IconUserPlus,
  IconClockPlay,
  IconPlayerPlay,
} from '@tabler/icons-react';
import {
  useAdminUsers,
  useAdminDeleteUser,
  useAdminCreateUser,
  useAdminScheduledTasks,
  useAdminRunScheduledTask,
  useMe,
} from '../api/queries';
import type { ScheduledTask } from '../api/types';

export function AdminSettingsScreen() {
  return (
    <Stack gap={14}>
      <Group justify="space-between">
        <Title order={1} style={{ fontSize: '1.75rem' }}>
          Admin Settings
        </Title>
      </Group>

      <Tabs defaultValue="general">
        <Tabs.List mb={16}>
          <Tabs.Tab value="general" leftSection={<IconSettings size={15} />}>
            General
          </Tabs.Tab>
          <Tabs.Tab value="users" leftSection={<IconUsers size={15} />}>
            Users
          </Tabs.Tab>
          <Tabs.Tab value="tasks" leftSection={<IconClockPlay size={15} />}>
            Scheduled Tasks
          </Tabs.Tab>
          <Tabs.Tab value="danger" leftSection={<IconAlertTriangle size={15} />}>
            Danger Zone
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="general">
          <Paper withBorder p={24} radius="md">
            <Stack gap={14} maw={480}>
              <div>
                <Title order={2} style={{ fontSize: '1.25rem' }}>
                  General
                </Title>
                <Text c="dimmed" size="sm" mt={4}>
                  Instance-wide settings.
                </Text>
              </div>
              <TextInput
                label="Instance name"
                defaultValue="My Home Inventory"
                description="Shown in the browser title bar."
              />
              <TextInput
                label="Instance URL"
                placeholder="https://domitara.example.com"
                description="Used for QR codes and asset links."
              />
              <Group gap={8} mt={4}>
                <Button>Save changes</Button>
                <Button variant="default">Cancel</Button>
              </Group>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="users">
          <UsersTab />
        </Tabs.Panel>

        <Tabs.Panel value="tasks">
          <ScheduledTasksTab />
        </Tabs.Panel>

        <Tabs.Panel value="danger">
          <Paper withBorder p={24} radius="md" style={{ borderColor: 'var(--dt-danger)' }}>
            <Stack gap={16} maw={480}>
              <div>
                <Title order={2} style={{ fontSize: '1.25rem', color: 'var(--dt-danger)' }}>
                  Danger Zone
                </Title>
                <Text c="dimmed" size="sm" mt={4}>
                  These actions are irreversible. Proceed with caution.
                </Text>
              </div>
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                Deleting all data will permanently remove all items, locations, and labels. This
                cannot be undone.
              </Alert>
              <Group>
                <Button color="red" variant="outline">
                  Delete all inventory data
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function CreateUserModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const createUser = useAdminCreateUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('member');
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Valid email required';
    if (password.length < 8) e.password = 'Password must be at least 8 characters';
    return e;
  };

  const handleSubmit = (ev: React.SyntheticEvent) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    createUser.mutate(
      { name, email, password, role },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      }
    );
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Create user" size="sm">
      <form onSubmit={handleSubmit}>
        <Stack gap={12}>
          <TextInput
            label="Name"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            error={errors.name}
          />
          <TextInput
            label="Email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            error={errors.email}
          />
          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            error={errors.password}
          />
          <Select
            label="Role"
            value={role}
            onChange={(v) => setRole((v ?? 'member') as 'admin' | 'member')}
            data={[
              { value: 'member', label: 'Member' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          {createUser.isError && (
            <Alert color="red" variant="light">
              {(createUser.error as Error)?.message ?? 'Failed to create user'}
            </Alert>
          )}
          <Group justify="flex-end" mt={4}>
            <Button variant="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createUser.isPending}>
              Create user
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function UsersTab() {
  const { data: users = [], isLoading } = useAdminUsers();
  const deleteUser = useAdminDeleteUser();
  const { data: me } = useMe();
  const currentUserId = me?.id;
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading)
    return (
      <Center h={120}>
        <Loader size="sm" />
      </Center>
    );

  return (
    <>
      <CreateUserModal opened={createOpen} onClose={() => setCreateOpen(false)} />
      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <Group
          justify="space-between"
          p={16}
          style={{ borderBottom: '1px solid var(--dt-border)' }}
        >
          <Title order={3} style={{ fontSize: '1.125rem' }}>
            Users
          </Title>
          <Button
            size="sm"
            leftSection={<IconUserPlus size={14} />}
            onClick={() => setCreateOpen(true)}
          >
            Create user
          </Button>
        </Group>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 100px 60px',
            gap: 12,
            padding: '6px 16px',
            background: 'var(--dt-gray-1)',
            borderBottom: '1px solid var(--dt-border)',
            fontSize: 11,
            textTransform: 'uppercase',
            fontWeight: 700,
            color: 'var(--dt-fg-3)',
            letterSpacing: '.04em',
          }}
        >
          <span>Name / Email</span>
          <span>Email</span>
          <span>Role</span>
          <span />
        </div>
        {users.map((u) => (
          <div
            key={u.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 100px 60px',
              gap: 12,
              alignItems: 'center',
              padding: '10px 16px',
              borderBottom: '1px solid var(--dt-divider)',
              fontSize: 13,
            }}
          >
            <div>
              <Text size="sm" fw={500}>
                {u.name}
              </Text>
              <Text size="xs" c="dimmed">
                {u.email}
              </Text>
            </div>
            <Text size="sm" c="dimmed">
              {u.email}
            </Text>
            <Badge color={u.role === 'admin' ? 'blue' : 'gray'} variant="light" size="sm">
              {u.role}
            </Badge>
            <Group gap={4}>
              <ActionIcon variant="subtle" color="gray" size="sm">
                <IconDotsVertical size={16} />
              </ActionIcon>
              {u.id !== currentUserId &&
                (confirmDelete === u.id ? (
                  <ActionIcon
                    color="red"
                    size="sm"
                    onClick={() => {
                      deleteUser.mutate(u.id);
                      setConfirmDelete(null);
                    }}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                ) : (
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => setConfirmDelete(u.id)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                ))}
            </Group>
          </div>
        ))}
      </Paper>
    </>
  );
}

const TASK_COLUMNS = 'minmax(0, 2fr) 140px minmax(0, 1.2fr) minmax(0, 1.2fr) 120px 110px';

function taskTitle(name: string): string {
  const spaced = name.replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatWhen(iso?: string): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

function formatDuration(ms?: number): string {
  if (ms === undefined) return '';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function TaskStatusBadge({ task }: { task: ScheduledTask }) {
  if (task.running) {
    return (
      <Badge color="blue" variant="light" size="sm" leftSection={<Loader size={8} />}>
        Running
      </Badge>
    );
  }
  if (task.last_status === 'error') {
    return (
      <Badge color="red" variant="light" size="sm" title={task.last_error}>
        Failed
      </Badge>
    );
  }
  if (task.last_status === 'success') {
    return (
      <Badge color="green" variant="light" size="sm">
        Succeeded
      </Badge>
    );
  }
  return (
    <Badge color="gray" variant="light" size="sm">
      Not run yet
    </Badge>
  );
}

function ScheduledTasksTab() {
  const { data: tasks = [], isLoading, isError, error } = useAdminScheduledTasks();
  const runTask = useAdminRunScheduledTask();

  if (isLoading)
    return (
      <Center h={120}>
        <Loader size="sm" />
      </Center>
    );

  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
      <div style={{ padding: 16, borderBottom: '1px solid var(--dt-border)' }}>
        <Title order={3} style={{ fontSize: '1.125rem' }}>
          Scheduled tasks
        </Title>
        <Text c="dimmed" size="sm" mt={4}>
          Background jobs that keep reminders up to date. Times are shown in your local timezone.
          Last-run details reset when the server restarts, and every task runs once at startup.
        </Text>
      </div>
      {(isError || runTask.isError) && (
        <Alert color="red" variant="light" m={16} icon={<IconAlertCircle size={16} />}>
          {((runTask.error ?? error) as Error)?.message ?? 'Something went wrong'}
        </Alert>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: TASK_COLUMNS,
          gap: 12,
          padding: '6px 16px',
          background: 'var(--dt-gray-1)',
          borderBottom: '1px solid var(--dt-border)',
          fontSize: 11,
          textTransform: 'uppercase',
          fontWeight: 700,
          color: 'var(--dt-fg-3)',
          letterSpacing: '.04em',
        }}
      >
        <span>Task</span>
        <span>Interval</span>
        <span>Last run</span>
        <span>Next run</span>
        <span>Status</span>
        <span />
      </div>
      {tasks.map((t) => (
        <div
          key={t.name}
          style={{
            display: 'grid',
            gridTemplateColumns: TASK_COLUMNS,
            gap: 12,
            alignItems: 'center',
            padding: '10px 16px',
            borderBottom: '1px solid var(--dt-divider)',
            fontSize: 13,
          }}
        >
          <div>
            <Text size="sm" fw={500}>
              {taskTitle(t.name)}
            </Text>
            <Text size="xs" c="dimmed">
              {t.description}
            </Text>
            {t.last_status === 'error' && t.last_error && (
              <Text size="xs" c="red" mt={2}>
                {t.last_error}
              </Text>
            )}
          </div>
          <Text size="sm">{t.interval}</Text>
          <div>
            <Text size="sm">{formatWhen(t.last_run_at)}</Text>
            {t.last_duration_ms !== undefined && (
              <Text size="xs" c="dimmed">
                took {formatDuration(t.last_duration_ms)}
              </Text>
            )}
          </div>
          <Text size="sm">{formatWhen(t.next_run_at)}</Text>
          <TaskStatusBadge task={t} />
          <Button
            size="xs"
            variant="default"
            leftSection={<IconPlayerPlay size={14} />}
            disabled={t.running}
            loading={runTask.isPending && runTask.variables === t.name}
            onClick={() => runTask.mutate(t.name)}
          >
            Run now
          </Button>
        </div>
      ))}
    </Paper>
  );
}
