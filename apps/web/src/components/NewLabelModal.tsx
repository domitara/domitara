import { useState } from 'react';
import { Modal, TextInput, ColorInput, Button, Group, Stack } from '@mantine/core';
import { useCreateLabel } from '../api/queries';

const SWATCHES = [
  '#e03131',
  '#f76707',
  '#f59f00',
  '#2f9e44',
  '#0c8599',
  '#1971c2',
  '#6741d9',
  '#c2255c',
  '#868e96',
];

interface Props {
  opened: boolean;
  onClose: () => void;
}

export function NewLabelModal({ opened, onClose }: Props) {
  const create = useCreateLabel();
  const [name, setName] = useState('');
  const [color, setColor] = useState(SWATCHES[0]);

  const handleClose = () => {
    setName('');
    setColor(SWATCHES[0]);
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    create.mutate({ name: name.trim(), color }, { onSuccess: handleClose });
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="New label" size="sm">
      <Stack gap={12}>
        <TextInput
          label="Name"
          placeholder="e.g. Electronics"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        <ColorInput
          label="Color"
          value={color}
          onChange={setColor}
          swatches={SWATCHES}
          swatchesPerRow={9}
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
