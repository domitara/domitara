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
import { useCreateSchedule, useUpdateSchedule, useItems } from '../api/queries';
import type { MaintenanceSchedule, FrequencyUnit } from '../api/types';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const UNIT_OPTIONS = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

interface Props {
  opened: boolean;
  onClose: () => void;
  editing?: MaintenanceSchedule;
}

export function MaintenanceScheduleModal({ opened, onClose, editing }: Props) {
  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const { data: items = [] } = useItems();

  const [title, setTitle] = useState('');
  const [itemId, setItemId] = useState<string | null>(null);
  const [freqValue, setFreqValue] = useState<number | string>(3);
  const [freqUnit, setFreqUnit] = useState<FrequencyUnit>('months');
  const [nextDueAt, setNextDueAt] = useState(todayISO());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (opened) {
      setTitle(editing?.title ?? '');
      setItemId(editing?.item_id ?? null);
      setFreqValue(editing?.frequency_value ?? 3);
      setFreqUnit(editing?.frequency_unit ?? 'months');
      setNextDueAt(editing?.next_due_at ?? todayISO());
      setNotes(editing?.notes ?? '');
    }
  }, [opened, editing]);

  const isPending = create.isPending || update.isPending;

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    if (!title.trim() || !freqValue) return;
    const body = {
      title: title.trim(),
      item_id: itemId ?? undefined,
      notes: notes.trim() || undefined,
      frequency_value: Number(freqValue),
      frequency_unit: freqUnit,
      next_due_at: nextDueAt || undefined,
    };
    if (editing) {
      update.mutate(
        { id: editing.id, body: { ...body, next_due_at: nextDueAt } },
        { onSuccess: handleClose }
      );
    } else {
      create.mutate(body, { onSuccess: handleClose });
    }
  };

  const itemOptions = items.map((it) => ({ value: it.id, label: it.name }));
  const isValid = title.trim().length > 0 && Number(freqValue) >= 1;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={editing ? 'Edit schedule' : 'Add maintenance schedule'}
      size="md"
    >
      <Stack gap={12}>
        <TextInput
          label="What needs to be done"
          placeholder="e.g. Oil change, HVAC filter, smoke detector batteries…"
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
        <Group grow align="flex-end">
          <NumberInput
            label="Every"
            min={1}
            max={999}
            required
            value={freqValue}
            onChange={setFreqValue}
          />
          <Select
            label="Unit"
            data={UNIT_OPTIONS}
            value={freqUnit}
            onChange={(v) => setFreqUnit((v as FrequencyUnit) ?? 'months')}
            allowDeselect={false}
          />
        </Group>
        <TextInput
          label="Next due date"
          type="date"
          value={nextDueAt}
          onChange={(e) => setNextDueAt(e.currentTarget.value)}
        />
        <Textarea
          label="Notes"
          placeholder="Additional details…"
          autosize
          minRows={2}
          maxRows={4}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />
        <Group justify="flex-end" mt={4}>
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isPending} disabled={!isValid}>
            {editing ? 'Save changes' : 'Add schedule'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
