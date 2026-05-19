-- name: GetUser :one
SELECT id, email, name, password_hash, role, created_at, updated_at FROM users WHERE id = $1 LIMIT 1;

-- name: GetUserByEmail :one
SELECT id, email, name, password_hash, role, created_at, updated_at FROM users WHERE email = $1 LIMIT 1;

-- name: GetUserIDByEmail :one
SELECT id FROM users WHERE email = $1;

-- name: ListUsers :many
SELECT id, email, name, password_hash, role, created_at, updated_at FROM users ORDER BY created_at DESC;

-- name: CreateUser :one
INSERT INTO users (email, name, password_hash, role)
VALUES ($1, $2, $3, $4)
RETURNING id, email, name, password_hash, role, created_at, updated_at;

-- name: UpdateUser :one
UPDATE users SET name = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, email, name, password_hash, role, created_at, updated_at;

-- name: UpdateUserPasswordHash :exec
UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2;

-- name: UpdateUserRole :exec
UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;
