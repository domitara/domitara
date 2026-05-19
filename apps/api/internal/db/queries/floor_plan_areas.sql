-- name: ListFloorPlanAreas :many
SELECT id, home_id, document_id, name, color, geometry, created_at, updated_at
FROM floor_plan_areas WHERE home_id = $1 ORDER BY name;

-- name: GetFloorPlanAreaHomeID :one
SELECT home_id FROM floor_plan_areas WHERE id = $1;

-- name: CreateFloorPlanArea :one
INSERT INTO floor_plan_areas (home_id, document_id, name, color, geometry)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, home_id, document_id, name, color, geometry, created_at, updated_at;

-- name: UpdateFloorPlanArea :one
UPDATE floor_plan_areas SET name = $2, color = $3, geometry = $4, updated_at = NOW()
WHERE id = $1
RETURNING id, home_id, document_id, name, color, geometry, created_at, updated_at;

-- name: DeleteFloorPlanArea :exec
DELETE FROM floor_plan_areas WHERE id = $1;
