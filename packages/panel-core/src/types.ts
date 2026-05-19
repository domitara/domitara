export type BreakerType = 'standard' | 'double_pole' | 'tandem' | 'blank' | 'main';

export type AmpsValue = 15 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100 | 110 | 120 | 125 | 150 | 200;

export interface FloorPlanArea {
  id: string;
  home_id: string;
  name: string;
  color: string;
  document_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ElectricalPanel {
  id: string;
  home_id: string;
  name: string;
  total_amps: number;
  total_slots: number;
  location_note: string | null;
  parent_panel_id: string | null;
  fed_by_breaker_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ElectricalBreaker {
  id: string;
  panel_id: string;
  slot: number;
  label: string | null;
  amps: number | null;
  breaker_type: BreakerType;
  is_gfci: boolean;
  is_afci: boolean;
  notes: string | null;
  floor_plan_area_id: string | null;
  created_at: string;
  updated_at: string;
}

export type SlotState = 'occupied' | 'blank' | 'double_pole_secondary' | 'main';

export interface SlotGeometry {
  slot: number;
  col: 'left' | 'right' | 'full';
  row: number;
  rowSpan: number;
  state: SlotState;
  breaker: ElectricalBreaker | null;
  isUnlabeled: boolean;
}
