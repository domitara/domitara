## Why

Home inventory apps treat floor plans as static image attachments, making it impossible to spatially organize items, trace electrical circuits to their panels, or visualize room layouts. Adding interactive, layered floor plans turns Domitara into a spatial home management tool — linking physical space to items, electrical infrastructure, and room layout.

## What Changes

- Floor plan documents gain a dedicated "Floor Plans" tab in the Home Details view
- Each floor plan document is tagged with a floor level (Basement, Floor 1, Floor 2, Floor 3, etc.)
- The tab shows a floor switcher to navigate between uploaded floor plans
- **Electrical Zones layer**: draw colored polygons/zones on the floor plan; each zone links to an electrical panel/breaker
- **Home Layout layer**: draw shapes (rectangles, polygons) to represent furniture/fixtures; each shape can be linked to an Item
- Layer visibility can be toggled independently
- All annotations (zones, shapes, links) are stored per-floor and persist server-side

## Capabilities

### New Capabilities

- `floor-plan-viewer`: Floor plan tab in Home Details — upload detection, floor switcher, canvas viewer with zoom/pan
- `floor-plan-electrical-zones`: Draw and manage electrical zone overlays on a floor plan; link zones to electrical panels
- `floor-plan-home-layout`: Draw and manage furniture/fixture shape overlays; link shapes to Items

### Modified Capabilities

- `documents`: Floor plan documents are a subtype of document — need floor-level metadata field and floor-plan flag; existing document upload flow gains floor plan detection/tagging

## Impact

- **Frontend (`apps/web`)**: New route/tab under Home Details; canvas rendering (likely Konva.js or a lightweight SVG approach); new components for zone/shape drawing, layer controls, floor switcher
- **Backend (`apps/api`)**: New DB columns/tables for floor plan metadata (floor level), zone annotations, layout shape annotations, and their item/panel links; new API endpoints for CRUD on annotations
- **DB migrations**: New tables — `floor_plan_annotations_electrical`, `floor_plan_annotations_layout`; new column on `documents` — `floor_level`, `is_floor_plan`
- **No breaking changes** to existing document or item APIs; additive only
