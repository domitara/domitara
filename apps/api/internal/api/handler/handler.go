package handler

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

const cookieMaxAge = 86400 // 24 hours, matches JWT expiry

type Handler struct {
	q             *store.Queries
	pool          *pgxpool.Pool
	jwtSecret     string
	secureCookies bool
}

func New(q *store.Queries, pool *pgxpool.Pool, jwtSecret string, secureCookies bool) *Handler {
	return &Handler{q: q, pool: pool, jwtSecret: jwtSecret, secureCookies: secureCookies}
}

func (h *Handler) setAuthCookies(w http.ResponseWriter, token string, role string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    token,
		HttpOnly: true,
		Secure:   h.secureCookies,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   cookieMaxAge,
	})
	// logged_in is readable by JS to detect session state and role without
	// exposing the actual token.
	http.SetCookie(w, &http.Cookie{
		Name:     "logged_in",
		Value:    role,
		HttpOnly: false,
		Secure:   h.secureCookies,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   cookieMaxAge,
	})
}

func (h *Handler) clearAuthCookies(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{Name: "token", Value: "", MaxAge: -1, Path: "/"})
	http.SetCookie(w, &http.Cookie{Name: "logged_in", Value: "", MaxAge: -1, Path: "/"})
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
