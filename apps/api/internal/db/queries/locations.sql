-- name: ListLocationsByHome :many
SELECT l.id, l.name, l.parent_id, l.description, l.location_type, l.grid_rows, l.grid_cols,
       COUNT(i.id) AS item_count, l.created_at, l.updated_at
FROM locations l
LEFT JOIN items i ON i.location_id = l.id
WHERE l.home_id = $1
GROUP BY l.id ORDER BY l.name;

-- name: ListAllLocations :many
SELECT l.id, l.name, l.parent_id, l.description, l.location_type, l.grid_rows, l.grid_cols,
       COUNT(i.id) AS item_count, l.created_at, l.updated_at
FROM locations l
LEFT JOIN items i ON i.location_id = l.id
GROUP BY l.id ORDER BY l.name;

-- name: GetLocation :one
SELECT l.id, l.name, l.parent_id, l.description, l.location_type, l.grid_rows, l.grid_cols,
       COUNT(i.id) AS item_count, l.created_at, l.updated_at
FROM locations l
LEFT JOIN items i ON i.location_id = l.id
WHERE l.id = $1
GROUP BY l.id;

-- name: CreateLocation :one
INSERT INTO locations (name, parent_id, description, home_id, location_type, grid_rows, grid_cols)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, name, parent_id, description, location_type, grid_rows, grid_cols, created_at, updated_at;

-- name: UpdateLocation :exec
UPDATE locations SET name = $2, parent_id = $3, description = $4,
                      location_type = $5, grid_rows = $6, grid_cols = $7, updated_at = NOW()
WHERE id = $1;

-- name: DeleteLocation :exec
DELETE FROM locations WHERE id = $1;

-- name: CountLocationsByHome :one
SELECT COUNT(*) FROM locations WHERE home_id = $1;

-- name: CountAllLocations :one
SELECT COUNT(*) FROM locations;

-- name: CountLocationChildren :one
SELECT COUNT(*) FROM locations WHERE parent_id = $1;
