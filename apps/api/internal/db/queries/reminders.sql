-- name: ListReminders :many
SELECT id, key, title, body, tone, snoozed_until, created_at
FROM reminders
WHERE user_id = $1
  AND dismissed_at IS NULL
  AND (snoozed_until IS NULL OR snoozed_until <= NOW())
ORDER BY created_at ASC;

-- name: DismissReminder :execrows
UPDATE reminders SET dismissed_at = NOW(), updated_at = NOW()
WHERE id = $1 AND user_id = $2;

-- name: SnoozeReminder :execrows
UPDATE reminders SET snoozed_until = $3, updated_at = NOW()
WHERE id = $1 AND user_id = $2;

-- name: DeleteReminderByKey :exec
DELETE FROM reminders WHERE key = $1;

-- name: UpsertReminder :exec
INSERT INTO reminders (user_id, key, title, body, tone)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id, key) DO UPDATE
SET title = EXCLUDED.title, body = EXCLUDED.body, tone = EXCLUDED.tone,
    dismissed_at = NULL, snoozed_until = NULL, updated_at = NOW();
