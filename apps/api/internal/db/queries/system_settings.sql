-- name: GetSystemStatus :one
SELECT setup_complete FROM system_settings LIMIT 1;

-- name: GetSystemStatusForUpdate :one
SELECT setup_complete FROM system_settings LIMIT 1 FOR UPDATE;

-- name: CompleteSetup :exec
UPDATE system_settings SET setup_complete = TRUE;
