## ADDED Requirements

### Requirement: Display home layout shapes on canvas
The system SHALL render floor_plan_shapes records as colored overlays on the floor plan canvas when the Home Layout layer is visible.

#### Scenario: Shapes rendered for current floor
- **WHEN** the Home Layout layer is enabled and a floor plan is loaded
- **THEN** all floor_plan_shapes records with document_id matching the current floor plan document SHALL be rendered as semi-transparent filled polygons in their assigned color

#### Scenario: Shapes for other floors are not shown
- **WHEN** a different floor is selected in the floor switcher
- **THEN** only shapes linked to that floor's document_id SHALL be rendered

#### Scenario: Shape with linked item shows label
- **WHEN** a floor_plan_shape has a non-null item_id and a label
- **THEN** the shape SHALL display its label text centered within the shape on the canvas

### Requirement: Draw a new home layout shape
The system SHALL allow users to draw rectangle or polygon shapes on the floor plan canvas representing furniture, fixtures, or rooms.

#### Scenario: Entering rectangle draw mode
- **WHEN** the user clicks "Draw Rectangle" in the Home Layout layer toolbar
- **THEN** the canvas SHALL enter rectangle draw mode

#### Scenario: Drawing a rectangle
- **WHEN** in rectangle draw mode and the user click-drags on the canvas
- **THEN** a rectangle preview SHALL follow the drag and be finalized on mouse up

#### Scenario: Entering polygon draw mode
- **WHEN** the user clicks "Draw Shape" in the Home Layout layer toolbar
- **THEN** the canvas SHALL enter polygon draw mode (same behavior as electrical zone drawing)

#### Scenario: Saving the new shape
- **WHEN** a shape drawing is complete
- **THEN** a dialog SHALL open to set the label, color, and optionally link to an Item

#### Scenario: Cancelling draw mode
- **WHEN** in draw mode and the user presses Escape
- **THEN** draw mode SHALL exit and no shape SHALL be created

### Requirement: Edit a home layout shape
The system SHALL allow users to move and reshape existing home layout shapes.

#### Scenario: Selecting a shape
- **WHEN** the user clicks on a layout shape
- **THEN** the shape SHALL be selected and its vertices SHALL be displayed as draggable handles

#### Scenario: Moving a vertex
- **WHEN** a shape is selected and the user drags a vertex handle
- **THEN** the polygon geometry SHALL update in real time and the updated geometry SHALL be saved on drag end

#### Scenario: Moving the whole shape
- **WHEN** a shape is selected and the user drags the shape body (not a vertex)
- **THEN** all vertices SHALL translate and the updated geometry SHALL be saved on drag end

### Requirement: Delete a home layout shape
The system SHALL allow users to delete a floor_plan_shape.

#### Scenario: Delete via context menu or toolbar
- **WHEN** a shape is selected and the user clicks "Delete Shape"
- **THEN** a confirmation dialog SHALL appear and on confirmation the shape SHALL be deleted via the API

### Requirement: Link a home layout shape to an Item
The system SHALL allow users to associate a layout shape with an existing Item in the home inventory.

#### Scenario: Item selector in shape dialog
- **WHEN** the shape creation or edit dialog is open
- **THEN** an optional "Link to Item" searchable select SHALL list all items belonging to the current home

#### Scenario: Saving item link
- **WHEN** the user selects an item and saves the shape
- **THEN** the floor_plan_shape record SHALL store the item_id and the shape SHALL display the item name as its label

#### Scenario: Removing item link
- **WHEN** the user clears the item selector and saves
- **THEN** the item_id SHALL be set to NULL on the shape record

### Requirement: Home layout shape API (backend)
The system SHALL expose CRUD endpoints for floor_plan_shapes.

#### Scenario: List shapes for a home
- **WHEN** GET /homes/{homeId}/floor-plan-shapes is called with valid auth
- **THEN** all floor_plan_shapes for that home SHALL be returned as JSON

#### Scenario: Create shape
- **WHEN** POST /homes/{homeId}/floor-plan-shapes is called with valid geometry, color, label, document_id
- **THEN** a new floor_plan_shape SHALL be created and returned with HTTP 201

#### Scenario: Update shape
- **WHEN** PATCH /floor-plan-shapes/{id} is called with updated fields
- **THEN** the shape SHALL be updated and the updated record returned

#### Scenario: Delete shape
- **WHEN** DELETE /floor-plan-shapes/{id} is called
- **THEN** the shape SHALL be deleted and HTTP 204 returned
