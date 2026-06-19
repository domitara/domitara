// Package middleware provides HTTP middleware for authentication and request context.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"

	"github.com/domitara/domitara/apps/api/internal/service"
)

type contextKey struct{ name string }

var (
	ctxClaims         = &contextKey{"claims"}
	ctxResponseWriter = &contextKey{"response-writer"}
	// CtxActiveHome is the context key for the active home ID.
	CtxActiveHome = &contextKey{"active-home"}
)

// WithResponseWriter stores the http.ResponseWriter in the request context so
// handlers can set cookies without needing the raw http.Handler signature.
func WithResponseWriter(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := context.WithValue(r.Context(), ctxResponseWriter, w)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetResponseWriter retrieves the ResponseWriter stored by WithResponseWriter.
func GetResponseWriter(ctx context.Context) http.ResponseWriter {
	w, _ := ctx.Value(ctxResponseWriter).(http.ResponseWriter)
	return w
}

// OptionalAuth silently extracts a valid JWT into the context. It checks the
// httpOnly "token" cookie first, then falls back to a Bearer header for API
// clients. Handlers call RequireAuth / RequireAdmin to enforce access.
func OptionalAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var tokenStr string
			if cookie, err := r.Cookie("token"); err == nil {
				tokenStr = cookie.Value
			} else if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
				tokenStr = strings.TrimPrefix(auth, "Bearer ")
			}
			if tokenStr != "" {
				if claims, err := service.VerifyToken(tokenStr, jwtSecret); err == nil {
					r = r.WithContext(context.WithValue(r.Context(), ctxClaims, claims))
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// GetClaims returns the claims from ctx without enforcing their presence.
func GetClaims(ctx context.Context) (service.Claims, bool) {
	c, ok := ctx.Value(ctxClaims).(service.Claims)
	return c, ok
}

// RequireAuth returns claims or a 401 error.
func RequireAuth(ctx context.Context) (service.Claims, error) {
	c, ok := ctx.Value(ctxClaims).(service.Claims)
	if !ok {
		return service.Claims{}, huma.NewError(http.StatusUnauthorized, "unauthorized")
	}
	return c, nil
}

// RequireAdmin returns claims or a 401/403 error.
func RequireAdmin(ctx context.Context) (service.Claims, error) {
	c, err := RequireAuth(ctx)
	if err != nil {
		return c, err
	}
	if c.Role != "admin" {
		return c, huma.NewError(http.StatusForbidden, "forbidden")
	}
	return c, nil
}

// WithActiveHome injects the active home ID into the context from the X-Active-Home header.
func WithActiveHome(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if id := r.Header.Get("X-Active-Home"); id != "" {
			r = r.WithContext(context.WithValue(r.Context(), CtxActiveHome, id))
		}
		next.ServeHTTP(w, r)
	})
}

// GetActiveHome returns the active home ID from context (empty string if not set).
func GetActiveHome(ctx context.Context) string {
	id, _ := ctx.Value(CtxActiveHome).(string)
	return id
}
