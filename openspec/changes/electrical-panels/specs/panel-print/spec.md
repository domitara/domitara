## ADDED Requirements

### Requirement: Generate printable breaker directory on web
The web app SHALL provide a "Print directory" action on the panel view that triggers the browser print dialog. A `PanelPrintView` component SHALL be rendered only during print (via CSS `@media print`) and SHALL hide all other UI. The printout SHALL contain: home name, panel name, generation date, and a two-column slot directory table with columns: slot number, label, and amperage.

#### Scenario: Print directory triggered
- **WHEN** a user clicks "Print directory"
- **THEN** the browser print dialog opens and the preview shows only the panel directory content

#### Scenario: Print layout content
- **WHEN** the print view renders
- **THEN** it contains a header with home name and panel name, and a table row for every slot (1 through total_slots) ordered by slot number

#### Scenario: Double-pole entry in printout
- **WHEN** a double-pole breaker occupies slots 3–4
- **THEN** the printout shows a single row spanning slots 3–4 with the breaker label and amps

#### Scenario: Blank slot in printout
- **WHEN** a slot has no breaker record
- **THEN** the printout shows the slot number with an empty label cell and an empty amps cell

### Requirement: Generate shareable PDF directory on mobile
The mobile app SHALL provide a "Share directory" action that generates a PDF from an HTML template via `expo-print` and opens the system share sheet via `expo-sharing`.

#### Scenario: Share directory triggered
- **WHEN** a user taps "Share directory"
- **THEN** `expo-print` generates a PDF from the HTML template and `expo-sharing` opens the native share sheet

#### Scenario: PDF content matches web printout
- **WHEN** the PDF is generated
- **THEN** it contains the same information as the web printout: home name, panel name, generation date, and a slot directory table

### Requirement: Printout is minimal and functional
The printed/PDF output SHALL use a clean, minimal layout with no dark panel styling, no SVG diagram, and no color-coding. It SHALL be legible when printed in black and white on a standard printer and fit on a single page for panels up to 42 slots.

#### Scenario: Black and white legibility
- **WHEN** the directory is printed without color
- **THEN** all slot entries are clearly distinguishable with no reliance on color to convey information
