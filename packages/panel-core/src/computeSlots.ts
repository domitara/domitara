import type { ElectricalPanel, ElectricalBreaker, SlotGeometry } from './types.js';

const AMPS_TO_DEFAULT_SLOTS: Record<number, number> = {
  100: 20,
  150: 30,
  200: 40,
  400: 84,
};

export function defaultSlotsForAmps(amps: number): number {
  return AMPS_TO_DEFAULT_SLOTS[amps] ?? 20;
}

/**
 * Computes render geometry for every slot in a panel (1..total_slots),
 * accounting for double-pole breakers, main breaker placement, and blank fill.
 *
 * Row numbering starts at 1. The main breaker (if any) occupies row 1 spanning
 * both columns. Regular breaker rows follow, each row hosting one left (odd)
 * and one right (even) slot.
 */
export function computeSlots(
  panel: Pick<ElectricalPanel, 'total_slots'>,
  breakers: ElectricalBreaker[],
): SlotGeometry[] {
  const breakerBySlot = new Map<number, ElectricalBreaker>();
  for (const b of breakers) {
    breakerBySlot.set(b.slot, b);
  }

  const mainBreaker = breakers.find((b) => b.breaker_type === 'main');

  const result: SlotGeometry[] = [];

  if (mainBreaker) {
    result.push({
      slot: mainBreaker.slot,
      col: 'full',
      row: 1,
      rowSpan: 1,
      state: 'main',
      breaker: mainBreaker,
      isUnlabeled: !mainBreaker.label,
    });
  }

  // Grid rows start after the main breaker row (or at 1 if no main)
  const gridBaseRow = mainBreaker ? 2 : 1;

  // Row is derived directly from the slot number (1&2 -> row 0, 3&4 -> row 1, ...)
  // so it stays correct even when a double-pole breaker consumes a slot out of
  // the normal left/right alternation.
  function rowForSlot(slot: number): number {
    return gridBaseRow + Math.floor((slot - 1) / 2);
  }

  // Track which slots have been rendered (secondary slot of a double-pole)
  const rendered = new Set<number>();
  if (mainBreaker) rendered.add(mainBreaker.slot);

  for (let slot = 1; slot <= panel.total_slots; slot++) {
    if (rendered.has(slot)) continue;

    const breaker = breakerBySlot.get(slot);
    const isOdd = slot % 2 === 1;
    const col: 'left' | 'right' = isOdd ? 'left' : 'right';

    if (breaker?.breaker_type === 'double_pole') {
      // Double-pole: stays in its own column (left for odd, right for even), spans 2 rows.
      // Consumes the matching slot 2 positions ahead (same column, next row).
      result.push({
        slot,
        col,
        row: rowForSlot(slot),
        rowSpan: 2,
        state: 'occupied',
        breaker,
        isUnlabeled: !breaker.label,
      });
      rendered.add(slot);
      rendered.add(slot + 2); // mark the secondary same-column slot consumed
    } else {
      // Regular single-slot breaker or blank
      result.push({
        slot,
        col,
        row: rowForSlot(slot),
        rowSpan: 1,
        state: breaker ? 'occupied' : 'blank',
        breaker: breaker ?? null,
        isUnlabeled: breaker ? !breaker.label : false,
      });
      rendered.add(slot);
    }
  }

  // Sort: main first, then by row then col
  result.sort((a, b) => {
    if (a.state === 'main') return -1;
    if (b.state === 'main') return 1;
    if (a.row !== b.row) return a.row - b.row;
    const colOrder = { left: 0, full: 1, right: 2 };
    return colOrder[a.col] - colOrder[b.col];
  });

  return result;
}
