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
  label_ids?: string[];
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
