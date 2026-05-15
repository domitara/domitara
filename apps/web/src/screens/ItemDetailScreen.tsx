import { Paper, Title, Text, Button, Group, Stack, ActionIcon, Tabs, Loader, Center } from '@mantine/core';
import {
  IconPrinter, IconEdit, IconDotsVertical, IconBox, IconChevronLeft, IconChevronRight,
  IconCamera, IconMapPin, IconShield, IconPlus, IconDownload, IconUpload, IconFile,
} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useItem, useLabels, useLocations, useMaintenance } from '../api/queries';
import { getLocationChain, formatCurrency, formatDate } from '../utils';
import { StatusBadge } from './AllItemsScreen';

interface ItemDetailScreenProps {
  itemId: string;
}

export function ItemDetailScreen({ itemId }: ItemDetailScreenProps) {
  const navigate = useNavigate();
  const { data: item, isLoading } = useItem(itemId);
  const { data: locations = [] } = useLocations();
  const { data: labels = [] } = useLabels();
  const { data: maintenance = [] } = useMaintenance(itemId);

  if (isLoading) return <Center h={200}><Loader/></Center>;
  if (!item) return <Text c="dimmed" ta="center" mt={32}>Item not found.</Text>;

  const chain = item.location_id ? getLocationChain(locations, item.location_id) : [];

  return (
    <Stack gap={14}>
      <Group gap={4} style={{ fontSize: 13, color: 'var(--dt-fg-3)' }}>
        <button style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--dt-fg-2)', fontSize: 13 }} onClick={() => navigate({ to: '/items' })}>All items</button>
        <span>/</span>
        <span style={{ color: 'var(--dt-fg-1)', fontWeight: 500 }}>{item.name}</span>
      </Group>

      <Group justify="space-between">
        <Title order={1} style={{ fontSize: "1.75rem" }}>{item.name}</Title>
        <Group gap={8}>
          <Button variant="default" size="sm" leftSection={<IconPrinter size={14}/>}>Print label</Button>
          <Button variant="default" size="sm" leftSection={<IconEdit size={14}/>}>Edit</Button>
          <ActionIcon variant="default" size="lg"><IconDotsVertical size={16}/></ActionIcon>
        </Group>
      </Group>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <Stack gap={12}>
          <Paper withBorder radius="md" style={{ overflow: 'hidden', aspectRatio: '4/3' }}>
            <div className="item-card-thumb ph-1" style={{ width: '100%', height: '100%', borderRadius: 0 }}>
              <IconBox size={56} color="rgba(255,255,255,.6)"/>
            </div>
          </Paper>
          <Group gap={6} justify="center">
            <ActionIcon variant="default" size="md"><IconChevronLeft size={16}/></ActionIcon>
            <Text size="xs" c="dimmed">No photos</Text>
            <ActionIcon variant="default" size="md"><IconChevronRight size={16}/></ActionIcon>
            <Button variant="light" size="xs" leftSection={<IconCamera size={12}/>} ml={8}>Add photo</Button>
          </Group>

          {item.asset_id && (
            <Paper withBorder p={16} radius="md">
              <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={8}>Asset ID</Text>
              <span className="qr-pill">{item.asset_id}</span>
            </Paper>
          )}

          <Paper withBorder p={16} radius="md">
            <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={8}>Quick facts</Text>
            <FactRow label="Status" value={<StatusBadge status={item.status}/>}/>
            <FactRow label="Location" value={
              chain.length > 0 ? (
                <Group gap={4}>
                  <IconMapPin size={14} color="var(--dt-fg-3)"/>
                  <Text size="sm">
                    {chain.map((c, i) => (
                      <span key={c.id}>
                        {i > 0 && <span style={{ color: 'var(--dt-fg-3)' }}> · </span>}
                        <a href="#" style={{ color: 'var(--dt-blue-7)' }} onClick={e => { e.preventDefault(); navigate({ to: '/locations/$locationId', params: { locationId: c.id } }); }}>{c.name}</a>
                      </span>
                    ))}
                  </Text>
                </Group>
              ) : <Text size="sm" c="dimmed">—</Text>
            }/>
            <FactRow label="Insured" value={
              item.insured
                ? <Group gap={4} style={{ color: '#099268' }}><IconShield size={14}/>Yes</Group>
                : <Text size="sm" c="dimmed">No</Text>
            }/>
            <FactRow label="Purchased" value={<Text size="sm">{formatDate(item.purchased_at)}</Text>}/>
            <FactRow label="Value" value={<Text size="sm" className="mono">{formatCurrency(item.purchase_price)}</Text>}/>
          </Paper>
        </Stack>

        <Paper withBorder p={16} radius="md">
          <Tabs defaultValue="overview">
            <Tabs.List mb={16}>
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="documents">Documents</Tabs.Tab>
              <Tabs.Tab value="maintenance">Maintenance</Tabs.Tab>
              <Tabs.Tab value="history">History</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview">
              <Stack gap={18}>
                <div>
                  <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={6}>Description</Text>
                  <Text size="sm">{item.description ?? <span style={{ color: 'var(--dt-fg-3)' }}>No description yet.</span>}</Text>
                </div>
                <div>
                  <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={8}>Labels</Text>
                  <Group gap={6} wrap="wrap">
                    {item.label_ids.map(lid => {
                      const l = labels.find(x => x.id === lid);
                      return l ? (
                        <span key={lid} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', border: '1px solid var(--dt-border)', borderRadius: 6, fontSize: 12, color: 'var(--dt-fg-2)' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }}/>{l.name}
                        </span>
                      ) : null;
                    })}
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', border: '1px dashed var(--dt-border)', borderRadius: 6, fontSize: 12, color: 'var(--dt-fg-3)', background: 'transparent', cursor: 'pointer' }}>
                      <IconPlus size={12}/>Add label
                    </button>
                  </Group>
                </div>
                <div>
                  <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={8}>Details</Text>
                  <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', rowGap: 8, columnGap: 16, fontSize: 13 }}>
                    <Text size="sm" c="dimmed">Manufacturer</Text><Text size="sm">{item.manufacturer ?? '—'}</Text>
                    <Text size="sm" c="dimmed">Model</Text><Text size="sm" className="mono">{item.model ?? '—'}</Text>
                    <Text size="sm" c="dimmed">Serial number</Text><Text size="sm" className="mono">{item.serial ?? '—'}</Text>
                    <Text size="sm" c="dimmed">Warranty</Text><Text size="sm">{item.warranty ?? '—'}</Text>
                    <Text size="sm" c="dimmed">Purchase price</Text><Text size="sm" className="mono">{formatCurrency(item.purchase_price)}</Text>
                    <Text size="sm" c="dimmed">Quantity</Text><Text size="sm">1</Text>
                  </div>
                </div>
                {item.notes && (
                  <div>
                    <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={6}>Notes</Text>
                    <div style={{ padding: 10, background: 'var(--dt-warn-bg)', borderRadius: 6, fontSize: 13, border: '1px solid #fab00533' }}>{item.notes}</div>
                  </div>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="documents">
              <div style={{ padding: 32, textAlign: 'center', border: '1px dashed var(--dt-border)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <IconUpload size={28} color="var(--dt-gray-5)"/>
                <Text size="sm" fw={600}>Drop files here</Text>
                <Text size="xs" c="dimmed">PDF, JPG, PNG up to 10 MB.</Text>
              </div>
            </Tabs.Panel>

            <Tabs.Panel value="maintenance">
              <Stack gap={10}>
                <Group gap={8}>
                  <Button size="sm" leftSection={<IconPlus size={14}/>}>Log maintenance</Button>
                </Group>
                {maintenance.length === 0 ? (
                  <Text size="sm" c="dimmed">No maintenance logs yet.</Text>
                ) : maintenance.map(m => (
                  <Group key={m.id} align="flex-start" gap={12} p={10} style={{ border: '1px solid var(--dt-border)', borderRadius: 6 }}>
                    <Text size="xs" className="mono" c="dimmed" style={{ width: 90, paddingTop: 2 }}>{m.performed_at}</Text>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>{m.title}</Text>
                      {m.notes && <Text size="xs" c="dimmed" mt={2}>{m.notes}</Text>}
                    </div>
                    {m.cost != null && <Text size="xs" className="mono">{formatCurrency(m.cost)}</Text>}
                  </Group>
                ))}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="history">
              <Text size="sm" c="dimmed">Activity history coming soon.</Text>
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </div>
    </Stack>
  );
}

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Group justify="space-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--dt-divider)', fontSize: 13 }}>
      <Text size="sm" c="dimmed">{label}</Text>
      <div>{value}</div>
    </Group>
  );
}
