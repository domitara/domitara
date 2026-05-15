package handler

import (
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	store "github.com/your-org/monorepo/apps/api/internal/db/sqlc"
)

type Handler struct {
	q         *store.Queries
	pool      *pgxpool.Pool
	jwtSecret string
}

func New(q *store.Queries, pool *pgxpool.Pool, jwtSecret string) *Handler {
	return &Handler{q: q, pool: pool, jwtSecret: jwtSecret}
}

// UserResponse omits sensitive fields.
type UserResponse struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func userResponse(u store.User) UserResponse {
	return UserResponse{
		ID:        u.ID,
		Email:     u.Email,
		Name:      u.Name,
		Role:      u.Role,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}
