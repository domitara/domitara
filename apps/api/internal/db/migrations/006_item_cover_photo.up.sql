ALTER TABLE item_photos ADD COLUMN is_cover BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX item_photos_one_cover_per_item ON item_photos (item_id) WHERE is_cover;

-- Backfill: mark each item's oldest photo as its cover.
UPDATE item_photos ip SET is_cover = true
WHERE ip.id = (
    SELECT id FROM item_photos WHERE item_id = ip.item_id ORDER BY created_at ASC LIMIT 1
);
