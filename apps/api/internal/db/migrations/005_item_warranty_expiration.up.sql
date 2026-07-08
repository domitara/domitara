ALTER TABLE items ADD COLUMN warranty_expires_at DATE;

CREATE INDEX ON items(warranty_expires_at);
