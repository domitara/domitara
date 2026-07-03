DROP INDEX IF EXISTS items_location_id_grid_row_grid_col_idx;
DROP INDEX IF EXISTS items_tier_idx;
DROP INDEX IF EXISTS locations_location_type_idx;

ALTER TABLE items DROP CONSTRAINT items_grid_cell_paired;
ALTER TABLE items DROP COLUMN grid_col;
ALTER TABLE items DROP COLUMN grid_row;
ALTER TABLE items DROP COLUMN tier;

ALTER TABLE locations DROP CONSTRAINT locations_grid_requires_container;
ALTER TABLE locations DROP COLUMN grid_cols;
ALTER TABLE locations DROP COLUMN grid_rows;
ALTER TABLE locations DROP COLUMN location_type;
