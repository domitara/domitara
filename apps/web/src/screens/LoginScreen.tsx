import { useState } from 'react';
import { Paper, Title, Text, TextInput, PasswordInput, Button, Stack, Alert } from '@mantine/core';
import { IconUser, IconLock, IconAlertCircle } from '@tabler/icons-react';
import { AppIcon } from '../components/AppIcon';

interface LoginScreenProps {
  onLogin: (token: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ error: 'Login failed.' }));
        setError(data.error ?? 'Login failed.');
        return;
      }
      const data = await resp.json() as { token: string };
      onLogin(data.token);
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
        p={28}
        radius="md"
        w={460}
        maw="95vw"
        style={{ borderTop: '4px solid var(--dt-blue-6)' }}
      >
        <Stack align="center" mb={22} gap={8}>
          <AppIcon size={40}/>
          <Title order={2} ta="center">Welcome to Domitara</Title>
          <Text c="dimmed" size="sm">Sign in to your inventory</Text>
        </Stack>

        <form onSubmit={handleSubmit}>
          <Stack gap={14}>
            {error && (
              <Alert icon={<IconAlertCircle size={16}/>} color="red" variant="light" p={10}>
                {error}
              </Alert>
            )}
            <TextInput
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.currentTarget.value)}
              leftSection={<IconUser size={16}/>}
              required
            />
            <PasswordInput
              label="Password"
              value={password}
              onChange={e => setPassword(e.currentTarget.value)}
              leftSection={<IconLock size={16}/>}
              required
            />
            <Button type="submit" fullWidth mt={4} loading={loading}>
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </div>
  );
}
