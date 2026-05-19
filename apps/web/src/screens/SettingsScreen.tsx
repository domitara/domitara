import { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  TextInput,
  Select,
  Divider,
} from '@mantine/core';

const SECTIONS = [
  'Account',
  'Appearance',
  'Currency & units',
  'Backups',
  'Integrations',
  'Danger zone',
];

export function SettingsScreen() {
  const [activeSection, setActiveSection] = useState('Account');

  return (
    <Stack gap={14}>
      <Title order={1} style={{ fontSize: '1.75rem' }}>
        Settings
      </Title>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        {/* Nav */}
        <Paper withBorder p={6} radius="md">
          {SECTIONS.map((s) => (
            <div
              key={s}
              onClick={() => setActiveSection(s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 14px',
                fontSize: 14,
                borderRadius: 6,
                cursor: 'pointer',
                background: activeSection === s ? 'var(--dt-blue-0)' : 'transparent',
                color: activeSection === s ? 'var(--dt-blue-8)' : 'var(--dt-fg-1)',
                fontWeight: activeSection === s ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (activeSection !== s) e.currentTarget.style.background = 'var(--dt-gray-1)';
              }}
              onMouseLeave={(e) => {
                if (activeSection !== s) e.currentTarget.style.background = 'transparent';
              }}
            >
              {s}
            </div>
          ))}
        </Paper>

        {/* Content */}
        <Paper withBorder p={24} radius="md">
          {activeSection === 'Account' && (
            <Stack gap={14} maw={480}>
              <Title order={2} style={{ fontSize: '1.375rem' }}>
                Account
              </Title>
              <Text c="dimmed" size="sm" mt={-8}>
                Your sign-in details and personal info.
              </Text>
              <TextInput label="Name" defaultValue="Alex Reeves" />
              <TextInput label="Email" type="email" defaultValue="alex@example.dev" />
              <Select
                label="Time zone"
                defaultValue="America/New_York"
                data={[
                  'America/New_York',
                  'America/Chicago',
                  'America/Denver',
                  'America/Los_Angeles',
                  'UTC',
                ]}
                description="Used for activity timestamps and maintenance schedules."
              />
              <Divider />
              <Group gap={8}>
                <Button>Save changes</Button>
                <Button variant="default">Cancel</Button>
              </Group>
            </Stack>
          )}
          {activeSection !== 'Account' && (
            <Stack align="center" gap={8} py={48}>
              <Text c="dimmed" size="sm">
                {activeSection} settings coming soon.
              </Text>
            </Stack>
          )}
        </Paper>
      </div>
    </Stack>
  );
}
