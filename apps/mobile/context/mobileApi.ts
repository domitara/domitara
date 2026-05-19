import type { ElectricalPanel, ElectricalBreaker, FloorPlanArea } from '@domitara/panel-core';

// Re-export panel types for mobile use
export type { ElectricalPanel, ElectricalBreaker, FloorPlanArea };

export type PropertyType = 'house' | 'condo' | 'apartment' | 'townhouse' | 'mobile' | 'land';
export type HomeDocumentType =
  | 'deed' | 'insurance' | 'inspection' | 'survey' | 'hoa'
  | 'warranty' | 'permit' | 'tax' | 'floor_plan' | 'other';
export type HomeMemberRole = 'owner' | 'member';

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
  acreage: number | null;
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

export interface DashboardStats {
  total_items: number;
  total_locations: number;
  total_labels: number;
  total_value: number;
}

export type ItemStatus = 'owned' | 'loaned' | 'missing';

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
  asset_id: string | null;
  label_ids: string[];
  created_at: string;
  updated_at: string;
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

interface CreatePanelInput {
  name: string;
  total_amps: number;
  total_slots?: number;
  location_note?: string;
  parent_panel_id?: string;
  sort_order?: number;
}

interface CreateBreakerInput {
  slot: number;
  label?: string;
  amps?: number;
  breaker_type?: string;
  is_gfci?: boolean;
  is_afci?: boolean;
  notes?: string;
  floor_plan_area_id?: string;
}

interface UpdateBreakerInput {
  label?: string;
  amps?: number;
  breaker_type?: string;
  is_gfci: boolean;
  is_afci: boolean;
  notes?: string;
  floor_plan_area_id?: string | null;
}

async function mobileRequest<T>(
  serverUrl: string,
  token: string,
  path: string,
  opts?: RequestInit,
): Promise<T> {
  const resp = await fetch(`${serverUrl}/api/v1${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opts?.headers,
    },
  });
  if (resp.status === 204) return undefined as T;
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? resp.statusText);
  }
  return resp.json() as Promise<T>;
}

export function createMobileApi(serverUrl: string, token: string) {
  const req = <T>(path: string, opts?: RequestInit) =>
    mobileRequest<T>(serverUrl, token, path, opts);

  return {
    listHomes: () =>
      req<Home[]>('/homes'),

    getHome: (homeId: string) =>
      req<Home>(`/homes/${homeId}`),

    listHomePhotos: (homeId: string) =>
      req<HomePhoto[]>(`/homes/${homeId}/photos`),

    deleteHomePhoto: (homeId: string, photoId: string) =>
      req<void>(`/homes/${homeId}/photos/${photoId}`, { method: 'DELETE' }),

    listHomeDocuments: (homeId: string) =>
      req<HomeDocument[]>(`/homes/${homeId}/documents`),

    deleteHomeDocument: (homeId: string, docId: string) =>
      req<void>(`/homes/${homeId}/documents/${docId}`, { method: 'DELETE' }),

    listHomeMembers: (homeId: string) =>
      req<HomeMember[]>(`/homes/${homeId}/members`),

    addHomeMember: (homeId: string, email: string) =>
      req<HomeMember[]>(`/homes/${homeId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    removeHomeMember: (homeId: string, userId: number) =>
      req<void>(`/homes/${homeId}/members/${userId}`, { method: 'DELETE' }),

    listPanels: (homeId: string) =>
      req<ElectricalPanel[]>(`/homes/${homeId}/panels`),

    createPanel: (homeId: string, body: CreatePanelInput) =>
      req<ElectricalPanel>(`/homes/${homeId}/panels`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    deletePanel: (panelId: string) =>
      req<void>(`/panels/${panelId}`, { method: 'DELETE' }),

    listBreakers: (panelId: string) =>
      req<ElectricalBreaker[]>(`/panels/${panelId}/breakers`),

    createBreaker: (panelId: string, body: CreateBreakerInput) =>
      req<ElectricalBreaker>(`/panels/${panelId}/breakers`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    updateBreaker: (breakerId: string, body: UpdateBreakerInput) =>
      req<ElectricalBreaker>(`/breakers/${breakerId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),

    deleteBreaker: (breakerId: string) =>
      req<void>(`/breakers/${breakerId}`, { method: 'DELETE' }),

    listFloorPlanAreas: (homeId: string) =>
      req<FloorPlanArea[]>(`/homes/${homeId}/floor-plan-areas`),

    createFloorPlanArea: (homeId: string, body: { name: string; color?: string }) =>
      req<FloorPlanArea>(`/homes/${homeId}/floor-plan-areas`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    getDashboard: () =>
      req<DashboardStats>('/dashboard'),

    listItems: (params?: { q?: string; locationId?: string; labelId?: string }) => {
      const qs = new URLSearchParams();
      if (params?.q) qs.set('q', params.q);
      if (params?.locationId) qs.set('locationId', params.locationId);
      if (params?.labelId) qs.set('labelId', params.labelId);
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return req<Item[]>(`/items${query}`);
    },

    getItem: (id: string) =>
      req<Item>(`/items/${id}`),

    listLocations: () =>
      req<Location[]>('/locations'),

    listLabels: () =>
      req<Label[]>('/labels'),

    listReminders: () =>
      req<Reminder[]>('/reminders'),

    dismissReminder: (id: string) =>
      req<void>(`/reminders/${id}/dismiss`, { method: 'POST' }),

    snoozeReminder: (id: string, days: number) =>
      req<void>(`/reminders/${id}/snooze`, {
        method: 'POST',
        body: JSON.stringify({ days }),
      }),
  };
}

export type MobileApi = ReturnType<typeof createMobileApi>;
