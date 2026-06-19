package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"
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
	if w := apimw.GetResponseWriter(ctx); w != nil {
		h.setAuthCookies(w, token, user.Role)
	}
	return &AuthOutput{Body: userResponse(user)}, nil
}

// Logout clears the authentication cookies.
func (h *Handler) Logout(ctx context.Context, _ *struct{}) (*struct{}, error) {
	if w := apimw.GetResponseWriter(ctx); w != nil {
		h.clearAuthCookies(w)
	}
	return nil, nil
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
