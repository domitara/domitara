import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Group, Text, Table, Stack, Title, SegmentedControl } from '@mantine/core';
import { computeSlots } from '@domitara/panel-core';
import type { SlotGeometry } from '@domitara/panel-core';
import type { ElectricalPanel, ElectricalBreaker } from '../api/types';

interface PanelPrintViewProps {
  homeName: string;
  panel: ElectricalPanel;
  breakers: ElectricalBreaker[];
  onPrint: () => void;
}

function slotNum(slot: SlotGeometry): string {
  if (!slot.breaker && slot.state === 'blank') return String(slot.slot);
  if (slot.breaker?.breaker_type === 'double_pole') return `${slot.slot}–${slot.slot + 2}`;
  return String(slot.slot);
}

function slotDescription(slot: SlotGeometry): string {
  return slot.breaker?.label ?? (slot.state === 'blank' ? '' : '?');
}

function slotAmps(slot: SlotGeometry): string {
  return slot.breaker?.amps ? `${slot.breaker.amps}A` : '';
}

function slotFlags(slot: SlotGeometry): string {
  return [slot.breaker?.is_gfci ? 'GFCI' : '', slot.breaker?.is_afci ? 'AFCI' : '']
    .filter(Boolean)
    .join(' ');
}

export function PanelPrintView({ homeName, panel, breakers, onPrint }: PanelPrintViewProps) {
  const [layout, setLayout] = useState<'breaker' | 'straight'>('breaker');
  const slots = computeSlots(panel, breakers as Parameters<typeof computeSlots>[1]);
  const today = new Date().toLocaleDateString();

  const mainSlot = slots.find((s) => s.state === 'main');
  const gridSlots = slots.filter((s) => s.state !== 'main' && s.state !== 'double_pole_secondary');

  // --- Straight layout ---
  const straightRows = gridSlots.map((slot) => ({
    num: slotNum(slot),
    label: slotDescription(slot),
    amps: slotAmps(slot),
    flags: slotFlags(slot),
  }));

  // --- Breaker layout: pair slots by grid row ---
  const startRow = mainSlot ? 2 : 1;
  const maxRow = gridSlots.reduce((m, s) => Math.max(m, s.row + s.rowSpan - 1), startRow);

  // Pre-compute which rows are already covered by a multi-row span
  const leftSkip = new Set<number>();
  const rightSkip = new Set<number>();
  for (const slot of gridSlots) {
    if (slot.rowSpan > 1) {
      for (let i = 1; i < slot.rowSpan; i++) {
        if (slot.col === 'left') leftSkip.add(slot.row + i);
        else if (slot.col === 'right') rightSkip.add(slot.row + i);
      }
    }
  }

  const breakerRows: Array<{
    row: number;
    left: SlotGeometry | undefined;
    right: SlotGeometry | undefined;
  }> = [];
  for (let r = startRow; r <= maxRow; r++) {
    breakerRows.push({
      row: r,
      left: gridSlots.find((s) => s.col === 'left' && s.row === r),
      right: gridSlots.find((s) => s.col === 'right' && s.row === r),
    });
  }

  function makeCells(slot: SlotGeometry | undefined, span: number) {
    return (
      <>
        <Table.Td rowSpan={span}>{slot ? slotNum(slot) : ''}</Table.Td>
        <Table.Td rowSpan={span}>{slot ? slotDescription(slot) : ''}</Table.Td>
        <Table.Td rowSpan={span}>{slot ? slotAmps(slot) : ''}</Table.Td>
        <Table.Td rowSpan={span}>{slot ? slotFlags(slot) : ''}</Table.Td>
      </>
    );
  }

  const printContent = createPortal(
    <div className="print-portal" style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <Title order={4} mb={4}>
        {homeName}
      </Title>
      <Text fw={600} mb={2}>
        {panel.name} — {panel.total_amps}A
      </Text>
      {panel.location_note && (
        <Text size="xs" c="dimmed" mb={4}>
          {panel.location_note}
        </Text>
      )}
      <Text size="xs" c="dimmed" mb="sm">
        Printed {today}
      </Text>

      {layout === 'straight' ? (
        <Table striped withColumnBorders withTableBorder fz="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={48}>Slot</Table.Th>
              <Table.Th>Label</Table.Th>
              <Table.Th w={60}>Amps</Table.Th>
              <Table.Th w={80}>Protection</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {straightRows.map((row, i) => (
              <Table.Tr key={i}>
                <Table.Td>{row.num}</Table.Td>
                <Table.Td>{row.label}</Table.Td>
                <Table.Td>{row.amps}</Table.Td>
                <Table.Td>{row.flags}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Table withColumnBorders withTableBorder fz="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={40}>Slot</Table.Th>
              <Table.Th>Label (odd)</Table.Th>
              <Table.Th w={48}>Amps</Table.Th>
              <Table.Th w={60}>Prot.</Table.Th>
              <Table.Th w={6} style={{ padding: 0 }} />
              <Table.Th w={40}>Slot</Table.Th>
              <Table.Th>Label (even)</Table.Th>
              <Table.Th w={48}>Amps</Table.Th>
              <Table.Th w={60}>Prot.</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {mainSlot && (
              <Table.Tr>
                <Table.Td colSpan={9} style={{ textAlign: 'center', fontWeight: 600 }}>
                  {mainSlot.breaker?.label ?? 'Main'} — {mainSlot.breaker?.amps}A
                </Table.Td>
              </Table.Tr>
            )}
            {breakerRows.map(({ row, left, right }) => {
              const renderLeft = !leftSkip.has(row);
              const renderRight = !rightSkip.has(row);
              return (
                <Table.Tr key={row}>
                  {renderLeft && makeCells(left, left?.rowSpan ?? 1)}
                  <Table.Td style={{ backgroundColor: '#ddd', padding: 0 }} />
                  {renderRight && makeCells(right, right?.rowSpan ?? 1)}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </div>,
    document.body
  );

  return (
    <>
      {printContent}
      <Stack gap="md">
        <Group justify="space-between">
          <SegmentedControl
            value={layout}
            onChange={(v) => setLayout(v as 'breaker' | 'straight')}
            data={[
              { label: 'Panel layout', value: 'breaker' },
              { label: 'Sequential', value: 'straight' },
            ]}
          />
          <Button onClick={onPrint}>Open print dialog</Button>
        </Group>
      </Stack>
    </>
  );
}
