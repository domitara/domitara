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
  Badge,
  ActionIcon,
  Alert,
  Loader,
  Center,
} from '@mantine/core';
import {
  IconSettings,
  IconUsers,
  IconKey,
  IconAlertTriangle,
  IconDotsVertical,
  IconTrash,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useAdminUsers, useAdminDeleteUser, useMe } from '../api/queries';

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
          <Tabs.Tab value="tokens" leftSection={<IconKey size={15} />}>
            API Tokens
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

        <Tabs.Panel value="tokens">
          <Paper withBorder p={24} radius="md">
            <Stack align="center" gap={8} py={32}>
              <IconKey size={32} color="var(--dt-gray-5)" />
              <Text fw={600}>API Tokens</Text>
              <Text size="sm" c="dimmed">
                Create API tokens to access Domitara programmatically.
              </Text>
              <Button leftSection={<IconKey size={14} />} mt={4}>
                Generate token
              </Button>
            </Stack>
          </Paper>
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

function UsersTab() {
  const { data: users = [], isLoading } = useAdminUsers();
  const deleteUser = useAdminDeleteUser();
  const { data: me } = useMe();
  const currentUserId = me?.id;
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  if (isLoading)
    return (
      <Center h={120}>
        <Loader size="sm" />
      </Center>
    );

  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
      <Group justify="space-between" p={16} style={{ borderBottom: '1px solid var(--dt-border)' }}>
        <Title order={3} style={{ fontSize: '1.125rem' }}>
          Users
        </Title>
        <Button size="sm" leftSection={<IconUsers size={14} />}>
          Invite user
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
  );
}
