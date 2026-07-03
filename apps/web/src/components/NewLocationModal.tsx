import { useState } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Stack,
  SegmentedControl,
  NumberInput,
  Text,
} from '@mantine/core';
import { useCreateLocation, useUpdateLocation, useLocations } from '../api/queries';
import type { Location, LocationType } from '../api/types';

interface Props {
  opened: boolean;
  onClose: () => void;
  defaultParentId?: string;
  location?: Location;
}

export function NewLocationModal({ opened, onClose, defaultParentId, location }: Props) {
  const { data: locations = [] } = useLocations();
  const create = useCreateLocation();
  const update = useUpdateLocation();
  const isEdit = !!location;

  const [name, setName] = useState(location?.name ?? '');
  const [description, setDescription] = useState(location?.description ?? '');
  const [parentId, setParentId] = useState<string | null>(
    location?.parent_id ?? defaultParentId ?? null
  );
  const [locationType, setLocationType] = useState<LocationType>(location?.location_type ?? 'room');
  const [gridRows, setGridRows] = useState<number | string>(location?.grid_rows ?? '');
  const [gridCols, setGridCols] = useState<number | string>(location?.grid_cols ?? '');
  const [error, setError] = useState('');

  const mutation = isEdit ? update : create;

  const handleClose = () => {
    setName(location?.name ?? '');
    setDescription(location?.description ?? '');
    setParentId(location?.parent_id ?? defaultParentId ?? null);
    setLocationType(location?.location_type ?? 'room');
    setGridRows(location?.grid_rows ?? '');
    setGridCols(location?.grid_cols ?? '');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setError('');
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      parent_id: parentId ?? undefined,
      location_type: locationType,
      grid_rows:
        locationType === 'container' && typeof gridRows === 'number' ? gridRows : undefined,
      grid_cols:
        locationType === 'container' && typeof gridCols === 'number' ? gridCols : undefined,
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: location.id, body });
      } else {
        await create.mutateAsync(body);
      }
      handleClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save location. Please try again.');
    }
  };

  // A container can't be nested inside another container, and a location
  // can't be its own parent.
  const locationOptions = locations
    .filter((l) => l.location_type !== 'container' && l.id !== location?.id)
    .map((l) => ({ value: l.id, label: l.name }));

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={isEdit ? 'Edit location' : 'New location'}
      size="sm"
    >
      <Stack gap={12}>
        <TextInput
          label="Name"
          placeholder="e.g. Garage"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        <div>
          <Text size="sm" fw={500} mb={6}>
            Type
          </Text>
          <SegmentedControl
            value={locationType}
            onChange={(v) => setLocationType(v as LocationType)}
            data={[
              { value: 'room', label: 'Room' },
              { value: 'container', label: 'Container' },
            ]}
          />
          {locationType === 'container' && (
            <Text size="xs" c="dimmed" mt={4}>
              A container (e.g. a cabinet or drawer) can hold items directly, but can't have
              locations nested inside it.
            </Text>
          )}
        </div>
        {locationType === 'container' && (
          <Group grow>
            <NumberInput
              label="Grid rows"
              placeholder="Optional"
              min={1}
              value={gridRows}
              onChange={setGridRows}
            />
            <NumberInput
              label="Grid columns"
              placeholder="Optional"
              min={1}
              value={gridCols}
              onChange={setGridCols}
            />
          </Group>
        )}
        <Select
          label="Parent location"
          placeholder="None (top-level)"
          data={locationOptions}
          value={parentId}
          onChange={setParentId}
          clearable
          searchable
        />
        <Textarea
          label="Description"
          placeholder="Optional notes"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          rows={2}
        />
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Group justify="flex-end" mt={4}>
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={mutation.isPending} disabled={!name.trim()}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
