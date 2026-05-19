-- name: ListPanels :many
SELECT id, home_id, name, total_amps, total_slots,
       location_note, parent_panel_id, fed_by_breaker_id, sort_order, created_at, updated_at
FROM electrical_panels
WHERE home_id = $1 ORDER BY sort_order, created_at;

-- name: GetPanel :one
SELECT id, home_id, name, total_amps, total_slots,
       location_note, parent_panel_id, fed_by_breaker_id, sort_order, created_at, updated_at
FROM electrical_panels
WHERE id = $1;

-- name: GetPanelHomeID :one
SELECT home_id FROM electrical_panels WHERE id = $1;

-- name: CountSubpanels :one
SELECT COUNT(*) FROM electrical_panels WHERE parent_panel_id = $1;

-- name: CreatePanel :one
INSERT INTO electrical_panels (home_id, name, total_amps, total_slots, location_note, parent_panel_id, fed_by_breaker_id, sort_order)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, home_id, name, total_amps, total_slots, location_note, parent_panel_id, fed_by_breaker_id, sort_order, created_at, updated_at;

-- name: UpdatePanel :one
UPDATE electrical_panels
SET name = $2, total_amps = $3, total_slots = $4, location_note = $5,
    parent_panel_id = $6, fed_by_breaker_id = $7, sort_order = $8, updated_at = NOW()
WHERE id = $1
RETURNING id, home_id, name, total_amps, total_slots, location_note, parent_panel_id, fed_by_breaker_id, sort_order, created_at, updated_at;

-- name: DeletePanel :exec
DELETE FROM electrical_panels WHERE id = $1;
