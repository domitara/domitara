DROP INDEX IF EXISTS item_photos_one_cover_per_item;

ALTER TABLE item_photos DROP COLUMN is_cover;
