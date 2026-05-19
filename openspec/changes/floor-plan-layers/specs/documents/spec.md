## ADDED Requirements

### Requirement: Floor level metadata on floor plan documents
The system SHALL store a floor_level integer on home_documents records where document_type = 'floor_plan'.

#### Scenario: floor_level column exists
- **WHEN** a floor plan document is created or updated
- **THEN** the system SHALL accept an optional floor_level integer (0 = basement, 1 = ground floor, 2+ = upper floors; NULL = unassigned)

#### Scenario: Update floor level via PATCH
- **WHEN** PATCH /homes/{homeId}/documents/{documentId} is called with a floor_level value
- **THEN** the home_document record SHALL be updated with the new floor_level

#### Scenario: floor_level returned in document API response
- **WHEN** GET /homes/{homeId}/documents is called
- **THEN** each document in the response SHALL include its floor_level field (null if not set)

### Requirement: Floor plan documents uploadable from Floor Plans tab
The system SHALL allow uploading floor plan documents directly from the Floor Plans tab in addition to the Documents tab.

#### Scenario: Upload button in Floor Plans tab
- **WHEN** the Floor Plans tab is open
- **THEN** an "Upload Floor Plan" button SHALL be present

#### Scenario: Upload sets document_type automatically
- **WHEN** a document is uploaded from the Floor Plans tab
- **THEN** the document SHALL be created with document_type = 'floor_plan' without requiring the user to select a type
