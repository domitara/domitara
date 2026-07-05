import { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Paper,
  Button,
  ActionIcon,
  TextInput,
  NumberInput,
  Select,
  Modal,
  Badge,
  Center,
  Loader,
  ScrollArea,
  ColorInput,
} from '@mantine/core';
import { IconBolt, IconPlus, IconTrash, IconPrinter } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import type { SlotGeometry } from '@domitara/panel-core';
import type { ElectricalPanel, CreatePanelInput } from '../api/types';
import {
  usePanels,
  useCreatePanel,
  useDeletePanel,
  useBreakers,
  useFloorPlanAreas,
  useCreateFloorPlanArea,
  useDeleteFloorPlanArea,
} from '../api/queries';
import { PanelSVG } from '../components/PanelSVG';
import { BreakerDrawer } from '../components/BreakerDrawer';
import { PanelPrintView } from '../components/PanelPrintView';

// ---- Floor Plan Area Manager ----

function FloorPlanAreaManager({ homeId }: { homeId: string }) {
  const { data: areas = [], isLoading } = useFloorPlanAreas(homeId);
  const createArea = useCreateFloorPlanArea(homeId);
  const deleteArea = useDeleteFloorPlanArea(homeId);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError('');
    try {
      await createArea.mutateAsync({ name: name.trim(), color });
      setName('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (isLoading) return <Loader size="xs" />;

  return (
    <Paper p="md" withBorder radius="md">
      <Text fw={600} size="sm" mb="sm">
        Floor plan areas
      </Text>
      <Stack gap="xs">
        {areas.map((area) => (
          <Group key={area.id} justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  backgroundColor: area.color,
                  flexShrink: 0,
                }}
              />
              <Text size="sm" truncate style={{ maxWidth: 180 }}>
                {area.name}
              </Text>
            </Group>
            <ActionIcon
              color="red"
              variant="subtle"
              size="sm"
              onClick={() =>
                modals.openConfirmModal({
                  title: 'Delete floor plan area',
                  children: (
                    <Text size="sm">
                      Are you sure you want to delete <strong>{area.name}</strong>? This cannot be
                      undone.
                    </Text>
                  ),
                  labels: { confirm: 'Delete', cancel: 'Cancel' },
                  confirmProps: { color: 'red' },
                  onConfirm: () => deleteArea.mutate(area.id),
                })
              }
            >
              <IconTrash size={13} />
            </ActionIcon>
          </Group>
        ))}

        <Group gap="xs" mt="xs" wrap="nowrap">
          <ColorInput value={color} onChange={setColor} size="xs" w={90} withEyeDropper={false} />
          <TextInput
            placeholder="Area name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            size="xs"
            style={{ flex: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
          />
          <Button size="xs" onClick={() => void handleCreate()} loading={createArea.isPending}>
            Add
          </Button>
        </Group>
        {error && (
          <Text c="red" size="xs">
            {error}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

// ---- Add Panel Modal ----

interface AddPanelModalProps {
  homeId: string;
  panels: ElectricalPanel[];
  opened: boolean;
  onClose: () => void;
}

function AddPanelModal({ homeId, panels, opened, onClose }: AddPanelModalProps) {
  const createPanel = useCreatePanel(homeId);
  const [name, setName] = useState('');
  const [totalAmps, setTotalAmps] = useState<number | string>(200);
  const [totalSlots, setTotalSlots] = useState<number | string>('');
  const [locationNote, setLocationNote] = useState('');
  const [parentPanelId, setParentPanelId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError('');
    try {
      const body: CreatePanelInput = {
        name: name.trim(),
        total_amps: Number(totalAmps) || 200,
        total_slots: totalSlots ? Number(totalSlots) : undefined,
        location_note: locationNote || undefined,
        parent_panel_id: parentPanelId ?? undefined,
        sort_order: panels.length,
      };
      await createPanel.mutateAsync(body);
      setName('');
      setTotalAmps(200);
      setTotalSlots('');
      setLocationNote('');
      setParentPanelId(null);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const parentOptions = panels.map((p) => ({ value: p.id, label: p.name }));

  return (
    <Modal opened={opened} onClose={onClose} title="Add electrical panel" size="md">
      <Stack gap="md">
        <TextInput
          label="Panel name"
          placeholder="Main Panel"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />
        <Group grow>
          <NumberInput
            label="Total amps"
            value={totalAmps}
            onChange={setTotalAmps}
            min={60}
            max={400}
          />
          <NumberInput
            label="Total slots (optional)"
            placeholder="Auto"
            value={totalSlots}
            onChange={setTotalSlots}
            min={4}
            max={84}
          />
        </Group>
        <TextInput
          label="Location note"
          placeholder="Basement utility room"
          value={locationNote}
          onChange={(e) => setLocationNote(e.currentTarget.value)}
        />
        {panels.length > 0 && (
          <Select
            label="Parent panel (if subpanel)"
            data={parentOptions}
            value={parentPanelId}
            onChange={setParentPanelId}
            clearable
            placeholder="— None (main panel) —"
          />
        )}
        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleCreate()} loading={createPanel.isPending}>
            Create panel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ---- Main Electrical Panels Tab ----

export function ElectricalPanelsTab({ homeId, homeName }: { homeId: string; homeName: string }) {
  const { data: panels = [], isLoading: panelsLoading } = usePanels(homeId);
  const { data: areas = [] } = useFloorPlanAreas(homeId);
  const deletePanel = useDeletePanel(homeId);

  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotGeometry | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const [panelToDelete, setPanelToDelete] = useState<ElectricalPanel | null>(null);

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? panels[0] ?? null;
  const { data: breakers = [], isLoading: breakersLoading } = useBreakers(selectedPanel?.id ?? '');

  if (panelsLoading)
    return (
      <Center p="xl">
        <Loader />
      </Center>
    );

  if (panels.length === 0) {
    return (
      <Center p="xl">
        <Stack align="center" gap="md">
          <IconBolt size={48} color="var(--dt-fg-3)" />
          <Text c="dimmed">No electrical panels yet.</Text>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setAddPanelOpen(true)}>
            Add panel
          </Button>
          <AddPanelModal
            homeId={homeId}
            panels={panels}
            opened={addPanelOpen}
            onClose={() => setAddPanelOpen(false)}
          />
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="xl">
      {/* Panel selector */}
      <Group gap="sm" wrap="wrap">
        {panels.map((p) => (
          <Paper
            key={p.id}
            p="sm"
            withBorder
            radius="md"
            style={{
              cursor: 'pointer',
              borderColor:
                (selectedPanel?.id ?? panels[0]?.id) === p.id
                  ? 'var(--mantine-color-blue-6)'
                  : undefined,
              minWidth: 140,
            }}
            onClick={() => setSelectedPanelId(p.id)}
          >
            <Group justify="space-between" wrap="nowrap">
              <Stack gap={2}>
                <Text size="sm" fw={600}>
                  {p.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {p.total_amps}A · {p.total_slots} slots
                </Text>
                {p.parent_panel_id && (
                  <Badge size="xs" variant="outline" color="gray">
                    subpanel
                  </Badge>
                )}
              </Stack>
              <ActionIcon
                color="red"
                variant="subtle"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setPanelToDelete(p);
                }}
              >
                <IconTrash size={12} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}
        <Button
          leftSection={<IconPlus size={14} />}
          variant="light"
          size="sm"
          onClick={() => setAddPanelOpen(true)}
        >
          Add panel
        </Button>
      </Group>

      {selectedPanel && (
        <>
          {/* Panel actions */}
          <Group justify="space-between">
            <Stack gap={2}>
              <Text fw={600}>{selectedPanel.name}</Text>
              {selectedPanel.location_note && (
                <Text size="xs" c="dimmed">
                  {selectedPanel.location_note}
                </Text>
              )}
            </Stack>
            <Button
              leftSection={<IconPrinter size={15} />}
              variant="light"
              size="sm"
              onClick={() => setPrintOpen(true)}
            >
              Print directory
            </Button>
          </Group>

          {/* Panel SVG */}
          <ScrollArea>
            {breakersLoading ? (
              <Center p="xl">
                <Loader />
              </Center>
            ) : (
              <PanelSVG
                panel={selectedPanel}
                breakers={breakers}
                areas={areas}
                onSlotClick={setSelectedSlot}
                width={420}
              />
            )}
          </ScrollArea>

          {/* Floor plan area manager */}
          <FloorPlanAreaManager homeId={homeId} />
        </>
      )}

      {/* Modals / drawers */}
      <AddPanelModal
        homeId={homeId}
        panels={panels}
        opened={addPanelOpen}
        onClose={() => setAddPanelOpen(false)}
      />

      <BreakerDrawer
        panelId={selectedPanel?.id ?? ''}
        slot={selectedSlot}
        areas={areas}
        onClose={() => setSelectedSlot(null)}
      />

      <Modal
        opened={panelToDelete !== null}
        onClose={() => setPanelToDelete(null)}
        title="Delete panel"
        size="sm"
      >
        <Stack gap={16}>
          <Text size="sm">
            Are you sure you want to delete <strong>{panelToDelete?.name}</strong>? This cannot be
            undone.
          </Text>
          <Group justify="flex-end" gap={8}>
            <Button variant="default" onClick={() => setPanelToDelete(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={deletePanel.isPending}
              onClick={() => {
                if (!panelToDelete) return;
                deletePanel.mutate(panelToDelete.id, {
                  onSuccess: () => {
                    if (selectedPanelId === panelToDelete.id) setSelectedPanelId(null);
                    setPanelToDelete(null);
                  },
                });
              }}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {selectedPanel && (
        <Modal
          opened={printOpen}
          onClose={() => setPrintOpen(false)}
          title={`Print: ${selectedPanel.name}`}
          size="lg"
        >
          <PanelPrintView
            homeName={homeName}
            panel={selectedPanel}
            breakers={breakers}
            onPrint={() => window.print()}
          />
        </Modal>
      )}
    </Stack>
  );
}
