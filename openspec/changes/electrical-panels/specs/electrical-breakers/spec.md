## ADDED Requirements

### Requirement: List breaker slots for a panel
The system SHALL return all persisted breaker records for a panel ordered by `slot` ascending.

#### Scenario: List breakers
- **WHEN** a user GETs `/panels/:panelId/breakers`
- **THEN** the system returns all breaker records for that panel ordered by slot number

### Requirement: Create or update a breaker slot
A user SHALL be able to set the properties of a breaker slot by POSTing to `/panels/:panelId/breakers`. Fields: `slot` (integer, 1-based), `label` (max 40 chars), `amps` (one of: 15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 125, 150, 200), `breaker_type` (one of: `standard`, `double_pole`, `tandem`, `blank`, `main`), `is_gfci` (bool), `is_afci` (bool), `notes` (free text), `floor_plan_area_id` (nullable FK to `floor_plan_areas`).

#### Scenario: Create a labeled breaker
- **WHEN** a user POSTs `{ slot: 1, label: "Kitchen outlets", amps: 20, breaker_type: "standard", is_gfci: true }`
- **THEN** the system creates the breaker record and returns it with status 201

#### Scenario: Label exceeds max length
- **WHEN** a user POSTs with a label longer than 40 characters
- **THEN** the system returns status 422

#### Scenario: Invalid amps value
- **WHEN** a user POSTs with `amps: 17` (not in the allowed list)
- **THEN** the system returns status 422

### Requirement: Double-pole breaker occupies two consecutive slots
A breaker with `breaker_type: "double_pole"` SHALL occupy its declared slot (which MUST be odd) and the following even slot. No other breaker record may exist for the adjacent even slot while a double-pole occupies it.

#### Scenario: Double-pole on odd slot
- **WHEN** a user POSTs `{ slot: 3, breaker_type: "double_pole", amps: 60 }`
- **THEN** the system creates the record; `computeSlots()` renders it spanning slots 3 and 4

#### Scenario: Double-pole on even slot rejected
- **WHEN** a user POSTs `{ slot: 4, breaker_type: "double_pole" }`
- **THEN** the system returns status 422 with message that double-pole breakers must start on an odd slot

#### Scenario: Conflict with existing breaker in adjacent slot
- **WHEN** a breaker already exists at slot 4 and a user POSTs a double-pole at slot 3
- **THEN** the system returns status 409 indicating slot conflict

### Requirement: Update breaker properties
A user SHALL be able to update any breaker field via PUT `/breakers/:breakerId`.

#### Scenario: Update label
- **WHEN** a user PUTs `/breakers/:breakerId` with `{ label: "Master bedroom" }`
- **THEN** the label is updated; all other fields are unchanged

### Requirement: Delete a breaker record
A user SHALL be able to delete a breaker record via DELETE `/breakers/:breakerId`. After deletion, the slot reverts to an unoccupied (blank) state as computed by the client.

#### Scenario: Delete breaker
- **WHEN** a user DELETEs `/breakers/:breakerId`
- **THEN** the record is removed and the endpoint returns status 204

### Requirement: Assign floor plan area to breaker
A breaker MAY reference a `floor_plan_area_id` to associate it with a named home zone.

#### Scenario: Assign area
- **WHEN** a user PUTs a breaker with a valid `floor_plan_area_id`
- **THEN** the breaker is updated with that area reference

#### Scenario: Area from different home rejected
- **WHEN** a user PUTs a breaker with a `floor_plan_area_id` that belongs to a different home
- **THEN** the system returns status 422
