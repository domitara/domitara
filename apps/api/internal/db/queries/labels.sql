-- name: ListLabelsByHome :many
SELECT lb.id, lb.name, lb.color, COUNT(il.item_id) AS item_count, lb.created_at, lb.updated_at
FROM labels lb
LEFT JOIN item_labels il ON il.label_id = lb.id
WHERE lb.home_id = $1
GROUP BY lb.id ORDER BY lb.name;

-- name: ListAllLabels :many
SELECT lb.id, lb.name, lb.color, COUNT(il.item_id) AS item_count, lb.created_at, lb.updated_at
FROM labels lb
LEFT JOIN item_labels il ON il.label_id = lb.id
GROUP BY lb.id ORDER BY lb.name;

-- name: GetLabel :one
SELECT lb.id, lb.name, lb.color, COUNT(il.item_id) AS item_count, lb.created_at, lb.updated_at
FROM labels lb
LEFT JOIN item_labels il ON il.label_id = lb.id
WHERE lb.id = $1
GROUP BY lb.id;

-- name: CreateLabel :one
INSERT INTO labels (name, color, home_id) VALUES ($1, $2, $3)
RETURNING id, name, color, created_at, updated_at;

-- name: UpdateLabel :exec
UPDATE labels SET name = $2, color = $3, updated_at = NOW() WHERE id = $1;

-- name: DeleteLabel :exec
DELETE FROM labels WHERE id = $1;

-- name: CountLabelsByHome :one
SELECT COUNT(*) FROM labels WHERE home_id = $1;

-- name: CountAllLabels :one
SELECT COUNT(*) FROM labels;
