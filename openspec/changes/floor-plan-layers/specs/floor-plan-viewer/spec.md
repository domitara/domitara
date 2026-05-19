## ADDED Requirements

### Requirement: Floor Plans tab in Home Details
The system SHALL display a "Floor Plans" tab in the Home Details view alongside the existing Details, Photos, Documents, Members, and Electrical Panels tabs.

#### Scenario: Tab is always visible
- **WHEN** a user opens the Home Details view
- **THEN** the "Floor Plans" tab SHALL be present in the tab bar regardless of whether any floor plan documents exist

#### Scenario: Empty state when no floor plans
- **WHEN** no home_documents with document_type = 'floor_plan' exist for the home
- **THEN** the tab content SHALL display a prompt to upload a floor plan document

### Requirement: Floor switcher navigation
The system SHALL allow users to switch between floor plan documents by floor level within the Floor Plans tab.

#### Scenario: Floor level buttons rendered
- **WHEN** one or more floor plan documents exist for the home
- **THEN** the tab SHALL display a segmented control or button group listing each floor (e.g., "Basement", "Floor 1", "Floor 2") based on the floor_level of each document

#### Scenario: Selecting a floor
- **WHEN** the user selects a floor in the switcher
- **THEN** the canvas SHALL load and display the corresponding floor plan document image

#### Scenario: Documents without floor_level
- **WHEN** a floor plan document has a NULL floor_level
- **THEN** it SHALL appear in the switcher labeled "Unassigned" and remain selectable

### Requirement: Floor plan image canvas with zoom and pan
The system SHALL render the floor plan image on an interactive canvas that supports zoom and pan.

#### Scenario: Image displayed on canvas load
- **WHEN** a floor plan document is selected
- **THEN** the canvas SHALL display the image scaled to fit the available container width while maintaining aspect ratio

#### Scenario: Zoom with scroll wheel
- **WHEN** the user scrolls the mouse wheel over the canvas
- **THEN** the canvas SHALL zoom in or out centered on the cursor position

#### Scenario: Pan by drag
- **WHEN** the user clicks and drags on the canvas background (not on a shape)
- **THEN** the canvas SHALL pan the viewport in the direction of the drag

#### Scenario: Reset zoom
- **WHEN** the user clicks a "Reset View" control
- **THEN** the canvas SHALL return to the default fit-to-container zoom and centered position

### Requirement: Layer visibility toggle
The system SHALL provide controls to show or hide each annotation layer independently.

#### Scenario: Layer toggles in toolbar
- **WHEN** the Floor Plans tab is active with a floor plan loaded
- **THEN** the toolbar SHALL display toggle buttons for "Electrical Zones" and "Home Layout" layers

#### Scenario: Hiding a layer
- **WHEN** the user toggles a layer off
- **THEN** all shapes on that layer SHALL become invisible on the canvas without being deleted

#### Scenario: Showing a layer
- **WHEN** the user toggles a layer back on
- **THEN** all shapes on that layer SHALL reappear on the canvas

### Requirement: Set floor level on a floor plan document
The system SHALL allow users to assign or change the floor level of a floor plan document.

#### Scenario: Floor level selector on document
- **WHEN** a floor plan document is displayed in the floor plan tab or documents tab
- **THEN** a floor level selector (Basement / Floor 1 / Floor 2 / Floor 3 / Unassigned) SHALL be available

#### Scenario: Saving floor level
- **WHEN** the user changes the floor level and confirms
- **THEN** the system SHALL PATCH the document record with the new floor_level value and update the floor switcher
