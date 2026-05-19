## 1. Database Migrations

- [x] 1.1 Write migration: `ALTER TABLE home_documents ADD COLUMN floor_level INT;`
- [x] 1.2 Write migration: Create `floor_plan_shapes` table (id, home_id, document_id, item_id, label, color, geometry JSONB, created_at, updated_at)
- [x] 1.3 Apply migrations to local dev database and verify schema

## 2. Backend — sqlc Queries

- [x] 2.1 Add `floor_plan_shapes.sql` queries: ListFloorPlanShapes (by home_id), GetFloorPlanShape, CreateFloorPlanShape, UpdateFloorPlanShape, DeleteFloorPlanShape
- [x] 2.2 Add `UpdateHomeDocumentFloorLevel` query to `documents.sql` (UPDATE home_documents SET floor_level = $1 WHERE id = $2 AND home_id = $3)
- [x] 2.3 Update `ListHomeDocuments` query to SELECT floor_level in result
- [x] 2.4 Run `sqlc generate` and verify no compile errors

## 3. Backend — API Handlers

- [x] 3.1 Add `floor_plan_shapes.go` handler file with ListFloorPlanShapes, CreateFloorPlanShape, UpdateFloorPlanShape, DeleteFloorPlanShape (follows floor_plan_areas.go pattern)
- [x] 3.2 Add `UpdateHomeDocumentFloorLevel` handler to `documents.go` (PATCH endpoint, validates floor_level is 0–9 or null)
- [x] 3.3 Update `HomeDocumentRow` struct and `ListHomeDocuments` handler response to include `floor_level *int` field
- [x] 3.4 Register new routes in `router.go`: `GET/POST /homes/{homeId}/floor-plan-shapes`, `PATCH/DELETE /floor-plan-shapes/{id}`, `PATCH /homes/{homeId}/documents/{documentId}`

## 4. Frontend — Dependencies & Types

- [x] 4.1 Add `konva` and `react-konva` to `apps/web/package.json` and run `pnpm install`
- [x] 4.2 Add `HomeDocument.floor_level` (`number | null`) to the `HomeDocument` type in `apps/web/src/api/types.ts`
- [x] 4.3 Add `FloorPlanShape` type to `apps/web/src/api/types.ts` (id, home_id, document_id, item_id, label, color, geometry, created_at, updated_at)

## 5. Frontend — API Query Hooks

- [x] 5.1 Add `useFloorPlanShapes(homeId)` query hook (GET /homes/{homeId}/floor-plan-shapes)
- [x] 5.2 Add `useCreateFloorPlanShape`, `useUpdateFloorPlanShape`, `useDeleteFloorPlanShape` mutation hooks
- [x] 5.3 Add `useUpdateDocumentFloorLevel` mutation hook (PATCH /homes/{homeId}/documents/{documentId})
- [x] 5.4 Update `useHomeDocuments` to include `floor_level` in returned data

## 6. Frontend — Floor Plan Canvas Component

- [x] 6.1 Create `apps/web/src/components/FloorPlanCanvas.tsx` — Konva Stage with background image layer
- [x] 6.2 Implement zoom (scroll wheel) and pan (drag on background) on the canvas Stage
- [x] 6.3 Add "Reset View" button that resets scale and position to fit-container defaults
- [x] 6.4 Render `floor_plan_areas` polygons as Konva.Line (closed) shapes on an Electrical Zones layer
- [x] 6.5 Render `floor_plan_shapes` polygons as Konva.Line (closed) shapes on a Home Layout layer
- [x] 6.6 Implement layer visibility toggle (pass `visible` prop to each Konva.Layer)
- [x] 6.7 Display zone name as Konva.Text centered in each electrical zone polygon
- [x] 6.8 Display item label (or custom label) as Konva.Text centered in each layout shape that has one

## 7. Frontend — Drawing Tools

- [x] 7.1 Implement polygon draw mode for electrical zones: click to place vertices, close on first-vertex click or double-click, Escape to cancel
- [x] 7.2 Implement rectangle draw mode for home layout: click-drag to draw, releases to finalize
- [x] 7.3 Implement polygon draw mode for home layout (same as 7.1 logic, shared utility)
- [x] 7.4 After drawing completes, open a Mantine Modal to enter name/color (zone) or label/color/item-link (shape)

## 8. Frontend — Shape Editing

- [x] 8.1 Implement vertex drag handles: render Konva.Circle at each vertex of selected shape; drag updates geometry state
- [x] 8.2 Implement whole-shape drag (drag body translates all vertices)
- [x] 8.3 On drag end, call the appropriate update mutation with new geometry
- [x] 8.4 Add delete button in shape selection toolbar; show confirmation modal before deleting

## 9. Frontend — Floor Plans Tab

- [x] 9.1 Create `FloorPlansTab` component in `HomeDetailScreen.tsx` (or separate file)
- [x] 9.2 Render floor switcher: segmented control built from floor plan documents grouped by floor_level
- [x] 9.3 Add "Upload Floor Plan" button that calls the existing home document upload with document_type pre-set to 'floor_plan'
- [x] 9.4 Add floor level selector (Basement / Floor 1 / Floor 2 / Floor 3 / Unassigned) per document; wire to useUpdateDocumentFloorLevel
- [x] 9.5 Add layer toggle buttons (Electrical Zones / Home Layout) wired to FloorPlanCanvas visibility props
- [x] 9.6 Add the "Floor Plans" tab to the Tabs.List in `HomeDetailScreen.tsx` with an appropriate icon (e.g., IconMap)
- [x] 9.7 Wire the selected floor document URL to FloorPlanCanvas as the background image src
- [x] 9.8 Wire floor_plan_areas (filtered by document_id) and floor_plan_shapes (filtered by document_id) into FloorPlanCanvas
