-- name: ListItemPhotos :many
SELECT id, item_id, filename, content_type, file_path, created_at
FROM item_photos WHERE item_id = $1 ORDER BY created_at ASC;

-- name: GetItemPhotoFilePath :one
SELECT file_path FROM item_photos WHERE id = $1 AND item_id = $2;

-- name: CreateItemPhoto :one
INSERT INTO item_photos (item_id, filename, content_type, file_path)
VALUES ($1, $2, $3, 'pending')
RETURNING id, item_id, filename, content_type, file_path, created_at;

-- name: UpdateItemPhotoPath :exec
UPDATE item_photos SET file_path = $1 WHERE id = $2;

-- name: DeleteItemPhoto :exec
DELETE FROM item_photos WHERE id = $1;
