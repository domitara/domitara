## ADDED Requirements

### Requirement: Display electrical zone overlays on canvas
The system SHALL render floor_plan_areas records as colored polygon overlays on the floor plan canvas when the Electrical Zones layer is visible.

#### Scenario: Zones rendered for current floor
- **WHEN** the Electrical Zones layer is enabled and a floor plan is loaded
- **THEN** all floor_plan_areas records with document_id matching the current floor plan document SHALL be rendered as semi-transparent filled polygons in their assigned color

#### Scenario: Zones for other floors are not shown
- **WHEN** a different floor is selected in the floor switcher
- **THEN** only zones linked to that floor's document_id SHALL be rendered

#### Scenario: Zone name rendered as canvas label
- **WHEN** a zone polygon is rendered on the canvas
- **THEN** the zone's name SHALL be displayed as text centered within the polygon

#### Scenario: Zone with no geometry is not rendered
- **WHEN** a floor_plan_area has a NULL geometry field
- **THEN** it SHALL NOT be rendered on the canvas

### Requirement: Draw a new electrical zone polygon
The system SHALL allow users to draw a new polygon zone on the floor plan canvas.

#### Scenario: Entering draw mode
- **WHEN** the user clicks "Draw Zone" in the Electrical Zones layer toolbar
- **THEN** the canvas SHALL enter polygon draw mode and the cursor SHALL indicate drawing is active

#### Scenario: Placing polygon vertices
- **WHEN** in draw mode and the user clicks on the canvas
- **THEN** a vertex SHALL be placed at that point and a preview edge SHALL extend to the cursor

#### Scenario: Closing the polygon
- **WHEN** in draw mode and the user clicks on the first vertex (or double-clicks)
- **THEN** the polygon SHALL be closed, draw mode SHALL exit, and a dialog SHALL open to name and color the zone

#### Scenario: Saving the new zone
- **WHEN** the user enters a name and optionally a color and confirms
- **THEN** the system SHALL POST to create a new floor_plan_area with the polygon geometry, name, color, and document_id of the current floor plan

#### Scenario: Cancelling draw mode
- **WHEN** in draw mode and the user presses Escape
- **THEN** draw mode SHALL exit and no zone SHALL be created

### Requirement: Edit an existing electrical zone
The system SHALL allow users to move and reshape existing zone polygons.

#### Scenario: Selecting a zone
- **WHEN** the user clicks on a zone polygon
- **THEN** the zone SHALL be selected and its vertices SHALL be displayed as draggable handles

#### Scenario: Moving a vertex
- **WHEN** a zone is selected and the user drags a vertex handle
- **THEN** the polygon geometry SHALL update in real time and the updated geometry SHALL be saved on drag end

#### Scenario: Moving the whole zone
- **WHEN** a zone is selected and the user drags the zone body (not a vertex)
- **THEN** all vertices SHALL translate by the same delta and the updated geometry SHALL be saved on drag end

### Requirement: Delete an electrical zone
The system SHALL allow users to delete a floor_plan_area zone.

#### Scenario: Delete via context menu or toolbar
- **WHEN** a zone is selected and the user clicks "Delete Zone"
- **THEN** a confirmation dialog SHALL appear

#### Scenario: Confirming deletion
- **WHEN** the user confirms the delete dialog
- **THEN** the zone SHALL be removed from the canvas and deleted via the API

### Requirement: Link electrical zone to a panel
The system SHALL display which electrical panel a zone is associated with and allow users to change that association.

#### Scenario: Zone panel badge on canvas
- **WHEN** a zone has at least one breaker with floor_plan_area_id pointing to it
- **THEN** a small badge SHALL appear on the zone showing the panel name

#### Scenario: Assigning a zone to a panel via breaker edit
- **WHEN** a user edits a breaker in the Electrical Panels tab
- **THEN** they SHALL be able to select a floor plan zone from a dropdown (existing behavior, no change required)
