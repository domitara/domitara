// Package handler implements the HTTP request handlers for the API endpoints.
package handler

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

const cookieMaxAge = 86400 // 24 hours, matches JWT expiry

// refreshCookieMaxAge matches service.RefreshTokenTTL. The refresh cookie is
// scoped to the auth path so it isn't sent on every ordinary request.
const refreshCookieMaxAge = 90 * 86400
const refreshCookiePath = "/api/v1/auth"

// Handler holds the dependencies shared by all API request handlers.
type Handler struct {
	q             *store.Queries
	pool          *pgxpool.Pool
	jwtSecret     string
	secureCookies bool
	uploadDir     string
}

// New constructs a Handler with the given dependencies.
func New(q *store.Queries, pool *pgxpool.Pool, jwtSecret string, secureCookies bool, uploadDir string) *Handler {
	return &Handler{q: q, pool: pool, jwtSecret: jwtSecret, secureCookies: secureCookies, uploadDir: uploadDir}
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
	http.SetCookie(w, &http.Cookie{Name: "refresh_token", Value: "", MaxAge: -1, Path: refreshCookiePath})
}

// setRefreshCookie sets the long-lived refresh token cookie used to silently
// mint new access tokens. It is httpOnly and scoped to the auth path so it is
// never sent on ordinary API requests, only login/refresh/logout.
func (h *Handler) setRefreshCookie(w http.ResponseWriter, refreshToken string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		HttpOnly: true,
		Secure:   h.secureCookies,
		SameSite: http.SameSiteLaxMode,
		Path:     refreshCookiePath,
		MaxAge:   refreshCookieMaxAge,
	})
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
		CreatedAt: u.CreatedAt.Time,
		UpdatedAt: u.UpdatedAt.Time,
	}
}
