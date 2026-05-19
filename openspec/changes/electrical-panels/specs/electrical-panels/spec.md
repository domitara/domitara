## ADDED Requirements

### Requirement: Create electrical panel for a home
A home SHALL support one or more electrical panels. A user with owner or member access to the home SHALL be able to create a panel by providing a name, total amperage, optional location note, and optional total slot count override. The system SHALL default total slots based on total amperage (100A → 20 slots, 150A → 30 slots, 200A → 40 slots, 400A → 84 slots) but allow the user to override this value.

#### Scenario: Create a main panel
- **WHEN** a user POSTs to `/homes/:homeId/panels` with `{ name: "Main Panel", total_amps: 200 }`
- **THEN** the system creates the panel with `total_slots` defaulting to 40 and returns the new panel with status 201

#### Scenario: Override total slots
- **WHEN** a user POSTs with `total_amps: 200` and `total_slots: 42`
- **THEN** the system stores `total_slots: 42` instead of the default 40

#### Scenario: Missing required name
- **WHEN** a user POSTs without a `name` field
- **THEN** the system returns status 422 with a validation error

### Requirement: List panels for a home
The system SHALL return all panels belonging to a home in `sort_order` ascending order.

#### Scenario: No panels yet
- **WHEN** a user GETs `/homes/:homeId/panels` and no panels exist
- **THEN** the system returns an empty array with status 200

#### Scenario: Multiple panels ordered
- **WHEN** two panels exist with `sort_order` 1 and 2
- **THEN** the GET response returns them in ascending sort_order sequence

### Requirement: Update panel metadata
A user SHALL be able to rename a panel, change its total amperage, location note, total slots, and sort order via PUT `/panels/:panelId`.

#### Scenario: Rename panel
- **WHEN** a user PUTs `/panels/:panelId` with `{ name: "Garage Subpanel" }`
- **THEN** the panel name is updated and the response reflects the new name

### Requirement: Create subpanel with parent reference
A panel MAY reference another panel as its parent via `parent_panel_id`. A subpanel MAY also reference a specific breaker in the parent panel via `fed_by_breaker_id`, establishing the physical feed cross-reference.

#### Scenario: Create a subpanel linked to a breaker
- **WHEN** a user POSTs with `{ name: "Garage", parent_panel_id: "<mainId>", fed_by_breaker_id: "<breakerId>" }`
- **THEN** the system creates the subpanel with both FK references populated

#### Scenario: fed_by_breaker_id must belong to a different panel
- **WHEN** a user POSTs with `fed_by_breaker_id` pointing to a breaker in the same panel being created
- **THEN** the system returns status 422

### Requirement: Delete panel
A user SHALL be able to delete a panel. Deletion SHALL be blocked if any other panel references this panel as its `parent_panel_id`.

#### Scenario: Delete panel with no subpanels
- **WHEN** a user DELETEs `/panels/:panelId` and no panels reference it as parent
- **THEN** the panel and all its breakers are deleted, returning status 204

#### Scenario: Delete blocked by subpanel
- **WHEN** a user DELETEs `/panels/:panelId` and at least one other panel has `parent_panel_id` = this panel's id
- **THEN** the system returns status 409 with an error message explaining that subpanels must be deleted first

### Requirement: Panel scoped to home access control
All panel endpoints SHALL enforce that the requesting user is a member or owner of the home the panel belongs to.

#### Scenario: Non-member access
- **WHEN** a user who is not a member of the home requests any panel endpoint for that home
- **THEN** the system returns status 403
