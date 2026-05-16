import { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Stepper,
  Alert,
} from '@mantine/core';
import { IconUser, IconLock, IconMail, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { AppIcon } from '../components/AppIcon';

interface SetupScreenProps {
  onComplete: () => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [active, setActive] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/v1/system/setup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ error: 'Setup failed.' }));
        setError(data.error ?? 'Setup failed.');
        return;
      }
      setActive(1);
      setTimeout(() => onComplete(), 800);
    } catch {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Paper
        shadow="xl"
        p={32}
        radius="md"
        w={480}
        maw="95vw"
        style={{ borderTop: '4px solid var(--dt-blue-6)' }}
      >
        <Stack align="center" mb={28} gap={8}>
          <AppIcon size={48} />
          <Title order={2} ta="center">
            Welcome to Domitara
          </Title>
          <Text c="dimmed" size="sm" ta="center">
            Let's set up your instance. This only happens once.
          </Text>
        </Stack>

        <Stepper active={active} size="sm" mb={28}>
          <Stepper.Step label="Admin account" description="Create your account" />
          <Stepper.Step label="Done" description="Setup complete" icon={<IconCheck size={16} />} />
        </Stepper>

        {active === 0 && (
          <form onSubmit={handleSubmit}>
            <Stack gap={14}>
              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" p={10}>
                  {error}
                </Alert>
              )}
              <TextInput
                label="Your name"
                placeholder="Alex Reeves"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                leftSection={<IconUser size={16} />}
                required
              />
              <TextInput
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                leftSection={<IconMail size={16} />}
                required
              />
              <PasswordInput
                label="Password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                leftSection={<IconLock size={16} />}
                required
              />
              <PasswordInput
                label="Confirm password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.currentTarget.value)}
                leftSection={<IconLock size={16} />}
                required
              />
              <Button type="submit" fullWidth mt={4} loading={loading}>
                Create admin account
              </Button>
            </Stack>
          </form>
        )}

        {active === 1 && (
          <Stack align="center" gap={8} py={16}>
            <Text fw={600} c="green">
              Setup complete! Redirecting…
            </Text>
          </Stack>
        )}
      </Paper>
    </div>
  );
}
