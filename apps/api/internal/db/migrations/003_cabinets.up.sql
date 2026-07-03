ALTER TABLE locations ADD COLUMN location_type TEXT NOT NULL DEFAULT 'room'
    CHECK (location_type IN ('room', 'container'));
ALTER TABLE locations ADD COLUMN grid_rows INT CHECK (grid_rows IS NULL OR grid_rows > 0);
ALTER TABLE locations ADD COLUMN grid_cols INT CHECK (grid_cols IS NULL OR grid_cols > 0);
ALTER TABLE locations ADD CONSTRAINT locations_grid_requires_container
    CHECK (location_type = 'container' OR (grid_rows IS NULL AND grid_cols IS NULL));

ALTER TABLE items ADD COLUMN tier TEXT NOT NULL DEFAULT 'full' CHECK (tier IN ('quick', 'full'));
ALTER TABLE items ADD COLUMN grid_row INT CHECK (grid_row IS NULL OR grid_row >= 0);
ALTER TABLE items ADD COLUMN grid_col INT CHECK (grid_col IS NULL OR grid_col >= 0);
ALTER TABLE items ADD CONSTRAINT items_grid_cell_paired
    CHECK ((grid_row IS NULL) = (grid_col IS NULL));

CREATE INDEX ON locations(location_type);
CREATE INDEX ON items(tier);
CREATE INDEX ON items(location_id, grid_row, grid_col);
