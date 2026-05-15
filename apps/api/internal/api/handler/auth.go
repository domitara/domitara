package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"golang.org/x/crypto/bcrypt"

	apimw "github.com/your-org/monorepo/apps/api/internal/api/middleware"
	"github.com/your-org/monorepo/apps/api/internal/service"
)

type AuthOutput struct {
	Body struct {
		Token string       `json:"token"`
		User  UserResponse `json:"user"`
	}
}

type LoginInput struct {
	Body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
}

type MeOutput struct {
	Body UserResponse
}

type UpdateMeInput struct {
	Body struct {
		Name     *string `json:"name,omitempty"`
		Password *string `json:"password,omitempty"`
	}
}

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
	out := &AuthOutput{}
	out.Body.Token = token
	out.Body.User = userResponse(user)
	return out, nil
}

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

func (h *Handler) UpdateMe(ctx context.Context, input *UpdateMeInput) (*MeOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if p := input.Body.Password; p != nil {
		if len(*p) < 8 {
			return nil, huma.NewError(http.StatusUnprocessableEntity, "password must be at least 8 characters")
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(*p), bcrypt.DefaultCost)
		if err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to hash password")
		}
		if _, err = h.pool.Exec(ctx,
			`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
			string(hash), claims.Sub); err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to update password")
		}
	}
	if n := input.Body.Name; n != nil && *n != "" {
		if _, err := h.pool.Exec(ctx,
			`UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2`,
			*n, claims.Sub); err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to update name")
		}
	}
	user, err := h.q.GetUser(ctx, claims.Sub)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch user")
	}
	return &MeOutput{Body: userResponse(user)}, nil
}
