## 1. Shared Package (panel-core)

- [x] 1.1 Scaffold `packages/panel-core` with `package.json`, `tsconfig.json`, and entry point; add to pnpm workspace
- [x] 1.2 Define TypeScript types: `ElectricalPanel`, `ElectricalBreaker`, `FloorPlanArea`, `SlotGeometry`, `BreakerType`, `AmpsValue`
- [x] 1.3 Implement `computeSlots(panel, breakers)` — returns `SlotGeometry[]` covering all slots 1..total_slots, handling double-pole spans, blank fill, and main breaker placement
- [x] 1.4 Add unit tests for `computeSlots`: simple panel, double-pole span, mixed panel with blanks and main breaker

## 2. Database Migration

- [x] 2.1 Write migration `002_electrical_panels.up.sql`: create `floor_plan_areas` table (id, home_id, name, color, geometry JSONB null, document_id nullable FK, created_at, updated_at)
- [x] 2.2 Add `electrical_panels` table to migration: id, home_id, name, total_amps, total_slots, location_note, parent_panel_id (self-ref nullable), fed_by_breaker_id (nullable FK to electrical_breakers), sort_order, created_at, updated_at
- [x] 2.3 Add `electrical_breakers` table to migration: id, panel_id, slot, label (max 40), amps, breaker_type, is_gfci, is_afci, notes, floor_plan_area_id (nullable FK), created_at, updated_at; add CHECK constraints for breaker_type enum and amps allowed values
- [x] 2.4 Write corresponding `002_electrical_panels.down.sql`
- [x] 2.5 Verify migration runs cleanly up and down against local postgres

## 3. Go API — sqlc Queries

- [x] 3.1 Write sqlc queries for `floor_plan_areas`: ListByHome, Create, Update, Delete
- [x] 3.2 Write sqlc queries for `electrical_panels`: ListByHome, GetByID, Create, Update, Delete, CountSubpanels (for deletion guard)
- [x] 3.3 Write sqlc queries for `electrical_breakers`: ListByPanel, GetByID, Create, Update, Delete, NullifyAreaReferences (for area deletion cascade-null)
- [x] 3.4 Run `sqlc generate` and verify generated code compiles

## 4. Go API — Handlers and Routes

- [x] 4.1 Implement floor plan area handlers: `ListFloorPlanAreas`, `CreateFloorPlanArea`, `UpdateFloorPlanArea`, `DeleteFloorPlanArea` (cascade-null breakers on delete)
- [x] 4.2 Implement panel handlers: `ListPanels`, `CreatePanel`, `GetPanel`, `UpdatePanel`, `DeletePanel` (block if subpanels exist — return 409)
- [x] 4.3 Implement breaker handlers: `ListBreakers`, `CreateBreaker`, `GetBreaker`, `UpdateBreaker`, `DeleteBreaker`; enforce double-pole-on-odd-slot validation and slot conflict check
- [x] 4.4 Add validation: `fed_by_breaker_id` must belong to a different panel; `floor_plan_area_id` must belong to the same home
- [x] 4.5 Register routes in router: `/homes/:homeId/floor-plan-areas`, `/floor-plan-areas/:areaId`, `/homes/:homeId/panels`, `/panels/:panelId`, `/panels/:panelId/breakers`, `/breakers/:breakerId`
- [x] 4.6 Verify all endpoints respect existing home membership middleware (return 403 for non-members)

## 5. Web — API Layer

- [x] 5.1 Add TypeScript types for `ElectricalPanel`, `ElectricalBreaker`, `FloorPlanArea` to `apps/web/src/api/types.ts`
- [x] 5.2 Add API client functions (fetch wrappers) for all panel, breaker, and floor plan area endpoints to `apps/web/src/api/client.ts`
- [x] 5.3 Add TanStack Query hooks: `usePanels`, `useCreatePanel`, `useUpdatePanel`, `useDeletePanel`, `useBreakers`, `useCreateBreaker`, `useUpdateBreaker`, `useDeleteBreaker`, `useFloorPlanAreas`, `useCreateFloorPlanArea`, `useUpdateFloorPlanArea`, `useDeleteFloorPlanArea`

## 6. Web — Panel SVG Component

- [x] 6.1 Build `PanelSVG` component that consumes `computeSlots()` output and renders the panel as a native `<svg>` element with dark background, slot grid, and labels
- [x] 6.2 Implement double-pole visual span (merged block + connector bar) in `PanelSVG`
- [x] 6.3 Implement area color accent on slot and panel legend from `floor_plan_area_id` → area color
- [x] 6.4 Implement amber tint for unlabeled (persisted but no label) slots and dimmed style for blank (unoccupied) slots
- [x] 6.5 Wire slot click handler: emit selected slot/breaker to parent component

## 7. Web — Breaker Edit Drawer

- [x] 7.1 Build `BreakerDrawer` component (Mantine `Drawer` from right) with fields: label, amps select, breaker_type select, is_gfci, is_afci, area picker (dropdown of home floor plan areas), notes textarea
- [x] 7.2 Pre-populate drawer from clicked slot data; support both "create new" (blank slot) and "edit existing" modes
- [x] 7.3 Wire save action to `useCreateBreaker` / `useUpdateBreaker`; wire delete action to `useDeleteBreaker` with confirmation
- [x] 7.4 Validate double-pole constraint client-side (slot must be odd) before submitting

## 8. Web — Electrical Panels Tab

- [x] 8.1 Build `FloorPlanAreaManager` panel: list of named areas with color swatches, inline create form (name + color picker), delete button per area
- [x] 8.2 Build panel selector UI: list of panels for the home with "Add panel" button; panel create/edit form (name, total_amps, total_slots, location_note, sort_order, parent_panel_id, fed_by_breaker_id)
- [x] 8.3 Compose `ElectricalPanelsTab`: panel selector → renders `PanelSVG` for selected panel → `BreakerDrawer` overlay → `FloorPlanAreaManager` section
- [x] 8.4 Add "Electrical Panels" tab to `HomeDetailScreen` (`apps/web/src/screens/HomeDetailScreen.tsx`) with `IconBolt` icon

## 9. Web — Print

- [x] 9.1 Build `PanelPrintView` component: header (home name, panel name, date), slot directory table (slot# | label | amps), double-pole rows merged
- [x] 9.2 Add CSS `@media print` rules: hide all non-print UI, show only `PanelPrintView`
- [x] 9.3 Add "Print directory" button to panel view that calls `window.print()`

## 10. Mobile — Dependencies and Setup

- [x] 10.1 Install `react-native-svg` via `npx expo install react-native-svg` in `apps/mobile`
- [x] 10.2 Install `@gorhom/bottom-sheet` and `react-native-gesture-handler` (if not present); add gesture handler setup to mobile app entry point
- [x] 10.3 Install `expo-print` and `expo-sharing` via `npx expo install expo-print expo-sharing`

## 11. Mobile — Panel SVG Component

- [x] 11.1 Build mobile `PanelSVG` component using `react-native-svg` (`<Svg>`, `<Rect>`, `<Text>`, `<G>`) consuming the same `computeSlots()` output from `panel-core`
- [x] 11.2 Implement double-pole span, area color accents, amber tint, and blank slot dimming to match web visual
- [x] 11.3 Wire slot `onPress` handler to open the breaker bottom sheet

## 12. Mobile — Breaker Bottom Sheet and Screen

- [x] 12.1 Build `BreakerBottomSheet` using `@gorhom/bottom-sheet` with the same fields as the web drawer (label, amps, type, GFCI, AFCI, area picker, notes)
- [x] 12.2 Build mobile Electrical Panels screen: panel selector, `PanelSVG`, `BreakerBottomSheet`; add API hooks (re-use types from `panel-core`)
- [x] 12.3 Add "Share directory" button: generate HTML template string → `expo-print` → `expo-sharing`
- [x] 12.4 Wire the Electrical Panels screen into the mobile navigation (tab or menu entry)
