import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from './client';
import type {
  Location,
  Label,
  Item,
  ItemPhoto,
  ItemDocument,
  MaintenanceLog,
  MaintenanceSchedule,
  CreateMaintenanceScheduleInput,
  UpdateMaintenanceScheduleInput,
  Reminder,
  DashboardStats,
  SystemStatus,
  User,
  CreateItemInput,
  UpdateItemInput,
  CreateLocationInput,
  UpdateLocationInput,
  CreateLabelInput,
  PaintColor,
  CreatePaintColorInput,
  UpdatePaintColorInput,
  LocationPaint,
  CreateLocationPaintInput,
  UpdateLocationPaintInput,
  CreateUserInput,
  CreateMaintenanceInput,
  Home,
  HomeMember,
  HomePhoto,
  HomeDocument,
  HomeDocumentType,
  CreateHomeInput,
  ElectricalPanel,
  ElectricalBreaker,
  FloorPlanArea,
  CreatePanelInput,
  UpdatePanelInput,
  CreateBreakerInput,
  UpdateBreakerInput,
  CreateFloorPlanAreaInput,
  UpdateFloorPlanAreaInput,
  FloorPlanShape,
  CreateFloorPlanShapeInput,
  UpdateFloorPlanShapeInput,
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

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLocationInput }) =>
      api.put<Location>(`/locations/${id}`, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: locationKeys.byId(id) });
      qc.invalidateQueries({ queryKey: locationKeys.all });
    },
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

// --- Paint colors ---
export const paintColorKeys = {
  all: ['paint-colors'] as const,
  byId: (id: string) => ['paint-colors', id] as const,
};
export const locationPaintKeys = {
  byLocation: (locationId: string) => ['location-paint', locationId] as const,
};

export function usePaintColors() {
  return useQuery({
    queryKey: paintColorKeys.all,
    queryFn: () => api.get<PaintColor[]>('/paint-colors'),
  });
}

export function useCreatePaintColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePaintColorInput) => api.post<PaintColor>('/paint-colors', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: paintColorKeys.all }),
  });
}

export function useUpdatePaintColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePaintColorInput }) =>
      api.put<PaintColor>(`/paint-colors/${id}`, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: paintColorKeys.byId(id) });
      qc.invalidateQueries({ queryKey: paintColorKeys.all });
    },
  });
}

export function useDeletePaintColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/paint-colors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: paintColorKeys.all }),
  });
}

export function useLocationPaint(locationId: string) {
  return useQuery({
    queryKey: locationPaintKeys.byLocation(locationId),
    queryFn: () => api.get<LocationPaint[]>(`/locations/${locationId}/paint`),
    enabled: !!locationId,
  });
}

export function useCreateLocationPaint(locationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLocationPaintInput) =>
      api.post<LocationPaint>(`/locations/${locationId}/paint`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: locationPaintKeys.byLocation(locationId) });
      qc.invalidateQueries({ queryKey: paintColorKeys.all });
    },
  });
}

export function useUpdateLocationPaint(locationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLocationPaintInput }) =>
      api.put<LocationPaint>(`/location-paint/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: locationPaintKeys.byLocation(locationId) });
      qc.invalidateQueries({ queryKey: paintColorKeys.all });
    },
  });
}

export function useDeleteLocationPaint(locationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/location-paint/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: locationPaintKeys.byLocation(locationId) });
      qc.invalidateQueries({ queryKey: paintColorKeys.all });
    },
  });
}

// --- Items ---
export const itemKeys = {
  all: ['items'] as const,
  filtered: (params: {
    locationId?: string;
    labelId?: string;
    q?: string;
    includeQuick?: boolean;
  }) => ['items', params] as const,
  byId: (id: string) => ['items', id] as const,
};

export function useItems(params?: {
  locationId?: string;
  labelId?: string;
  q?: string;
  includeQuick?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params?.locationId) qs.set('location_id', params.locationId);
  if (params?.labelId) qs.set('label_id', params.labelId);
  if (params?.q) qs.set('q', params.q);
  if (params?.includeQuick) qs.set('include_quick', 'true');
  const query = qs.toString() ? `?${qs}` : '';
  const hasParams = params && Object.values(params).some(Boolean);
  return useQuery({
    queryKey: hasParams ? itemKeys.filtered(params!) : itemKeys.all,
    queryFn: () => api.get<Item[]>(`/items${query}`),
    placeholderData: keepPreviousData,
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

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateItemInput }) =>
      api.put<Item>(`/items/${id}`, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: itemKeys.byId(id) });
      qc.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

export function useGenerateMissingAssetIds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ updated: number }>('/items/generate-asset-ids', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

// --- Maintenance ---
export const maintenanceKeys = {
  all: ['maintenance'] as const,
  byItem: (itemId: string) => ['maintenance', { itemId }] as const,
};

export const scheduleKeys = {
  all: ['maintenance', 'schedules'] as const,
};

export function useMaintenance(itemId?: string) {
  const qs = itemId ? `?item_id=${itemId}` : '';
  return useQuery({
    queryKey: itemId ? maintenanceKeys.byItem(itemId) : maintenanceKeys.all,
    queryFn: () => api.get<MaintenanceLog[]>(`/maintenance${qs}`),
  });
}

export function useSchedules() {
  return useQuery({
    queryKey: scheduleKeys.all,
    queryFn: () => api.get<MaintenanceSchedule[]>('/maintenance/schedules'),
  });
}

export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMaintenanceInput) => api.post<MaintenanceLog>('/maintenance', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: maintenanceKeys.all });
      qc.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMaintenanceScheduleInput) =>
      api.post<MaintenanceSchedule>('/maintenance/schedules', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateMaintenanceScheduleInput }) =>
      api.put<MaintenanceSchedule>(`/maintenance/schedules/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/maintenance/schedules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
}

export function useDeleteMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/maintenance/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: maintenanceKeys.all }),
  });
}

// --- Reminders ---
export const reminderKeys = { all: ['reminders'] as const };

export function useReminders() {
  return useQuery({
    queryKey: reminderKeys.all,
    queryFn: () => api.get<Reminder[]>('/reminders'),
  });
}

export function useDismissReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/reminders/${id}/dismiss`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: reminderKeys.all }),
  });
}

export function useSnoozeReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) =>
      api.post<void>(`/reminders/${id}/snooze`, { days }),
    onSuccess: () => qc.invalidateQueries({ queryKey: reminderKeys.all }),
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

export function useAdminCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserInput) => api.post<User>('/admin/users', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users }),
  });
}

export function useAdminDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users }),
  });
}

// --- Server version ---
export function useVersion() {
  return useQuery({
    queryKey: ['version'],
    queryFn: () => api.get<{ version: string }>('/version'),
    staleTime: Infinity,
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
    mutationFn: (body: { name?: string; password?: string }) => api.patch<User>('/auth/me', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: meKeys.me }),
  });
}

// --- Item Photos ---
export const photoKeys = {
  byItem: (itemId: string) => ['photos', itemId] as const,
};

export function useItemPhotos(itemId: string) {
  return useQuery({
    queryKey: photoKeys.byItem(itemId),
    queryFn: () => api.get<ItemPhoto[]>(`/items/${itemId}/photos`),
    enabled: !!itemId,
  });
}

export function useUploadPhoto(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('photo', file);
      return api.upload<ItemPhoto>(`/items/${itemId}/photos`, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: photoKeys.byItem(itemId) }),
  });
}

export function useSetCoverPhoto(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => api.patch(`/items/${itemId}/photos/${photoId}/cover`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: photoKeys.byItem(itemId) });
      qc.invalidateQueries({ queryKey: itemKeys.byId(itemId) });
      qc.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}

export function useDeletePhoto(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => api.delete(`/items/${itemId}/photos/${photoId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: photoKeys.byItem(itemId) }),
  });
}

// --- Item Documents ---
export const documentKeys = {
  byItem: (itemId: string) => ['documents', itemId] as const,
};

export function useItemDocuments(itemId: string) {
  return useQuery({
    queryKey: documentKeys.byItem(itemId),
    queryFn: () => api.get<ItemDocument[]>(`/items/${itemId}/documents`),
    enabled: !!itemId,
  });
}

export function useUploadDocument(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('document', file);
      return api.upload<ItemDocument>(`/items/${itemId}/documents`, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.byItem(itemId) }),
  });
}

export function useDeleteDocument(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api.delete(`/items/${itemId}/documents/${documentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.byItem(itemId) }),
  });
}

// --- Homes ---
export const homeKeys = {
  all: ['homes'] as const,
  byId: (id: string) => ['homes', id] as const,
  members: (id: string) => ['homes', id, 'members'] as const,
  photos: (id: string) => ['homes', id, 'photos'] as const,
  documents: (id: string) => ['homes', id, 'documents'] as const,
};

export function useHomes() {
  return useQuery({
    queryKey: homeKeys.all,
    queryFn: () => api.get<Home[]>('/homes'),
  });
}

export function useHome(id: string) {
  return useQuery({
    queryKey: homeKeys.byId(id),
    queryFn: () => api.get<Home>(`/homes/${id}`),
    enabled: !!id,
  });
}

export function useCreateHome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateHomeInput) => api.post<Home>('/homes', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: homeKeys.all }),
  });
}

export function useUpdateHome(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateHomeInput) => api.put<Home>(`/homes/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: homeKeys.all });
      qc.invalidateQueries({ queryKey: homeKeys.byId(id) });
    },
  });
}

export function useDeleteHome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/homes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: homeKeys.all }),
  });
}

// --- Home members ---
export function useHomeMembers(homeId: string) {
  return useQuery({
    queryKey: homeKeys.members(homeId),
    queryFn: () => api.get<HomeMember[]>(`/homes/${homeId}/members`),
    enabled: !!homeId,
  });
}

export function useAddHomeMember(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; role?: string }) =>
      api.post<HomeMember[]>(`/homes/${homeId}/members`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: homeKeys.members(homeId) }),
  });
}

export function useRemoveHomeMember(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => api.delete(`/homes/${homeId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: homeKeys.members(homeId) }),
  });
}

// --- Home photos ---
export function useHomePhotos(homeId: string) {
  return useQuery({
    queryKey: homeKeys.photos(homeId),
    queryFn: () => api.get<HomePhoto[]>(`/homes/${homeId}/photos`),
    enabled: !!homeId,
  });
}

export function useUploadHomePhoto(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('photo', file);
      return api.upload<HomePhoto>(`/homes/${homeId}/photos`, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: homeKeys.photos(homeId) }),
  });
}

export function useDeleteHomePhoto(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => api.delete(`/homes/${homeId}/photos/${photoId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: homeKeys.photos(homeId) }),
  });
}

// --- Home documents ---
export function useHomeDocuments(homeId: string) {
  return useQuery({
    queryKey: homeKeys.documents(homeId),
    queryFn: () => api.get<HomeDocument[]>(`/homes/${homeId}/documents`),
    enabled: !!homeId,
  });
}

export function useUploadHomeDocument(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType?: string }) => {
      const fd = new FormData();
      fd.append('document', file);
      if (documentType) fd.append('document_type', documentType);
      return api.upload<HomeDocument>(`/homes/${homeId}/documents`, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: homeKeys.documents(homeId) }),
  });
}

export function useDeleteHomeDocument(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => api.delete(`/homes/${homeId}/documents/${docId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: homeKeys.documents(homeId) }),
  });
}

// --- Electrical Panels ---

export const panelKeys = {
  all: (homeId: string) => ['panels', homeId] as const,
  byId: (id: string) => ['panels', 'detail', id] as const,
  breakers: (panelId: string) => ['breakers', panelId] as const,
  areas: (homeId: string) => ['floor-plan-areas', homeId] as const,
};

export function usePanels(homeId: string) {
  return useQuery({
    queryKey: panelKeys.all(homeId),
    queryFn: () => api.get<ElectricalPanel[]>(`/homes/${homeId}/panels`),
    enabled: !!homeId,
  });
}

export function useCreatePanel(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePanelInput) =>
      api.post<ElectricalPanel>(`/homes/${homeId}/panels`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: panelKeys.all(homeId) }),
  });
}

export function useUpdatePanel(panelId: string, homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePanelInput) => api.put<ElectricalPanel>(`/panels/${panelId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: panelKeys.all(homeId) }),
  });
}

export function useDeletePanel(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (panelId: string) => api.delete(`/panels/${panelId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: panelKeys.all(homeId) }),
  });
}

export function useBreakers(panelId: string) {
  return useQuery({
    queryKey: panelKeys.breakers(panelId),
    queryFn: () => api.get<ElectricalBreaker[]>(`/panels/${panelId}/breakers`),
    enabled: !!panelId,
  });
}

export function useCreateBreaker(panelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBreakerInput) =>
      api.post<ElectricalBreaker>(`/panels/${panelId}/breakers`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: panelKeys.breakers(panelId) }),
  });
}

export function useUpdateBreaker(panelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBreakerInput }) =>
      api.put<ElectricalBreaker>(`/breakers/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: panelKeys.breakers(panelId) }),
  });
}

export function useDeleteBreaker(panelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/breakers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: panelKeys.breakers(panelId) }),
  });
}

export function useFloorPlanAreas(homeId: string) {
  return useQuery({
    queryKey: panelKeys.areas(homeId),
    queryFn: () => api.get<FloorPlanArea[]>(`/homes/${homeId}/floor-plan-areas`),
    enabled: !!homeId,
  });
}

export function useCreateFloorPlanArea(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFloorPlanAreaInput) =>
      api.post<FloorPlanArea>(`/homes/${homeId}/floor-plan-areas`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: panelKeys.areas(homeId) }),
  });
}

export function useUpdateFloorPlanArea(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateFloorPlanAreaInput }) =>
      api.put<FloorPlanArea>(`/floor-plan-areas/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: panelKeys.areas(homeId) }),
  });
}

export function useDeleteFloorPlanArea(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/floor-plan-areas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: panelKeys.areas(homeId) });
      // Invalidate all breaker queries since area references may have been nulled
      qc.invalidateQueries({ queryKey: ['breakers'] });
    },
  });
}

// --- Floor Plan Shapes ---

export const shapeKeys = {
  all: (homeId: string) => ['floor-plan-shapes', homeId] as const,
};

export function useFloorPlanShapes(homeId: string) {
  return useQuery({
    queryKey: shapeKeys.all(homeId),
    queryFn: () => api.get<FloorPlanShape[]>(`/homes/${homeId}/floor-plan-shapes`),
    enabled: !!homeId,
  });
}

export function useCreateFloorPlanShape(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFloorPlanShapeInput) =>
      api.post<FloorPlanShape>(`/homes/${homeId}/floor-plan-shapes`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: shapeKeys.all(homeId) }),
  });
}

export function useUpdateFloorPlanShape(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateFloorPlanShapeInput }) =>
      api.patch<FloorPlanShape>(`/floor-plan-shapes/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: shapeKeys.all(homeId) }),
  });
}

export function useDeleteFloorPlanShape(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/floor-plan-shapes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: shapeKeys.all(homeId) }),
  });
}

export function useUpdateDocumentFloorLevel(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, floorLevel }: { docId: string; floorLevel: number | null }) =>
      api.patch(`/homes/${homeId}/documents/${docId}/floor-level`, { floor_level: floorLevel }),
    onSuccess: () => qc.invalidateQueries({ queryKey: homeKeys.documents(homeId) }),
  });
}

export function useUpdateDocumentType(homeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      docId,
      documentType,
    }: {
      docId: string;
      documentType: HomeDocumentType | null;
    }) => api.patch(`/homes/${homeId}/documents/${docId}/type`, { document_type: documentType }),
    onSuccess: () => qc.invalidateQueries({ queryKey: homeKeys.documents(homeId) }),
  });
}
