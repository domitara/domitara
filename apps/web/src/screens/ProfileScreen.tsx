import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  TextInput,
  PasswordInput,
  Divider,
  Alert,
  Avatar,
  Badge,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMe, useUpdateMe } from '../api/queries';

export function ProfileScreen() {
  const { data: me } = useMe();
  const updateMe = useUpdateMe();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (me) setName(me.name);
  }, [me]);

  const handleSave = async () => {
    setError('');
    if (password && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    try {
      await updateMe.mutateAsync({ name: name || undefined, password: password || undefined });
      setPassword('');
      setConfirm('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    }
  };

  const initials = (me?.name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Stack gap={14}>
      <Title order={1} style={{ fontSize: '1.75rem' }}>
        Profile &amp; Settings
      </Title>

      <Paper
        withBorder
        radius="md"
        p={32}
        style={{ display: 'flex', alignItems: 'center', gap: 24 }}
      >
        <Avatar size={80} radius="xl" color="blue" style={{ fontSize: 28, flexShrink: 0 }}>
          {initials}
        </Avatar>
        <div>
          <Text fw={700} style={{ fontSize: '1.25rem', lineHeight: 1.2 }}>
            {me?.name ?? '—'}
          </Text>
          <Text size="sm" c="dimmed" mt={2}>
            {me?.email ?? '—'}
          </Text>
          <Badge mt={8} size="sm" variant="light" color={me?.role === 'admin' ? 'blue' : 'gray'}>
            {me?.role ?? 'member'}
          </Badge>
        </div>
      </Paper>

      <Paper withBorder p={24} radius="md">
        <Stack gap={14}>
          <div>
            <Title order={2} style={{ fontSize: '1.125rem' }}>
              Account
            </Title>
            <Text size="sm" c="dimmed" mt={2}>
              Your name and sign-in details.
            </Text>
          </div>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" p={10}>
              {error}
            </Alert>
          )}
          {saved && (
            <Alert color="green" variant="light" p={10}>
              Changes saved.
            </Alert>
          )}

          <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <TextInput
            label="Email"
            value={me?.email ?? ''}
            disabled
            description="Contact an admin to change your email."
          />

          <Divider label="Change password" labelPosition="left" my={4} />

          <PasswordInput
            label="New password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            placeholder="Leave blank to keep current"
          />
          <PasswordInput
            label="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.currentTarget.value)}
            placeholder="Repeat new password"
          />

          <Group mt={4}>
            <Button onClick={handleSave} loading={updateMe.isPending}>
              Save changes
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
