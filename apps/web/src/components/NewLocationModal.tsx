import { useState } from 'react';
import { Modal, TextInput, Textarea, Select, Button, Group, Stack } from '@mantine/core';
import { useCreateLocation, useLocations } from '../api/queries';

interface Props {
  opened: boolean;
  onClose: () => void;
  defaultParentId?: string;
}

export function NewLocationModal({ opened, onClose, defaultParentId }: Props) {
  const { data: locations = [] } = useLocations();
  const create = useCreateLocation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string | null>(defaultParentId ?? null);

  const handleClose = () => {
    setName('');
    setDescription('');
    setParentId(defaultParentId ?? null);
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        parent_id: parentId ?? undefined,
      },
      { onSuccess: handleClose }
    );
  };

  const locationOptions = locations.map((l) => ({ value: l.id, label: l.name }));

  return (
    <Modal opened={opened} onClose={handleClose} title="New location" size="sm">
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
        <Group justify="flex-end" mt={4}>
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={create.isPending} disabled={!name.trim()}>
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
