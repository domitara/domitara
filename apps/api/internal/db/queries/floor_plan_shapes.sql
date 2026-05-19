-- name: ListFloorPlanShapes :many
SELECT id, home_id, document_id, item_id, label, color, geometry, created_at, updated_at
FROM floor_plan_shapes WHERE home_id = $1 ORDER BY created_at ASC;

-- name: GetFloorPlanShape :one
SELECT id, home_id, document_id, item_id, label, color, geometry, created_at, updated_at
FROM floor_plan_shapes WHERE id = $1;

-- name: GetFloorPlanShapeHomeID :one
SELECT home_id FROM floor_plan_shapes WHERE id = $1;

-- name: CreateFloorPlanShape :one
INSERT INTO floor_plan_shapes (home_id, document_id, item_id, label, color, geometry)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, home_id, document_id, item_id, label, color, geometry, created_at, updated_at;

-- name: UpdateFloorPlanShape :one
UPDATE floor_plan_shapes
SET document_id = $2, item_id = $3, label = $4, color = $5, geometry = $6, updated_at = NOW()
WHERE id = $1
RETURNING id, home_id, document_id, item_id, label, color, geometry, created_at, updated_at;

-- name: DeleteFloorPlanShape :exec
DELETE FROM floor_plan_shapes WHERE id = $1;
