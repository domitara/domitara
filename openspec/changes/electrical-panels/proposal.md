## Why

Homeowners frequently need to document and look up their electrical panel breaker layouts — during renovations, emergencies, or when adding circuits — but have no structured place to store this information. Domitara already tracks home details, documents, and maintenance; electrical panels are a natural extension that closes a real gap in home documentation.

## What Changes

- New "Electrical Panels" tab added to the My Home screen (web and mobile)
- Users can create and manage multiple panels per home (main panel + subpanels)
- Each panel renders as a realistic two-column SVG breaker grid with dark panel styling
- Each breaker slot is editable (label, amps, type, GFCI/AFCI flags, area tag, notes) via a Drawer (web) or bottom sheet (mobile)
- Subpanels are cross-referenced to a specific breaker slot in the parent panel
- Breakers are color-coded by area/room tag; unlabeled slots have a distinct amber state
- A printable directory view (web: CSS print, mobile: expo-print PDF) generates a clean slot→label→amps list suitable for taping inside the panel door
- New `packages/panel-core` workspace package with shared TypeScript types and slot geometry computation
- New Go API tables and CRUD endpoints: `electrical_panels`, `electrical_breakers`

## Capabilities

### New Capabilities

- `electrical-panels`: Manage multiple electrical panels per home — create, rename, reorder, and delete panels; model the parent→subpanel relationship via a fed-by breaker slot reference
- `electrical-breakers`: Document individual breaker slots within a panel — label, amperage, type (standard/double-pole/tandem/blank/main), protection flags (GFCI/AFCI), area tag, and notes
- `panel-visualization`: Render a realistic SVG panel diagram (dark background, two-column slot grid, double-pole spans, color-coded area tags, amber unknown state) on both web and mobile via shared geometry logic
- `panel-print`: Generate a clean breaker directory (slot# | label | amps) for physical posting inside the panel; web via CSS `@media print`, mobile via `expo-print` PDF
- `floor-plan-areas`: Define named color-coded zones (e.g. "Kitchen", "Master Bedroom") scoped to a home; breakers reference a zone by FK instead of free-text tag; geometry column exists in the DB for a future annotation editor but is not populated in this change

### Modified Capabilities

## Impact

- **Web (`apps/web`)**: New `ElectricalPanelsTab` component in `HomeDetailScreen`; named area manager UI; new API query hooks; new SVG panel component; new Mantine Drawer edit form; CSS print stylesheet
- **Mobile (`apps/mobile`)**: New electrical panels screen/tab; `react-native-svg` dependency; `@gorhom/bottom-sheet` dependency; `expo-print` + `expo-sharing` dependencies
- **Shared (`packages/panel-core`)**: New workspace package — TypeScript types for panels/breakers/areas, `computeSlots()` geometry function
- **API (`apps/api`)**: Three new DB tables (`electrical_panels`, `electrical_breakers`, `floor_plan_areas`), DB migration, sqlc queries, CRUD handlers for panels, breakers, and floor-plan areas
- **No breaking changes** to existing endpoints or data models
