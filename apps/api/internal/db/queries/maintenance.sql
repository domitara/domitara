-- name: ListMaintenanceSchedules :many
SELECT ms.id, ms.item_id, i.name AS item_name, ms.title, ms.notes,
       ms.frequency_value, ms.frequency_unit,
       ms.last_performed_at, ms.next_due_at,
       ms.created_at, ms.updated_at
FROM maintenance_schedules ms
LEFT JOIN items i ON i.id = ms.item_id
WHERE ms.home_id = $1
ORDER BY ms.next_due_at ASC, ms.created_at ASC;

-- name: CreateMaintenanceSchedule :one
INSERT INTO maintenance_schedules (home_id, item_id, title, notes, frequency_value, frequency_unit, next_due_at, created_by)
VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_DATE), $8)
RETURNING id, item_id, NULL::text AS item_name, title, notes, frequency_value, frequency_unit,
          last_performed_at, next_due_at, created_at, updated_at;

-- name: UpdateMaintenanceSchedule :one
UPDATE maintenance_schedules
SET item_id = $2, title = $3, notes = $4,
    frequency_value = $5, frequency_unit = $6,
    next_due_at = $7,
    updated_at = NOW()
WHERE id = $1
RETURNING id, item_id, NULL::text AS item_name, title, notes, frequency_value, frequency_unit,
          last_performed_at, next_due_at, created_at, updated_at;

-- name: AdvanceMaintenanceSchedule :exec
UPDATE maintenance_schedules
SET last_performed_at = COALESCE($2, CURRENT_DATE),
    next_due_at = COALESCE($2, CURRENT_DATE) + (frequency_value || ' ' || frequency_unit)::interval,
    updated_at = NOW()
WHERE id = $1;

-- name: DeleteMaintenanceSchedule :exec
DELETE FROM maintenance_schedules WHERE id = $1;

-- name: CreateMaintenanceLog :one
INSERT INTO maintenance_logs (item_id, title, notes, cost, performed_at, created_by, home_id, schedule_id)
VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7, $8)
RETURNING id, item_id, NULL::text AS item_name, title, notes, cost, performed_at, created_at;

-- name: DeleteMaintenanceLog :exec
DELETE FROM maintenance_logs WHERE id = $1;
