package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
	"github.com/domitara/domitara/apps/api/internal/service"
)

// AuthOutput is the response body returned after authentication.
type AuthOutput struct {
	Body UserResponse
}

// LoginInput is the request body for the login endpoint.
type LoginInput struct {
	Body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
}

// RefreshInput is the request body for the refresh endpoint. The Body is a
// pointer so an empty request (the normal web case, which relies solely on
// the httpOnly refresh_token cookie) doesn't trip huma's required-body check.
type RefreshInput struct {
	Body *struct {
		// RefreshToken carries the token for clients (mobile) that don't
		// attach cookies automatically. Web clients omit this and rely on
		// the cookie instead.
		RefreshToken string `json:"refresh_token,omitempty"`
	}
}

// LogoutInput is the request body for the logout endpoint, mirroring
// RefreshInput's optional-body shape.
type LogoutInput struct {
	Body *struct {
		RefreshToken string `json:"refresh_token,omitempty"`
	}
}

// MeOutput is the response body describing the current user.
type MeOutput struct {
	Body UserResponse
}

// UpdateMeInput is the request body for updating the current user.
type UpdateMeInput struct {
	Body struct {
		Name     *string `json:"name,omitempty"`
		Password *string `json:"password,omitempty"`
	}
}

// Login authenticates a user by email and password and sets auth cookies.
func (h *Handler) Login(ctx context.Context, input *LoginInput) (*AuthOutput, error) {
	user, err := h.q.GetUserByEmail(ctx, input.Body.Email)
	if err != nil {
		return nil, huma.NewError(http.StatusUnauthorized, "invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Body.Password)); err != nil {
		return nil, huma.NewError(http.StatusUnauthorized, "invalid credentials")
	}
	token, err := service.SignToken(service.Claims{
		Sub: user.ID, Name: user.Name, Email: user.Email, Role: user.Role,
		Exp: service.TokenExpiry(), Iat: time.Now().Unix(),
	}, h.jwtSecret)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to sign token")
	}
	refreshToken, err := h.issueRefreshToken(ctx, user.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to issue refresh token")
	}
	if w := apimw.GetResponseWriter(ctx); w != nil {
		h.setAuthCookies(w, token, user.Role)
		h.setRefreshCookie(w, refreshToken)
	}
	return &AuthOutput{Body: userResponse(user)}, nil
}

// Logout revokes the refresh token (best-effort — an invalid/absent one
// shouldn't stop the client from being signed out locally) and clears cookies.
func (h *Handler) Logout(ctx context.Context, input *LogoutInput) (*struct{}, error) {
	bodyToken := ""
	if input != nil && input.Body != nil {
		bodyToken = input.Body.RefreshToken
	}
	if raw := refreshTokenFromRequest(ctx, bodyToken); raw != "" {
		_ = h.q.RevokeRefreshTokenByHash(ctx, service.HashRefreshToken(raw))
	}
	if w := apimw.GetResponseWriter(ctx); w != nil {
		h.clearAuthCookies(w)
	}
	return nil, nil
}

// Refresh mints a new access token from a valid refresh token and rotates the
// refresh token itself (single-use). Rotation means a refresh token that's
// already been redeemed can never be redeemed again; seeing one reused is a
// strong signal it was captured and replayed, so that revokes every
// outstanding token for the user rather than just rejecting the one request.
func (h *Handler) Refresh(ctx context.Context, input *RefreshInput) (*AuthOutput, error) {
	bodyToken := ""
	if input != nil && input.Body != nil {
		bodyToken = input.Body.RefreshToken
	}
	raw := refreshTokenFromRequest(ctx, bodyToken)
	if raw == "" {
		return nil, huma.NewError(http.StatusUnauthorized, "missing refresh token")
	}

	hash := service.HashRefreshToken(raw)
	rt, err := h.q.GetRefreshTokenByHash(ctx, hash)
	if err != nil {
		return nil, huma.NewError(http.StatusUnauthorized, "invalid refresh token")
	}
	if rt.RevokedAt != nil {
		_ = h.q.RevokeAllRefreshTokensForUser(ctx, rt.UserID)
		return nil, huma.NewError(http.StatusUnauthorized, "invalid refresh token")
	}
	if rt.ExpiresAt.Time.Before(time.Now()) {
		return nil, huma.NewError(http.StatusUnauthorized, "refresh token expired")
	}
	user, err := h.q.GetUser(ctx, rt.UserID)
	if err != nil {
		return nil, huma.NewError(http.StatusUnauthorized, "invalid refresh token")
	}
	if err := h.q.RevokeRefreshToken(ctx, rt.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to rotate refresh token")
	}
	newRefreshToken, err := h.issueRefreshToken(ctx, user.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to issue refresh token")
	}
	token, err := service.SignToken(service.Claims{
		Sub: user.ID, Name: user.Name, Email: user.Email, Role: user.Role,
		Exp: service.TokenExpiry(), Iat: time.Now().Unix(),
	}, h.jwtSecret)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to sign token")
	}
	if w := apimw.GetResponseWriter(ctx); w != nil {
		h.setAuthCookies(w, token, user.Role)
		h.setRefreshCookie(w, newRefreshToken)
	}
	return &AuthOutput{Body: userResponse(user)}, nil
}

// issueRefreshToken generates, hashes, and persists a new refresh token for a
// user, returning the raw (unhashed) value to hand to the client.
func (h *Handler) issueRefreshToken(ctx context.Context, userID int64) (string, error) {
	raw, err := service.NewRefreshToken()
	if err != nil {
		return "", err
	}
	_, err = h.q.CreateRefreshToken(ctx, store.CreateRefreshTokenParams{
		UserID:    userID,
		TokenHash: service.HashRefreshToken(raw),
		ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(service.RefreshTokenTTL), Valid: true},
	})
	if err != nil {
		return "", err
	}
	return raw, nil
}

// refreshTokenFromRequest reads the refresh token from the httpOnly cookie
// (browsers) or, failing that, the already-extracted request body value
// (mobile clients, which don't attach cookies automatically).
func refreshTokenFromRequest(ctx context.Context, bodyToken string) string {
	if r := apimw.GetRequest(ctx); r != nil {
		if cookie, err := r.Cookie("refresh_token"); err == nil && cookie.Value != "" {
			return cookie.Value
		}
	}
	return bodyToken
}

// Me returns the currently authenticated user.
func (h *Handler) Me(ctx context.Context, _ *struct{}) (*MeOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	user, err := h.q.GetUser(ctx, claims.Sub)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "user not found")
	}
	return &MeOutput{Body: userResponse(user)}, nil
}

// UpdateMe updates the current user's name and/or password.
func (h *Handler) UpdateMe(ctx context.Context, input *UpdateMeInput) (*MeOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if p := input.Body.Password; p != nil {
		if len(*p) < 8 {
			return nil, huma.NewError(http.StatusUnprocessableEntity, "password must be at least 8 characters")
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(*p), 12)
		if err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to hash password")
		}
		if err = h.q.UpdateUserPasswordHash(ctx, store.UpdateUserPasswordHashParams{
			PasswordHash: string(hash), ID: claims.Sub,
		}); err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to update password")
		}
		// Changing the password invalidates every other signed-in session's
		// ability to silently refresh — they'll be forced back to login.
		_ = h.q.RevokeAllRefreshTokensForUser(ctx, claims.Sub)
	}
	if n := input.Body.Name; n != nil && *n != "" {
		if _, err := h.q.UpdateUser(ctx, store.UpdateUserParams{ID: claims.Sub, Name: *n}); err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to update name")
		}
	}
	user, err := h.q.GetUser(ctx, claims.Sub)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch user")
	}
	return &MeOutput{Body: userResponse(user)}, nil
}
