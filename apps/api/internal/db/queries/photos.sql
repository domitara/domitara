-- name: ListItemPhotos :many
SELECT id, item_id, filename, content_type, file_path, thumbnail_path, is_cover, created_at
FROM item_photos WHERE item_id = $1 ORDER BY created_at ASC;

-- name: GetItemPhotoFilePath :one
SELECT file_path, thumbnail_path, is_cover FROM item_photos WHERE id = $1 AND item_id = $2;

-- name: CountItemPhotos :one
SELECT count(*) FROM item_photos WHERE item_id = $1;

-- name: CreateItemPhoto :one
INSERT INTO item_photos (item_id, filename, content_type, file_path, is_cover)
VALUES ($1, $2, $3, 'pending', $4)
RETURNING id, item_id, filename, content_type, file_path, thumbnail_path, is_cover, created_at;

-- name: UpdateItemPhotoPath :exec
UPDATE item_photos SET file_path = $1, thumbnail_path = $2 WHERE id = $3;

-- name: SetItemPhotoCover :exec
UPDATE item_photos SET is_cover = (id = $2) WHERE item_id = $1;

-- name: PromoteOldestPhotoToCover :exec
UPDATE item_photos ip SET is_cover = true
WHERE ip.item_id = $1 AND ip.id = (
    SELECT id FROM item_photos WHERE item_id = $1 ORDER BY created_at ASC LIMIT 1
);

-- name: DeleteItemPhoto :exec
DELETE FROM item_photos WHERE id = $1;
