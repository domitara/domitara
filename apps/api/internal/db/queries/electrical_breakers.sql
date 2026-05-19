-- name: ListBreakers :many
SELECT id, panel_id, slot, label, amps,
       breaker_type, is_gfci, is_afci, notes, floor_plan_area_id, created_at, updated_at
FROM electrical_breakers
WHERE panel_id = $1 ORDER BY slot;

-- name: GetBreaker :one
SELECT id, panel_id, slot, label, amps,
       breaker_type, is_gfci, is_afci, notes, floor_plan_area_id, created_at, updated_at
FROM electrical_breakers
WHERE id = $1;

-- name: GetBreakerPanelID :one
SELECT panel_id FROM electrical_breakers WHERE id = $1;

-- name: CountBreakerAtSlot :one
SELECT COUNT(*) FROM electrical_breakers WHERE panel_id = $1 AND slot = $2;

-- name: CountBreakersAtDoublePoleSlots :one
SELECT COUNT(*) FROM electrical_breakers WHERE panel_id = $1 AND (slot = $2 OR slot = $3);

-- name: CreateBreaker :one
INSERT INTO electrical_breakers (panel_id, slot, label, amps, breaker_type, is_gfci, is_afci, notes, floor_plan_area_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, panel_id, slot, label, amps, breaker_type, is_gfci, is_afci, notes, floor_plan_area_id, created_at, updated_at;

-- name: UpdateBreaker :one
UPDATE electrical_breakers
SET label = $2, amps = $3, breaker_type = $4, is_gfci = $5, is_afci = $6,
    notes = $7, floor_plan_area_id = $8, updated_at = NOW()
WHERE id = $1
RETURNING id, panel_id, slot, label, amps, breaker_type, is_gfci, is_afci, notes, floor_plan_area_id, created_at, updated_at;

-- name: DeleteBreaker :exec
DELETE FROM electrical_breakers WHERE id = $1;
