## ADDED Requirements

### Requirement: Create named floor plan area for a home
A user SHALL be able to create a named zone (e.g. "Kitchen", "Master Bedroom") scoped to a home by providing a name and a display color. The system SHALL store a `geometry` JSONB column that defaults to null; this column is reserved for a future annotation editor and SHALL NOT be populated by this change.

#### Scenario: Create a named area
- **WHEN** a user POSTs to `/homes/:homeId/floor-plan-areas` with `{ name: "Kitchen", color: "#4CAF50" }`
- **THEN** the system creates the area with `geometry: null` and returns it with status 201

#### Scenario: Missing name
- **WHEN** a user POSTs without a `name` field
- **THEN** the system returns status 422

#### Scenario: Invalid color format
- **WHEN** a user POSTs with a `color` value that is not a valid hex color string
- **THEN** the system returns status 422

### Requirement: List floor plan areas for a home
The system SHALL return all floor plan areas for a home ordered by name ascending.

#### Scenario: List areas
- **WHEN** a user GETs `/homes/:homeId/floor-plan-areas`
- **THEN** the system returns all areas for that home, ordered alphabetically by name

### Requirement: Update a floor plan area
A user SHALL be able to rename an area or change its color via PUT `/floor-plan-areas/:areaId`.

#### Scenario: Rename area
- **WHEN** a user PUTs with `{ name: "Living Room" }`
- **THEN** the area name is updated; color and geometry are unchanged

### Requirement: Delete a floor plan area
A user SHALL be able to delete a floor plan area. Deletion SHALL set `floor_plan_area_id` to null on any breakers that reference this area (cascading null, not cascade delete of the breaker).

#### Scenario: Delete area referenced by breakers
- **WHEN** a user DELETEs an area that is referenced by one or more breakers
- **THEN** the area is deleted and all referencing breakers have their `floor_plan_area_id` set to null

#### Scenario: Delete area with no references
- **WHEN** a user DELETEs an area with no breaker references
- **THEN** the area is deleted and the endpoint returns status 204

### Requirement: Area picker in breaker edit UI
The breaker edit form (Drawer on web, bottom sheet on mobile) SHALL display a dropdown or selector showing all named floor plan areas for the home. The user MAY select one area or clear the selection to assign or unassign the breaker.

#### Scenario: Select area for breaker
- **WHEN** a user opens the breaker edit form and selects "Kitchen" from the area picker
- **THEN** saving updates the breaker's `floor_plan_area_id` to the Kitchen area's id

#### Scenario: Clear area assignment
- **WHEN** a user clears the area selection and saves
- **THEN** the breaker's `floor_plan_area_id` is set to null

### Requirement: Area geometry is reserved but not editable
The `geometry` column on `floor_plan_areas` SHALL exist in the database schema but SHALL NOT be exposed as a writable field in any API endpoint in this change. No UI for drawing or editing geometry SHALL be present.

#### Scenario: Geometry not accepted via API
- **WHEN** a user POSTs or PUTs a floor plan area with a `geometry` field
- **THEN** the field is ignored and the response contains `geometry: null`
