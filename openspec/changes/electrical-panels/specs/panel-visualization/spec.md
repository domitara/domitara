## ADDED Requirements

### Requirement: Render realistic two-column panel diagram
The system SHALL render an electrical panel as an SVG diagram with a dark background, a full-width main breaker slot at the top, and a two-column grid below where odd-numbered slots occupy the left column and even-numbered slots occupy the right column.

#### Scenario: Odd/even column assignment
- **WHEN** a panel with slots 1–8 is rendered
- **THEN** slots 1, 3, 5, 7 appear in the left column and slots 2, 4, 6, 8 appear in the right column, in top-to-bottom order

#### Scenario: Main breaker rendered at top
- **WHEN** a breaker with `breaker_type: "main"` exists in the panel
- **THEN** it is rendered as a full-width slot spanning both columns above the regular slot grid

### Requirement: Double-pole breakers span both columns
A breaker with `breaker_type: "double_pole"` SHALL be rendered as a single slot spanning both columns across the two rows corresponding to its slot number and the adjacent even slot, with a visual connector bar between the two halves.

#### Scenario: Double-pole visual span
- **WHEN** a double-pole breaker occupies slot 3 (left) and slot 4 (right)
- **THEN** it renders as one merged block with a connecting bar, spanning rows 2 and 3 of the grid

### Requirement: Unoccupied slots rendered as blank
Slots with no persisted breaker record SHALL be rendered using synthetic blank slot objects from `computeSlots()`. They SHALL be visually distinct (dimmed) and labeled with their slot number only.

#### Scenario: Blank slot in sequence
- **WHEN** slot 7 has no breaker record
- **THEN** a dimmed slot labeled "7" is rendered in position

### Requirement: Unknown/unlabeled slots have amber tint
A persisted breaker slot with no `label` value SHALL render with an amber background tint to indicate it is documented but not yet labeled.

#### Scenario: Unlabeled breaker tint
- **WHEN** a breaker exists at slot 5 with `label: ""`
- **THEN** the slot renders with an amber background

### Requirement: Breakers color-coded by floor plan area
When a breaker has a `floor_plan_area_id`, the slot SHALL render using the area's `color` value as an accent. The panel diagram SHALL include a legend listing all areas present in that panel.

#### Scenario: Area color on slot
- **WHEN** slot 1 is assigned to area "Kitchen" with color `#4CAF50`
- **THEN** the slot renders with a green accent and "Kitchen" appears in the legend

#### Scenario: No area assigned
- **WHEN** a breaker has no `floor_plan_area_id`
- **THEN** the slot renders with a neutral color and does not appear in the legend

### Requirement: Clicking or tapping a slot opens the edit UI
On web, clicking any slot SHALL open the breaker edit Drawer. On mobile, tapping any slot SHALL open the breaker edit bottom sheet. Both blank and occupied slots SHALL be tappable.

#### Scenario: Click blank slot
- **WHEN** a user clicks an unoccupied slot
- **THEN** the edit Drawer opens pre-filled with the slot number and `breaker_type: "blank"`

#### Scenario: Click occupied slot
- **WHEN** a user clicks a slot with an existing breaker record
- **THEN** the edit Drawer opens with all fields populated from that breaker's data

### Requirement: Shared geometry via computeSlots()
The `computeSlots(panel, breakers)` function in `packages/panel-core` SHALL return a `SlotGeometry[]` array with the position, span, and render properties for every slot (occupied and unoccupied). Both the web SVG component and the mobile SVG component SHALL consume this function as their sole source of layout truth.

#### Scenario: computeSlots output for a simple panel
- **WHEN** `computeSlots` is called with a 200A panel and two breakers at slots 1 and 3 (double-pole)
- **THEN** it returns geometry objects for slots 1 (left col, row 1, single), 2 (right col, row 1, blank), 3+4 (double-pole, spans both cols, rows 2–3), and blank entries for remaining slots up to total_slots
