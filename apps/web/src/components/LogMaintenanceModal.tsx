import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Button,
  Group,
  Stack,
} from '@mantine/core';
import { useCreateMaintenance, useItems } from '../api/queries';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  opened: boolean;
  onClose: () => void;
  defaultItemId?: string;
  defaultTitle?: string;
  scheduleId?: string;
}

export function LogMaintenanceModal({
  opened,
  onClose,
  defaultItemId,
  defaultTitle,
  scheduleId,
}: Props) {
  const create = useCreateMaintenance();
  const { data: items = [] } = useItems();

  const [title, setTitle] = useState(defaultTitle ?? '');
  const [itemId, setItemId] = useState<string | null>(defaultItemId ?? null);
  const [date, setDate] = useState(todayISO());
  const [cost, setCost] = useState<number | string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (opened) {
      setTitle(defaultTitle ?? '');
      setItemId(defaultItemId ?? null);
      setDate(todayISO());
      setCost('');
      setNotes('');
    }
  }, [opened, defaultTitle, defaultItemId]);

  const handleClose = () => {
    setTitle(defaultTitle ?? '');
    setItemId(defaultItemId ?? null);
    setDate(todayISO());
    setCost('');
    setNotes('');
    onClose();
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    create.mutate(
      {
        title: title.trim(),
        item_id: itemId ?? undefined,
        schedule_id: scheduleId,
        notes: notes.trim() || undefined,
        cost: cost !== '' ? Number(cost) : undefined,
        performed_at: date || undefined,
      },
      { onSuccess: handleClose }
    );
  };

  const itemOptions = items.map((it) => ({ value: it.id, label: it.name }));

  return (
    <Modal opened={opened} onClose={handleClose} title="Log maintenance" size="md">
      <Stack gap={12}>
        <TextInput
          label="What was done"
          placeholder="e.g. Oil change, filter replaced…"
          required
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          autoFocus
        />
        <Select
          label="Item"
          placeholder="No specific item"
          clearable
          searchable
          data={itemOptions}
          value={itemId}
          onChange={setItemId}
        />
        <Group grow>
          <TextInput
            label="Date performed"
            type="date"
            value={date}
            onChange={(e) => setDate(e.currentTarget.value)}
            max={todayISO()}
          />
          <NumberInput
            label="Cost"
            placeholder="0.00"
            prefix="$"
            decimalScale={2}
            min={0}
            value={cost}
            onChange={setCost}
          />
        </Group>
        <Textarea
          label="Notes"
          placeholder="Additional details…"
          autosize
          minRows={2}
          maxRows={5}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />
        <Group justify="flex-end" mt={4}>
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={create.isPending} disabled={!title.trim()}>
            Save log
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
