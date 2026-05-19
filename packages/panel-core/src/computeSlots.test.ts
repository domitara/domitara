import { describe, it, expect } from 'vitest';
import { computeSlots } from './computeSlots.js';
import type { ElectricalBreaker } from './types.js';

const panel = { total_slots: 8 };

function makeBreaker(overrides: Partial<ElectricalBreaker> & { slot: number }): ElectricalBreaker {
  return {
    id: `b${overrides.slot}`,
    panel_id: 'p1',
    label: null,
    amps: 20,
    breaker_type: 'standard',
    is_gfci: false,
    is_afci: false,
    notes: null,
    floor_plan_area_id: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('computeSlots — simple panel', () => {
  it('assigns odd slots to left, even to right', () => {
    const slots = computeSlots(panel, []);
    const odd = slots.filter((s) => s.slot % 2 === 1);
    const even = slots.filter((s) => s.slot % 2 === 0);
    expect(odd.every((s) => s.col === 'left')).toBe(true);
    expect(even.every((s) => s.col === 'right')).toBe(true);
  });

  it('produces total_slots entries', () => {
    expect(computeSlots(panel, []).length).toBe(8);
  });

  it('marks all unoccupied slots as blank', () => {
    const slots = computeSlots(panel, []);
    expect(slots.every((s) => s.state === 'blank')).toBe(true);
  });

  it('marks occupied slot correctly', () => {
    const b = makeBreaker({ slot: 3, label: 'Kitchen', breaker_type: 'standard' });
    const slots = computeSlots(panel, [b]);
    const slot3 = slots.find((s) => s.slot === 3)!;
    expect(slot3.state).toBe('occupied');
    expect(slot3.col).toBe('left');
    expect(slot3.isUnlabeled).toBe(false);
  });

  it('marks breaker with no label as isUnlabeled', () => {
    const b = makeBreaker({ slot: 1 });
    const slots = computeSlots(panel, [b]);
    expect(slots.find((s) => s.slot === 1)!.isUnlabeled).toBe(true);
  });
});

describe('computeSlots — double-pole', () => {
  it('renders double-pole as left-column double-height', () => {
    const b = makeBreaker({ slot: 3, breaker_type: 'double_pole', label: 'HVAC' });
    const slots = computeSlots(panel, [b]);
    const dp = slots.find((s) => s.slot === 3)!;
    expect(dp.col).toBe('left');
    expect(dp.rowSpan).toBe(2);
    expect(dp.state).toBe('occupied');
  });

  it('removes the secondary same-column slot and keeps the adjacent column slots', () => {
    const b = makeBreaker({ slot: 3, breaker_type: 'double_pole', label: 'HVAC' });
    const slots = computeSlots(panel, [b]);
    // slot 5 (same column, next row) is consumed
    expect(slots.find((s) => s.slot === 5)).toBeUndefined();
    // slot 4 and slot 6 (opposite column) remain available
    expect(slots.find((s) => s.slot === 4)).toBeDefined();
    expect(slots.find((s) => s.slot === 6)).toBeDefined();
  });

  it('total output length is total_slots - 1 for one double-pole', () => {
    const b = makeBreaker({ slot: 3, breaker_type: 'double_pole' });
    expect(computeSlots(panel, [b]).length).toBe(7);
  });
});

describe('computeSlots — main breaker', () => {
  it('renders main breaker first with full col and row 1', () => {
    const main = makeBreaker({ slot: 0, breaker_type: 'main', label: 'Main 200A' });
    const slots = computeSlots({ total_slots: 4 }, [main]);
    expect(slots[0].state).toBe('main');
    expect(slots[0].col).toBe('full');
    expect(slots[0].row).toBe(1);
  });

  it('regular slots start at row 2 when main is present', () => {
    const main = makeBreaker({ slot: 0, breaker_type: 'main', label: 'Main' });
    const slots = computeSlots({ total_slots: 2 }, [main]);
    const regular = slots.filter((s) => s.state !== 'main');
    expect(regular.every((s) => s.row >= 2)).toBe(true);
  });
});

describe('computeSlots — mixed panel', () => {
  it('handles a realistic panel: main + standard + double-pole + blanks', () => {
    const breakers = [
      makeBreaker({ slot: 0, breaker_type: 'main', label: 'Main 200A' }),
      makeBreaker({ slot: 1, breaker_type: 'standard', label: 'Kitchen', amps: 20 }),
      makeBreaker({ slot: 3, breaker_type: 'double_pole', label: 'HVAC', amps: 60 }),
    ];
    const slots = computeSlots({ total_slots: 8 }, breakers);
    const main = slots.find((s) => s.state === 'main')!;
    const kitchen = slots.find((s) => s.slot === 1)!;
    const hvac = slots.find((s) => s.slot === 3)!;

    expect(main).toBeDefined();
    expect(kitchen.col).toBe('left');
    expect(hvac.col).toBe('left');
    expect(hvac.rowSpan).toBe(2);
    // slot 4 (right column) remains available; slot 5 (same column) is consumed
    expect(slots.find((s) => s.slot === 4)).toBeDefined();
    expect(slots.find((s) => s.slot === 5)).toBeUndefined();
  });
});
