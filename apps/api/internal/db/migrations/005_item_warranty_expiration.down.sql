DROP INDEX IF EXISTS items_warranty_expires_at_idx;

ALTER TABLE items DROP COLUMN warranty_expires_at;
