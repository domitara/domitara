export type UserRole = 'admin' | 'member';
export type ItemStatus = 'owned' | 'loaned' | 'missing';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  name: string;
  description: string | null;
  location_id: string | null;
  status: ItemStatus;
  manufacturer: string | null;
  model: string | null;
  serial: string | null;
  purchase_price: number | null;
  purchased_at: string | null;
  warranty: string | null;
  insured: boolean;
  notes: string | null;
  asset_id: string | null;
  label_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface MaintenanceLog {
  id: string;
  item_id: string | null;
  item_name: string | null;
  title: string;
  notes: string | null;
  cost: number | null;
  performed_at: string;
  created_at: string;
}

export interface DashboardStats {
  total_items: number;
  total_locations: number;
  total_labels: number;
  total_value: number;
}

export interface SystemStatus {
  setup_complete: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateItemInput {
  name: string;
  description?: string;
  location_id?: string;
  status?: ItemStatus;
  manufacturer?: string;
  model?: string;
  serial?: string;
  purchase_price?: number;
  purchased_at?: string;
  warranty?: string;
  insured?: boolean;
  notes?: string;
  asset_id?: string | null;
  label_ids?: string[];
}

export interface UpdateItemInput {
  name: string;
  description?: string;
  location_id?: string;
  status?: ItemStatus;
  manufacturer?: string;
  model?: string;
  serial?: string;
  purchase_price?: number;
  purchased_at?: string;
  warranty?: string;
  insured?: boolean;
  notes?: string;
  asset_id?: string | null;
  label_ids?: string[];
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface CreateLocationInput {
  name: string;
  parent_id?: string;
  description?: string;
}

export interface CreateLabelInput {
  name: string;
  color?: string;
}

export interface ItemPhoto {
  id: string;
  item_id: string;
  filename: string;
  content_type: string;
  url: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  key: string;
  title: string;
  body: string;
  tone: 'info' | 'warn' | 'danger';
  snoozed_until?: string;
  created_at: string;
}

export interface ItemDocument {
  id: string;
  item_id: string;
  filename: string;
  content_type: string;
  url: string;
  size: number;
  created_at: string;
}

export interface CreateMaintenanceInput {
  title: string;
  item_id?: string;
  schedule_id?: string;
  notes?: string;
  cost?: number;
  performed_at?: string;
}

export type FrequencyUnit = 'days' | 'weeks' | 'months' | 'years';

export interface MaintenanceSchedule {
  id: string;
  item_id: string | null;
  item_name: string | null;
  title: string;
  notes: string | null;
  frequency_value: number;
  frequency_unit: FrequencyUnit;
  last_performed_at: string | null;
  next_due_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMaintenanceScheduleInput {
  title: string;
  item_id?: string;
  notes?: string;
  frequency_value: number;
  frequency_unit: FrequencyUnit;
  next_due_at?: string;
}

export interface UpdateMaintenanceScheduleInput {
  title: string;
  item_id?: string;
  notes?: string;
  frequency_value: number;
  frequency_unit: FrequencyUnit;
  next_due_at: string;
}

export type PropertyType = 'house' | 'condo' | 'apartment' | 'townhouse' | 'mobile' | 'land';
export type HomeMemberRole = 'owner' | 'member';
export type HomeDocumentType =
  | 'deed'
  | 'insurance'
  | 'inspection'
  | 'survey'
  | 'hoa'
  | 'warranty'
  | 'permit'
  | 'tax'
  | 'floor_plan'
  | 'other';

export interface Home {
  id: string;
  name: string;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  address_country: string | null;
  property_type: PropertyType | null;
  year_built: number | null;
  sqft: number | null;
  notes: string | null;
  purchase_price: number | null;
  purchased_at: string | null;
  estimated_value: number | null;
  mortgage_lender: string | null;
  mortgage_notes: string | null;
  hoa_name: string | null;
  hoa_contact: string | null;
  hoa_monthly_dues: number | null;
  role: HomeMemberRole;
  created_at: string;
  updated_at: string;
}

export interface HomeMember {
  user_id: number;
  user_name: string;
  user_email: string;
  role: HomeMemberRole;
  joined_at: string;
}

export interface HomePhoto {
  id: string;
  home_id: string;
  filename: string;
  content_type: string;
  url: string;
  created_at: string;
}

export interface HomeDocument {
  id: string;
  home_id: string;
  filename: string;
  content_type: string;
  url: string;
  size: number;
  document_type: HomeDocumentType | null;
  floor_level: number | null;
  created_at: string;
}

export interface CreateHomeInput {
  name: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  property_type?: PropertyType;
  year_built?: number;
  sqft?: number;
  notes?: string;
  purchase_price?: number;
  purchased_at?: string;
  estimated_value?: number;
  mortgage_lender?: string;
  mortgage_notes?: string;
  hoa_name?: string;
  hoa_contact?: string;
  hoa_monthly_dues?: number;
}

// ---- Electrical Panels ----

export type BreakerType = 'standard' | 'double_pole' | 'tandem' | 'blank' | 'main';

export interface FloorPlanGeometry {
  type: 'Polygon';
  coordinates: [number, number][];
}

export interface FloorPlanArea {
  id: string;
  home_id: string;
  document_id: string | null;
  name: string;
  color: string;
  geometry: FloorPlanGeometry | null;
  created_at: string;
  updated_at: string;
}

export interface FloorPlanShape {
  id: string;
  home_id: string;
  document_id: string | null;
  item_id: string | null;
  label: string | null;
  color: string;
  geometry: FloorPlanGeometry | null;
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

export interface CreatePanelInput {
  name: string;
  total_amps: number;
  total_slots?: number;
  location_note?: string;
  parent_panel_id?: string;
  fed_by_breaker_id?: string;
  sort_order?: number;
}

export interface UpdatePanelInput {
  name: string;
  total_amps: number;
  total_slots: number;
  location_note?: string;
  parent_panel_id?: string;
  fed_by_breaker_id?: string;
  sort_order: number;
}

export interface CreateBreakerInput {
  slot: number;
  label?: string;
  amps?: number;
  breaker_type?: BreakerType;
  is_gfci?: boolean;
  is_afci?: boolean;
  notes?: string;
  floor_plan_area_id?: string;
}

export interface UpdateBreakerInput {
  label?: string;
  amps?: number;
  breaker_type?: BreakerType;
  is_gfci: boolean;
  is_afci: boolean;
  notes?: string;
  floor_plan_area_id?: string | null;
}

export interface CreateFloorPlanAreaInput {
  name: string;
  color?: string;
  document_id?: string;
  geometry?: FloorPlanGeometry;
}

export interface UpdateFloorPlanAreaInput {
  name: string;
  color: string;
  geometry?: FloorPlanGeometry | null;
}

export interface CreateFloorPlanShapeInput {
  document_id?: string;
  item_id?: string;
  label?: string;
  color?: string;
  geometry?: FloorPlanGeometry;
}

export interface UpdateFloorPlanShapeInput {
  document_id?: string | null;
  item_id?: string | null;
  label?: string | null;
  color?: string;
  geometry?: FloorPlanGeometry | null;
}
