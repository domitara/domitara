-- name: ListItemDocuments :many
SELECT id, item_id, filename, content_type, file_path, size, created_at
FROM item_documents WHERE item_id = $1 ORDER BY created_at ASC;

-- name: GetItemDocumentFilePath :one
SELECT file_path FROM item_documents WHERE id = $1 AND item_id = $2;

-- name: CreateItemDocument :one
INSERT INTO item_documents (item_id, filename, content_type, file_path, size)
VALUES ($1, $2, $3, 'pending', 0)
RETURNING id, item_id, filename, content_type, file_path, size, created_at;

-- name: UpdateItemDocumentPath :exec
UPDATE item_documents SET file_path = $1, size = $2 WHERE id = $3;

-- name: DeleteItemDocument :exec
DELETE FROM item_documents WHERE id = $1;
