package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"

	"github.com/your-org/monorepo/apps/api/internal/service"
)

type contextKey struct{ name string }

var ctxClaims = &contextKey{"claims"}

// OptionalAuth silently extracts a valid JWT into the context. Handlers call
// RequireAuth / RequireAdmin to enforce access — no JWT is not an error here.
func OptionalAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
				if claims, err := service.VerifyToken(strings.TrimPrefix(auth, "Bearer "), jwtSecret); err == nil {
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
