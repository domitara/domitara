import { Paper, Title, Text, Button, Group, ActionIcon, Loader, Center } from '@mantine/core';
import { IconPlus, IconDotsVertical } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useLabels } from '../api/queries';

export function LabelsScreen() {
  const navigate = useNavigate();
  const { data: labels = [], isLoading } = useLabels();

  if (isLoading) return <Center h={200}><Loader/></Center>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Group justify="space-between">
        <Title order={1} style={{ fontSize: "1.75rem" }}>Labels</Title>
        <Button size="sm" leftSection={<IconPlus size={14}/>}>New label</Button>
      </Group>

      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '14px 1.5fr 1fr 120px 60px', gap: 12, padding: '6px 12px', background: 'var(--dt-gray-1)', borderBottom: '1px solid var(--dt-border)', fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: 'var(--dt-fg-3)', letterSpacing: '.04em' }}>
          <span/><span>Label</span><span>Description</span><span>Items</span><span/>
        </div>
        {labels.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Text size="sm" c="dimmed">No labels yet. Create one to start tagging items.</Text>
          </div>
        ) : labels.map(l => (
          <div key={l.id}
            onClick={() => navigate({ to: '/labels/$labelId', params: { labelId: l.id } })}
            style={{ display: 'grid', gridTemplateColumns: '14px 1.5fr 1fr 120px 60px', gap: 12, alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--dt-divider)', cursor: 'pointer', fontSize: 13 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--dt-gray-0)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: l.color }}/>
            <Text size="sm" fw={500}>{l.name}</Text>
            <Text size="sm" c="dimmed">—</Text>
            <Text size="xs" className="mono">{l.item_count}</Text>
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={e => e.stopPropagation()}>
              <IconDotsVertical size={16}/>
            </ActionIcon>
          </div>
        ))}
      </Paper>
    </div>
  );
}
