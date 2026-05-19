import { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  TextInput,
  Textarea,
  Select,
  MultiSelect,
  NumberInput,
  Switch,
  Collapse,
  SegmentedControl,
  SimpleGrid,
  Alert,
  ActionIcon,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronRight,
  IconUpload,
  IconPlus,
  IconX,
  IconAlertCircle,
  IconRefresh,
} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import {
  useLocations,
  useLabels,
  useCreateLocation,
  useCreateLabel,
  useCreateItem,
} from '../api/queries';
import { getLocationChain } from '../utils';

function generateAssetId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'DT-';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

const LABEL_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#64748b',
];

const linkBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  marginTop: 6,
  padding: '2px 0',
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 12,
  color: 'var(--dt-blue-7)',
  fontWeight: 500,
};

export function AddItemScreen() {
  const navigate = useNavigate();

  const { data: locations = [] } = useLocations();
  const { data: labels = [] } = useLabels();
  const createItem = useCreateItem();
  const createLocation = useCreateLocation();
  const createLabel = useCreateLabel();

  // Basics
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Organization
  const [locationId, setLocationId] = useState<string | null>(null);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [status, setStatus] = useState<'owned' | 'loaned' | 'missing'>('owned');

  // Product details
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);

  // Purchase & value
  const [purchasePrice, setPurchasePrice] = useState<number | string>('');
  const [purchasedAt, setPurchasedAt] = useState('');
  const [warranty, setWarranty] = useState('');
  const [insured, setInsured] = useState(false);

  // Asset ID
  const [assetId, setAssetId] = useState(() => generateAssetId());

  // Notes
  const [notes, setNotes] = useState('');

  // Collapsible sections
  const [showDetails, setShowDetails] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Inline create — location
  const [showNewLoc, setShowNewLoc] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocParent, setNewLocParent] = useState<string | null>(null);

  // Inline create — label
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);

  // Validation / error
  const [nameError, setNameError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const locationOptions = locations.map((loc) => {
    const chain = getLocationChain(locations, loc.id);
    return { value: loc.id, label: chain.map((l) => l.name).join(' › ') };
  });

  const labelOptions = labels.map((l) => ({ value: l.id, label: l.name, color: l.color }));

  async function handleCreateLocation() {
    if (!newLocName.trim()) return;
    try {
      const loc = await createLocation.mutateAsync({
        name: newLocName.trim(),
        parent_id: newLocParent ?? undefined,
      });
      setLocationId(loc.id);
      setShowNewLoc(false);
      setNewLocName('');
      setNewLocParent(null);
    } catch {
      // location create errors surface in the mutation's error state
    }
  }

  async function handleCreateLabel() {
    if (!newLabelName.trim()) return;
    try {
      const label = await createLabel.mutateAsync({
        name: newLabelName.trim(),
        color: newLabelColor,
      });
      setLabelIds((prev) => [...prev, label.id]);
      setShowNewLabel(false);
      setNewLabelName('');
      setNewLabelColor(LABEL_COLORS[0]);
    } catch {
      // label create errors surface in the mutation's error state
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    setNameError('');
    setSubmitError('');
    try {
      const item = await createItem.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        location_id: locationId ?? undefined,
        status,
        manufacturer: manufacturer.trim() || undefined,
        model: model.trim() || undefined,
        serial: serial.trim() || undefined,
        purchase_price: typeof purchasePrice === 'number' ? purchasePrice : undefined,
        purchased_at: purchasedAt || undefined,
        warranty: warranty.trim() || undefined,
        insured,
        notes: notes.trim() || undefined,
        asset_id: assetId.trim() || null,
        label_ids: labelIds,
      });
      navigate({ to: '/items/$itemId', params: { itemId: item.id } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save item. Please try again.';
      setSubmitError(msg);
    }
  }

  return (
    <Stack gap={14}>
      {/* Breadcrumb */}
      <Group gap={4} style={{ fontSize: 13, color: 'var(--dt-fg-3)' }}>
        <button
          style={{
            background: 'none',
            border: 0,
            cursor: 'pointer',
            color: 'var(--dt-fg-2)',
            fontSize: 13,
          }}
          onClick={() => navigate({ to: '/items' })}
        >
          All items
        </button>
        <span>/</span>
        <span style={{ color: 'var(--dt-fg-1)', fontWeight: 500 }}>Add item</span>
      </Group>

      {/* Title + top actions */}
      <Group justify="space-between" align="flex-start">
        <Title order={1} style={{ fontSize: '1.75rem' }}>
          Add item
        </Title>
        <Group gap={8}>
          <Button variant="default" onClick={() => navigate({ to: '/items' })}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={createItem.isPending}>
            Save item
          </Button>
        </Group>
      </Group>

      {submitError && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          {submitError}
        </Alert>
      )}

      {/* ── BASICS ─────────────────────────────────────────────── */}
      <Paper withBorder p={20} radius="md">
        <Text fw={700} size="xs" tt="uppercase" lts="0.06em" c="dimmed" mb={14}>
          Basics
        </Text>
        <Stack gap={14}>
          <TextInput
            label="Name"
            required
            placeholder="e.g. KitchenAid Stand Mixer"
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value);
              if (nameError) setNameError('');
            }}
            error={nameError}
          />
          <Textarea
            label="Description"
            placeholder="What is it? Any helpful context…"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <TextInput
            label="Asset ID"
            placeholder="e.g. DT-A1B2C3"
            value={assetId}
            onChange={(e) => setAssetId(e.currentTarget.value)}
            classNames={{ input: 'mono' }}
            rightSection={
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setAssetId(generateAssetId())}
              >
                <IconRefresh size={14} />
              </ActionIcon>
            }
          />
          <div>
            <Text size="sm" fw={500} mb={6}>
              Photos
            </Text>
            <div
              style={{
                padding: '28px 16px',
                textAlign: 'center',
                border: '2px dashed var(--dt-border)',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                background: 'var(--dt-gray-0)',
              }}
            >
              <IconUpload size={24} color="var(--dt-gray-5)" />
              <Text size="sm" fw={600}>
                Add photos
              </Text>
              <Text size="xs" c="dimmed">
                Drag & drop or click to upload · JPG, PNG up to 10 MB
              </Text>
            </div>
          </div>
        </Stack>
      </Paper>

      {/* ── ORGANIZATION ───────────────────────────────────────── */}
      <Paper withBorder p={20} radius="md">
        <Text fw={700} size="xs" tt="uppercase" lts="0.06em" c="dimmed" mb={14}>
          Organization
        </Text>
        <Stack gap={14}>
          {/* Location */}
          <div>
            <Select
              label="Location"
              placeholder="Where is this stored?"
              searchable
              clearable
              data={locationOptions}
              value={locationId}
              onChange={setLocationId}
            />
            {!showNewLoc ? (
              <button type="button" style={linkBtnStyle} onClick={() => setShowNewLoc(true)}>
                <IconPlus size={12} />
                New location
              </button>
            ) : (
              <Paper
                withBorder
                p={12}
                mt={8}
                radius="sm"
                style={{ background: 'var(--dt-gray-0)' }}
              >
                <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={10}>
                  New location
                </Text>
                <Group gap={8} align="flex-end">
                  <TextInput
                    label="Name"
                    placeholder="e.g. Garage · Shelf A"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.currentTarget.value)}
                    style={{ flex: 1 }}
                    size="sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateLocation()}
                  />
                  <Select
                    label="Parent (optional)"
                    placeholder="Top-level"
                    clearable
                    searchable
                    data={locationOptions}
                    value={newLocParent}
                    onChange={setNewLocParent}
                    style={{ flex: 1 }}
                    size="sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateLocation}
                    loading={createLocation.isPending}
                    mb={1}
                  >
                    Create
                  </Button>
                  <ActionIcon
                    variant="default"
                    size={36}
                    mb={1}
                    onClick={() => {
                      setShowNewLoc(false);
                      setNewLocName('');
                      setNewLocParent(null);
                    }}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                </Group>
              </Paper>
            )}
          </div>

          {/* Labels */}
          <div>
            <MultiSelect
              label="Labels"
              placeholder={labelIds.length === 0 ? 'Add labels…' : undefined}
              searchable
              data={labelOptions}
              value={labelIds}
              onChange={setLabelIds}
              renderOption={({ option }) => (
                <Group gap={8}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: (option as { value: string; label: string; color: string }).color,
                      flexShrink: 0,
                    }}
                  />
                  {option.label}
                </Group>
              )}
            />
            {!showNewLabel ? (
              <button type="button" style={linkBtnStyle} onClick={() => setShowNewLabel(true)}>
                <IconPlus size={12} />
                New label
              </button>
            ) : (
              <Paper
                withBorder
                p={12}
                mt={8}
                radius="sm"
                style={{ background: 'var(--dt-gray-0)' }}
              >
                <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={10}>
                  New label
                </Text>
                <Stack gap={10}>
                  <TextInput
                    label="Name"
                    placeholder="e.g. Electronics"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.currentTarget.value)}
                    size="sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
                  />
                  <div>
                    <Text size="xs" fw={500} mb={6}>
                      Color
                    </Text>
                    <Group gap={6}>
                      {LABEL_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewLabelColor(color)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: color,
                            border:
                              newLabelColor === color
                                ? '2px solid var(--dt-bg)'
                                : '2px solid transparent',
                            outline: newLabelColor === color ? `2px solid ${color}` : 'none',
                            outlineOffset: 2,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        />
                      ))}
                    </Group>
                  </div>
                  <Group gap={8}>
                    <Button size="sm" onClick={handleCreateLabel} loading={createLabel.isPending}>
                      Create
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setShowNewLabel(false);
                        setNewLabelName('');
                        setNewLabelColor(LABEL_COLORS[0]);
                      }}
                    >
                      Cancel
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            )}
          </div>

          {/* Status */}
          <div>
            <Text component="label" size="sm" fw={500} mb={6} display="block">
              Status
            </Text>
            <SegmentedControl
              value={status}
              onChange={(v) => setStatus(v as typeof status)}
              data={[
                { value: 'owned', label: 'Owned' },
                { value: 'loaned', label: 'Loaned' },
                { value: 'missing', label: 'Missing' },
              ]}
            />
          </div>
        </Stack>
      </Paper>

      {/* ── PRODUCT DETAILS (collapsible) ──────────────────────── */}
      <Paper withBorder p={20} radius="md">
        <SectionHeader
          title="Product details"
          hint="Manufacturer, model, serial number, quantity"
          open={showDetails}
          onToggle={() => setShowDetails((p) => !p)}
        />
        <Collapse expanded={showDetails}>
          <Stack gap={14} mt={16}>
            <SimpleGrid cols={2} spacing={12}>
              <TextInput
                label="Manufacturer"
                placeholder="e.g. Sony"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.currentTarget.value)}
              />
              <TextInput
                label="Model"
                placeholder="e.g. WH-1000XM5"
                value={model}
                onChange={(e) => setModel(e.currentTarget.value)}
                classNames={{ input: 'mono' }}
              />
            </SimpleGrid>
            <SimpleGrid cols={2} spacing={12}>
              <TextInput
                label="Serial number"
                placeholder="e.g. SN-XXXXXXX"
                value={serial}
                onChange={(e) => setSerial(e.currentTarget.value)}
                classNames={{ input: 'mono' }}
              />
              <NumberInput label="Quantity" min={1} value={quantity} onChange={setQuantity} />
            </SimpleGrid>
          </Stack>
        </Collapse>
      </Paper>

      {/* ── PURCHASE & VALUE (collapsible) ─────────────────────── */}
      <Paper withBorder p={20} radius="md">
        <SectionHeader
          title="Purchase & value"
          hint="Price, purchase date, warranty, insurance"
          open={showPurchase}
          onToggle={() => setShowPurchase((p) => !p)}
        />
        <Collapse expanded={showPurchase}>
          <Stack gap={14} mt={16}>
            <SimpleGrid cols={2} spacing={12}>
              <NumberInput
                label="Purchase price"
                placeholder="0.00"
                decimalScale={2}
                fixedDecimalScale
                leftSection={
                  <Text size="sm" c="dimmed">
                    $
                  </Text>
                }
                value={purchasePrice}
                onChange={setPurchasePrice}
              />
              <TextInput
                label="Purchase date"
                type="date"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.currentTarget.value)}
              />
            </SimpleGrid>
            <TextInput
              label="Warranty"
              placeholder="e.g. 2 years · Expires Jan 2027"
              value={warranty}
              onChange={(e) => setWarranty(e.currentTarget.value)}
            />
            <Switch
              label="Insured"
              description="This item is covered by an insurance policy"
              checked={insured}
              onChange={(e) => setInsured(e.currentTarget.checked)}
            />
          </Stack>
        </Collapse>
      </Paper>

      {/* ── NOTES (collapsible) ────────────────────────────────── */}
      <Paper withBorder p={20} radius="md">
        <SectionHeader
          title="Notes"
          hint="Additional notes or reminders"
          open={showNotes}
          onToggle={() => setShowNotes((p) => !p)}
        />
        <Collapse expanded={showNotes}>
          <Textarea
            placeholder="Any extra notes about this item…"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            autosize
            minRows={3}
            mt={16}
          />
        </Collapse>
      </Paper>

      {/* Bottom actions */}
      <Group justify="flex-end" pb={32}>
        <Button variant="default" onClick={() => navigate({ to: '/items' })}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={createItem.isPending}>
          Save item
        </Button>
      </Group>
    </Stack>
  );
}

function SectionHeader({
  title,
  hint,
  open,
  onToggle,
}: {
  title: string;
  hint: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        background: 'none',
        border: 0,
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {open ? (
        <IconChevronDown size={16} color="var(--dt-fg-2)" style={{ flexShrink: 0 }} />
      ) : (
        <IconChevronRight size={16} color="var(--dt-fg-2)" style={{ flexShrink: 0 }} />
      )}
      <div>
        <Text fw={600} size="sm">
          {title}
        </Text>
        {!open && (
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        )}
      </div>
    </button>
  );
}
