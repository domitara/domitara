## Context

Several infrastructure pieces already exist:
- `home_documents` table has `document_type = 'floor_plan'` as a valid enum value
- `floor_plan_areas` table stores named, colored zones with a `geometry JSONB` column and an FK to `home_documents`
- `electrical_breakers` already has `floor_plan_area_id` FK referencing `floor_plan_areas`
- `floor_plan_areas.go` handler + sqlc queries are complete for CRUD on zones
- `HomeDetailScreen.tsx` has a Mantine `Tabs` structure with 5 tabs; adding a 6th is straightforward

Missing pieces:
- `home_documents` has no `floor_level` — can't distinguish which floor a plan belongs to
- No `floor_plan_shapes` table for home layout annotations
- No frontend canvas viewer or drawing UI
- No "Floor Plans" tab in HomeDetailScreen

## Goals / Non-Goals

**Goals:**
- Add a "Floor Plans" tab to the Home Details view, visible only when floor plan documents exist
- Floor switcher based on `floor_level` metadata on the document
- Canvas viewer with zoom/pan for the floor plan image (read mode)
- **Electrical Zones layer**: render existing `floor_plan_areas` polygons as colored overlays; create/edit/delete zones; link zones to electrical panels (already supported via breaker FK)
- **Home Layout layer**: draw rectangular/polygon shapes that can optionally link to an Item
- Layer toggle controls (show/hide each layer independently)
- Geometry stored as GeoJSON-like `{ type: "Polygon", coordinates: [[x, y], ...] }` in the existing JSONB column (normalized pixel percentages so it scales with image display size)

**Non-Goals:**
- Mobile canvas interaction (web-only for now)
- Multi-user real-time collaboration on annotations
- Exporting annotated floor plans as images
- Raster editing or annotation tools beyond zones/shapes (no text labels, arrows, etc.)
- Migrating existing `floor_plan_areas` geometry data (it's empty today)

## Decisions

### 1. Canvas Library: Konva.js

**Decision**: Use Konva.js (`konva` + `react-konva`) for canvas rendering and interaction.

**Why over SVG**: SVG polygon interaction for drawing (hit testing, drag handles) is complex to build by hand. Konva provides stage/layer abstraction, built-in drag handles, and hit detection that maps directly onto the layer concept.

**Why over Fabric.js**: Fabric is larger and more opinionated about its object model. Konva is lighter and React-native via `react-konva`.

**Trade-off**: Adds a dependency (~150KB gzipped). Acceptable given the drawing requirement.

### 2. Geometry Format: Normalized Percentage Coordinates

**Decision**: Store polygon vertices as `[[x%, y%], ...]` — fractions of image width/height (0.0–1.0), not pixel values.

**Why**: Floor plan images will be displayed at varying container widths. Percentage-based coordinates render correctly regardless of zoom level or screen size; they just multiply against the rendered image dimensions.

**Applied to**: Both `floor_plan_areas.geometry` (already JSONB) and the new `floor_plan_shapes.geometry` column.

### 3. Home Layout Shapes: New Table

**Decision**: Add a `floor_plan_shapes` table rather than reusing `floor_plan_areas` with a discriminator column.

**Why**: `floor_plan_areas` is tightly integrated with electrical panels (breaker FK). Home layout shapes have a completely different FK (item_id) and different semantics. A discriminator would spread two concerns across one table and complicate queries.

**Schema**:
```sql
CREATE TABLE floor_plan_shapes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    document_id UUID REFERENCES home_documents(id) ON DELETE SET NULL,
    item_id     UUID REFERENCES items(id) ON DELETE SET NULL,
    label       TEXT,
    color       TEXT NOT NULL DEFAULT '#f59e0b',
    geometry    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4. Floor Level: Column on home_documents

**Decision**: Add `floor_level INT` to `home_documents` (NULL = unspecified; 0 = basement; 1 = ground floor; 2, 3, … = upper floors).

**Why not a separate table**: Floor plans are 1:1 with a document; a single integer is all that's needed. A join table would be over-engineering.

**Frontend label mapping**: `{ 0: 'Basement', 1: 'Floor 1', 2: 'Floor 2', 3: 'Floor 3' }` etc.

### 5. Floor Plans Tab Visibility

**Decision**: Show the "Floor Plans" tab unconditionally in HomeDetailScreen (always visible, prompts upload if none exist).

**Why**: Conditional tab visibility based on document presence requires an extra query on tab render. Always showing the tab is simpler and lets users discover the feature.

## Risks / Trade-offs

- **Konva bundle size** → acceptable at ~150KB; can be lazy-loaded since the tab is not always visible
- **JSONB geometry has no spatial indexing** → acceptable; floor plan annotations are low-cardinality (tens of shapes per home, not thousands)
- **Drawing UX complexity** → initial implementation supports rectangle and freehand polygon; freehand polygon draw on desktop mouse is non-trivial but standard Konva patterns handle it
- **floor_plan_areas currently lacks geometry UI** → this feature adds the first geometry editor; existing rows with NULL geometry will render as empty (handled gracefully)

## Migration Plan

1. Add DB migration: `ALTER TABLE home_documents ADD COLUMN floor_level INT;`
2. Add DB migration: `CREATE TABLE floor_plan_shapes (...)` (see schema above)
3. Run sqlc generate to update Go query layer
4. Add/update API handlers for:
   - `PATCH /homes/{homeId}/documents/{documentId}` — set floor_level
   - `GET /homes/{homeId}/floor-plan-shapes` + CRUD endpoints
5. Add frontend:
   - Install `konva` + `react-konva`
   - `FloorPlansTab` component in HomeDetailScreen
   - `FloorPlanCanvas` with layer/shape rendering
   - Drawing tools for zones and layout shapes

Rollback: migrations are additive columns/tables; reverting the frontend tab reverts all visible behaviour.

## Resolved Questions

- **Floor plan upload location**: Floor plan documents ARE uploadable directly from the Floor Plans tab (upload sets document_type = 'floor_plan' automatically). Documents tab also continues to show them.
- **Canvas text labels**: Both electrical zones and home layout shapes SHALL render their name/label as text centered within the shape on the canvas.
