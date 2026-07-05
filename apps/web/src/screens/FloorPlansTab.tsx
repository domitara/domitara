import { useState, useRef } from 'react';
import {
  Stack,
  Group,
  Button,
  Text,
  Select,
  Switch,
  Center,
  Loader,
  Paper,
  SegmentedControl,
  FileButton,
} from '@mantine/core';
import { IconMap, IconUpload } from '@tabler/icons-react';
import {
  useHomeDocuments,
  useUploadHomeDocument,
  useFloorPlanAreas,
  useCreateFloorPlanArea,
  useUpdateFloorPlanArea,
  useDeleteFloorPlanArea,
  useFloorPlanShapes,
  useCreateFloorPlanShape,
  useUpdateFloorPlanShape,
  useDeleteFloorPlanShape,
  useUpdateDocumentFloorLevel,
} from '../api/queries';
import { useItems } from '../api/queries';
import { FloorPlanCanvas } from '../components/FloorPlanCanvas';
import type { FloorPlanGeometry } from '../api/types';

const FLOOR_LEVEL_OPTIONS = [
  { value: '0', label: 'Basement' },
  { value: '1', label: 'Floor 1' },
  { value: '2', label: 'Floor 2' },
  { value: '3', label: 'Floor 3' },
  { value: '4', label: 'Floor 4' },
];

function floorLabel(level: number | null): string {
  if (level === null) return 'Unassigned';
  return FLOOR_LEVEL_OPTIONS.find((o) => o.value === String(level))?.label ?? `Floor ${level}`;
}

export function FloorPlansTab({ homeId }: { homeId: string }) {
  const { data: allDocs = [], isLoading: docsLoading } = useHomeDocuments(homeId);
  const { data: zones = [], isLoading: zonesLoading } = useFloorPlanAreas(homeId);
  const { data: shapes = [], isLoading: shapesLoading } = useFloorPlanShapes(homeId);
  const { data: items = [] } = useItems();

  const upload = useUploadHomeDocument(homeId);
  const updateFloorLevel = useUpdateDocumentFloorLevel(homeId);

  const createZone = useCreateFloorPlanArea(homeId);
  const updateZone = useUpdateFloorPlanArea(homeId);
  const deleteZone = useDeleteFloorPlanArea(homeId);

  const createShape = useCreateFloorPlanShape(homeId);
  const updateShape = useUpdateFloorPlanShape(homeId);
  const deleteShape = useDeleteFloorPlanShape(homeId);

  const resetRef = useRef<() => void>(null);

  const floorPlanDocs = allDocs.filter((d) => d.document_type === 'floor_plan');

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [zonesVisible, setZonesVisible] = useState(true);
  const [shapesVisible, setShapesVisible] = useState(true);
  const [uploadError, setUploadError] = useState('');

  const activeDocId = selectedDocId ?? floorPlanDocs[0]?.id ?? null;
  const activeDoc = floorPlanDocs.find((d) => d.id === activeDocId) ?? null;

  const filteredZones = zones.filter((z) => z.document_id === activeDocId);
  const filteredShapes = shapes.filter((s) => s.document_id === activeDocId);

  const itemList = items.map((i) => ({ id: i.id, name: i.name }));

  const handleUpload = (file: File | null) => {
    if (!file) return;
    setUploadError('');
    upload.mutate(
      { file, documentType: 'floor_plan' },
      {
        onSuccess: () => resetRef.current?.(),
        onError: (err) => setUploadError((err as Error).message),
      }
    );
  };

  const isLoading = docsLoading || zonesLoading || shapesLoading;
  if (isLoading)
    return (
      <Center p="xl">
        <Loader />
      </Center>
    );

  if (floorPlanDocs.length === 0) {
    return (
      <Stack align="center" gap="md" p="xl">
        <IconMap size={48} color="var(--dt-fg-3)" />
        <Text c="dimmed">No floor plans uploaded yet.</Text>
        <FileButton
          resetRef={resetRef}
          onChange={handleUpload}
          accept="image/jpeg,image/png,image/webp"
        >
          {(props) => (
            <Button {...props} leftSection={<IconUpload size={16} />} loading={upload.isPending}>
              Upload Floor Plan
            </Button>
          )}
        </FileButton>
        {uploadError && (
          <Text c="red" size="sm">
            {uploadError}
          </Text>
        )}
      </Stack>
    );
  }

  // Build floor switcher segments (sort by floor_level, nulls last)
  const switcherDocs = [...floorPlanDocs].sort((a, b) => {
    if (a.floor_level === null && b.floor_level === null) return 0;
    if (a.floor_level === null) return 1;
    if (b.floor_level === null) return -1;
    return a.floor_level - b.floor_level;
  });

  const switcherData = switcherDocs.map((d) => ({
    value: d.id,
    label: floorLabel(d.floor_level),
  }));

  return (
    <Stack
      gap="md"
      style={{
        height: 'calc(100vh - var(--app-shell-header-height, 56px) - 150px)',
        minHeight: 400,
      }}
    >
      {/* Controls bar */}
      <Paper p="sm" withBorder radius="md">
        <Group gap="md" wrap="wrap" justify="space-between">
          <Group gap="md" wrap="wrap">
            {/* Floor switcher */}
            {switcherData.length > 1 && (
              <SegmentedControl
                size="xs"
                data={switcherData}
                value={activeDocId ?? switcherData[0]?.value}
                onChange={setSelectedDocId}
              />
            )}

            {/* Floor level selector for active document */}
            {activeDoc && (
              <Select
                size="xs"
                placeholder="Set floor level"
                data={[{ value: '', label: 'Unassigned' }, ...FLOOR_LEVEL_OPTIONS]}
                value={activeDoc.floor_level !== null ? String(activeDoc.floor_level) : ''}
                onChange={(v) =>
                  updateFloorLevel.mutate({
                    docId: activeDoc.id,
                    floorLevel: v ? Number(v) : null,
                  })
                }
                w={140}
              />
            )}
          </Group>

          <Group gap="md" wrap="wrap">
            {/* Layer toggles */}
            <Switch
              size="sm"
              label="Electrical Zones"
              checked={zonesVisible}
              onChange={(e) => setZonesVisible(e.currentTarget.checked)}
            />
            <Switch
              size="sm"
              label="Home Layout"
              checked={shapesVisible}
              onChange={(e) => setShapesVisible(e.currentTarget.checked)}
            />

            {/* Upload new floor plan */}
            <FileButton
              resetRef={resetRef}
              onChange={handleUpload}
              accept="image/jpeg,image/png,image/webp"
            >
              {(props) => (
                <Button
                  {...props}
                  size="xs"
                  leftSection={<IconUpload size={14} />}
                  loading={upload.isPending}
                  variant="light"
                >
                  Upload Floor Plan
                </Button>
              )}
            </FileButton>
          </Group>
        </Group>
        {uploadError && (
          <Text c="red" size="sm" mt={4}>
            {uploadError}
          </Text>
        )}
      </Paper>

      {/* Canvas */}
      {activeDoc && (
        <FloorPlanCanvas
          imageUrl={activeDoc.url}
          zones={filteredZones}
          shapes={filteredShapes}
          items={itemList}
          zonesVisible={zonesVisible}
          shapesVisible={shapesVisible}
          onCreateZone={(name, color, geometry) => {
            createZone.mutate({ name, color, geometry, document_id: activeDocId ?? undefined });
          }}
          onUpdateZone={(id, geometry) => {
            const zone = zones.find((z) => z.id === id);
            if (!zone) return;
            updateZone.mutate({ id, body: { name: zone.name, color: zone.color, geometry } });
          }}
          onDeleteZone={(id) => deleteZone.mutate(id)}
          onCreateShape={(label, color, itemId, geometry) => {
            createShape.mutate({
              document_id: activeDocId ?? undefined,
              item_id: itemId ?? undefined,
              label: label ?? undefined,
              color,
              geometry,
            });
          }}
          onUpdateShape={(id, geometry: FloorPlanGeometry) => {
            const shape = shapes.find((s) => s.id === id);
            if (!shape) return;
            updateShape.mutate({
              id,
              body: {
                document_id: shape.document_id ?? undefined,
                item_id: shape.item_id ?? undefined,
                label: shape.label ?? undefined,
                color: shape.color,
                geometry,
              },
            });
          }}
          onDeleteShape={(id) => deleteShape.mutate(id)}
        />
      )}
    </Stack>
  );
}
