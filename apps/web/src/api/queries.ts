import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Location, Label, Item, MaintenanceLog, DashboardStats,
  SystemStatus, User, CreateItemInput, CreateLocationInput, CreateLabelInput,
} from './types';

// --- System ---
export const systemKeys = { status: ['system', 'status'] as const };

export function useSystemStatus() {
  return useQuery({
    queryKey: systemKeys.status,
    queryFn: () => api.get<SystemStatus>('/system/status'),
    staleTime: Infinity,
  });
}

// --- Dashboard ---
export const dashboardKeys = { stats: ['dashboard'] as const };

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.stats,
    queryFn: () => api.get<DashboardStats>('/dashboard'),
  });
}

// --- Locations ---
export const locationKeys = {
  all: ['locations'] as const,
  byId: (id: string) => ['locations', id] as const,
};

export function useLocations() {
  return useQuery({
    queryKey: locationKeys.all,
    queryFn: () => api.get<Location[]>('/locations'),
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: locationKeys.byId(id),
    queryFn: () => api.get<Location>(`/locations/${id}`),
    enabled: !!id,
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLocationInput) => api.post<Location>('/locations', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/locations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationKeys.all }),
  });
}

// --- Labels ---
export const labelKeys = {
  all: ['labels'] as const,
};

export function useLabels() {
  return useQuery({
    queryKey: labelKeys.all,
    queryFn: () => api.get<Label[]>('/labels'),
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLabelInput) => api.post<Label>('/labels', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: labelKeys.all }),
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/labels/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: labelKeys.all }),
  });
}

// --- Items ---
export const itemKeys = {
  all: ['items'] as const,
  filtered: (params: { locationId?: string; labelId?: string }) =>
    ['items', params] as const,
  byId: (id: string) => ['items', id] as const,
};

export function useItems(params?: { locationId?: string; labelId?: string }) {
  const qs = new URLSearchParams();
  if (params?.locationId) qs.set('location_id', params.locationId);
  if (params?.labelId) qs.set('label_id', params.labelId);
  const query = qs.toString() ? `?${qs}` : '';
  return useQuery({
    queryKey: params ? itemKeys.filtered(params) : itemKeys.all,
    queryFn: () => api.get<Item[]>(`/items${query}`),
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: itemKeys.byId(id),
    queryFn: () => api.get<Item>(`/items/${id}`),
    enabled: !!id,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateItemInput) => api.post<Item>('/items', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

// --- Maintenance ---
export const maintenanceKeys = {
  all: ['maintenance'] as const,
  byItem: (itemId: string) => ['maintenance', { itemId }] as const,
};

export function useMaintenance(itemId?: string) {
  const qs = itemId ? `?item_id=${itemId}` : '';
  return useQuery({
    queryKey: itemId ? maintenanceKeys.byItem(itemId) : maintenanceKeys.all,
    queryFn: () => api.get<MaintenanceLog[]>(`/maintenance${qs}`),
  });
}

// --- Admin ---
export const adminKeys = { users: ['admin', 'users'] as const };

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users,
    queryFn: () => api.get<User[]>('/admin/users'),
  });
}

export function useAdminDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users }),
  });
}

// --- Current user ---
export const meKeys = { me: ['me'] as const };

export function useMe() {
  return useQuery({
    queryKey: meKeys.me,
    queryFn: () => api.get<User>('/auth/me'),
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; password?: string }) =>
      api.patch<User>('/auth/me', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: meKeys.me }),
  });
}
