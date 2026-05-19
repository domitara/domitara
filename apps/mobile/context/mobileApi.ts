import type { ElectricalPanel, ElectricalBreaker, FloorPlanArea } from '@domitara/panel-core';

// Re-export panel types for mobile use
export type { ElectricalPanel, ElectricalBreaker, FloorPlanArea };

export interface Home {
  id: string;
  name: string;
  address_city: string | null;
  address_state: string | null;
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
  };
}

export type MobileApi = ReturnType<typeof createMobileApi>;
