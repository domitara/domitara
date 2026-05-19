## Context

The My Home screen (`HomeDetailScreen.tsx`) already uses a Mantine `Tabs` pattern with four tabs: Details, Photos, Documents, Members. The app is a monorepo with two separate front-end targets — `apps/web` (React 19 + Mantine 9 + Vite) and `apps/mobile` (Expo 54 + React Native 0.81 + Expo Router). These share no component code today. The Go API uses Chi + sqlc + postgres migrations for all data persistence.

Electrical panel layout is an inherently geometric problem: slots must be positioned in a two-column grid, double-pole breakers span both columns, and the main breaker anchors the top. This geometry logic is the same regardless of rendering target.

## Goals / Non-Goals

**Goals:**
- Add an Electrical Panels tab to the My Home screen on both web and mobile
- Support multiple panels per home with parent→subpanel relationships cross-referenced to a specific breaker slot
- Render a realistic-looking panel diagram on both platforms using SVG
- Enable inline editing of every breaker attribute via a Drawer (web) or bottom sheet (mobile)
- Produce a clean printable/shareable breaker directory for posting inside the physical panel
- Keep geometry logic in a single shared package (`packages/panel-core`)

**Non-Goals:**
- Drag-and-drop reordering of breaker slots
- Commercial/industrial panel support (panels >400A, bus topology)
- Electrical load calculation or circuit tracing
- Integration with smart home systems
- Image annotation / photo-to-label OCR

## Decisions

### 1. SVG for panel visualization (over DOM + CSS Grid / RN Views)

**Decision**: Render the panel diagram as SVG on both web and mobile.

**Rationale**: The two apps cannot share React DOM or Mantine components, but they can share slot geometry computation. SVG's API on web (`<svg>`, `<rect>`, `<text>`) maps 1:1 to `react-native-svg` (`<Svg>`, `<Rect>`, `<Text>`). This means a single `computeSlots(panel, breakers)` function from `panel-core` produces the geometry, and each platform renders it with its native SVG primitives. The resulting component code on each platform is a thin renderer over a shared data structure.

**Alternative considered**: Platform-specific layouts (CSS Grid on web, RN `View` on mobile). Rejected because the double-pole spanning logic and slot numbering rules would have to be duplicated and kept in sync.

### 2. `packages/panel-core` shared package

**Decision**: Create a new `packages/panel-core` workspace package containing TypeScript types and the `computeSlots()` function. No React, no SVG — pure data transformation.

**Rationale**: The geometry is non-trivial (odd/even column assignment, double-pole row-span calculation, tandem slot packing). Writing it once and testing it independently prevents drift between web and mobile implementations. Both apps consume it as a dependency.

### 3. Double-pole breaker modeled as a single breaker record with a flag

**Decision**: A double-pole breaker is one `electrical_breakers` row with `breaker_type = 'double_pole'`. `computeSlots()` infers that it occupies slot `N` (left column) and slot `N+1` (right column) and spans two grid rows.

**Alternative considered**: Two separate breaker rows linked by a foreign key. Rejected — it complicates CRUD (must create/delete two rows atomically) and the editing surface (which row holds the label?). The single-record approach is simpler and sufficient for residential panels.

**Constraint**: A double-pole breaker MUST start on an odd slot. Validation enforced in both API and UI.

### 4. Drawer (web) / Bottom sheet (mobile) for editing

**Decision**: Clicking a breaker slot on web opens a Mantine `Drawer` from the right. Tapping on mobile opens a `@gorhom/bottom-sheet`. Both show the same fields: label, amps, type, GFCI, AFCI, area tag, notes.

**Rationale**: A Drawer gives enough vertical space for all fields without leaving the panel view. Bottom sheet is the standard mobile pattern for contextual editing. Both are non-destructive overlays — the panel diagram stays visible behind the edit surface.

### 5. CSS `@media print` (web) / `expo-print` (mobile) for printout

**Decision**: Web printout is a dedicated `<PanelPrintView>` component rendered only during print (`@media print` hides all other UI). Mobile generates an HTML string template and passes it to `expo-print`, then `expo-sharing` to share the PDF.

**Rationale**: CSS print avoids adding a PDF library dependency to the web bundle. `expo-print` is already in the Expo SDK ecosystem and requires no native rebuild. Both produce equivalent output: panel name header, two-column slot directory (slot# | label | amps).

### 6. Backend: two new tables, standard REST CRUD

**Decision**: `electrical_panels` and `electrical_breakers` as new postgres tables. REST endpoints scoped to home:
- `GET/POST /homes/:homeId/panels`
- `GET/PUT/DELETE /panels/:panelId`
- `GET/POST /panels/:panelId/breakers`
- `GET/PUT/DELETE /breakers/:breakerId`

`electrical_panels.fed_by_breaker_id` is a nullable FK to `electrical_breakers.id`, establishing the subpanel cross-reference.

**Rationale**: Consistent with existing patterns in the API. The home-scoped list endpoint naturally enforces access control (existing home membership check middleware). Separate breaker endpoints allow partial updates without re-sending the full panel.

### 7. Floor plan areas: data model now, annotation editor later

**Decision**: Add a `floor_plan_areas` table (id, home_id, name, color, geometry JSONB, document_id nullable FK to `home_documents`) and a nullable `floor_plan_area_id` FK on `electrical_breakers`. In this change, the geometry column is never written — it exists as a forward-compatible extension point. Users can create and name areas (name + color) and assign them to breakers. A future `floor-plan-area-drawing` change will add the polygon annotation editor and the floor plan highlight view.

The panel SVG color-codes breakers by their linked area's color. The breaker edit drawer shows an area picker (dropdown of named areas for the home). The `area_tag` free-text field is not used — the FK reference is the source of truth from day one.

**Rationale**: Avoids a later data migration from free-text tags to FK references. Named areas alone (without geometry) are immediately useful for color-coding the panel. The geometry column costs nothing to add now.

**Alternative considered**: Keep `area_tag` as free text and defer the entire floor plan areas feature. Rejected because it creates migration debt and means the breaker color scheme would be disconnected from the eventual area entity.

### 8. Pre-populated blank slots

**Decision**: The API does NOT auto-create blank breaker rows. `computeSlots()` in `panel-core` fills unoccupied slots up to `total_slots` (derived from `total_amps`) with synthetic blank slot objects. These are never persisted — they exist only for rendering. Clicking a blank slot opens the edit drawer pre-filled with `type: 'blank'`.

**Rationale**: Keeps the database lean (most slots start unknown/blank). Avoids needing a migration or cleanup job when panel size changes. The client always knows the full slot count from `panel.total_amps`.

## Risks / Trade-offs

- **SVG text layout on mobile** → `react-native-svg` `<Text>` does not support automatic word wrapping. Long breaker labels will be truncated at render time. Mitigation: enforce a max label length (40 chars) in the API and truncate in `computeSlots()`.
- **`@gorhom/bottom-sheet` setup complexity** → requires `react-native-reanimated` and `react-native-gesture-handler` (reanimated is already installed; gesture-handler may need adding). Mitigation: add gesture handler setup early in the mobile task sequence.
- **`fed_by_breaker_id` circular reference risk** → a panel could theoretically reference a breaker in itself as its feed. Mitigation: API validates that `fed_by_breaker_id` belongs to a breaker in a *different* panel.
- **Panel total_slots derivation** → mapping `total_amps` → slot count (e.g., 200A → 40 slots, 100A → 20 slots) is a heuristic, not a physical law. Some 200A panels have 30 or 42 slots. Mitigation: expose a `total_slots` field on the panel that defaults from `total_amps` but can be overridden by the user.

## Migration Plan

1. Add DB migration: `electrical_panels` and `electrical_breakers` tables
2. Deploy API with new endpoints (additive only — no existing endpoints change)
3. Deploy web with new tab (tab is invisible to users with no panels — no UX disruption)
4. Mobile ships in next app release

No rollback complexity — tables and endpoints are purely additive.

## Open Questions

*All open questions resolved.*

- **Area tags** → FK reference to `floor_plan_areas`, not free text. Named areas (name + color) managed at the home level. Geometry deferred to a follow-on change.
- **Subpanel deletion** → Blocked. API returns an error if the panel being deleted has any panels referencing it as `parent_panel_id`. User must delete subpanels first.
