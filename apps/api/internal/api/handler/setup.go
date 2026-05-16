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

type SystemStatusOutput struct {
	Body struct {
		SetupComplete bool `json:"setup_complete"`
	}
}

func (h *Handler) SystemStatus(ctx context.Context, _ *struct{}) (*SystemStatusOutput, error) {
	var setupComplete bool
	h.pool.QueryRow(ctx, `SELECT setup_complete FROM system_settings LIMIT 1`).Scan(&setupComplete)
	out := &SystemStatusOutput{}
	out.Body.SetupComplete = setupComplete
	return out, nil
}

type SetupInput struct {
	Body struct {
		Name     string `json:"name" minLength:"1"`
		Email    string `json:"email" format:"email"`
		Password string `json:"password" minLength:"8"`
	}
}

func (h *Handler) Setup(ctx context.Context, input *SetupInput) (*AuthOutput, error) {
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to start transaction")
	}
	defer tx.Rollback(ctx)

	var setupComplete bool
	tx.QueryRow(ctx, `SELECT setup_complete FROM system_settings LIMIT 1 FOR UPDATE`).Scan(&setupComplete)
	if setupComplete {
		return nil, huma.NewError(http.StatusForbidden, "setup already complete")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Body.Password), 12)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to hash password")
	}

	var user store.User
	err = tx.QueryRow(ctx,
		`INSERT INTO users (email, name, password_hash, role)
		 VALUES ($1, $2, $3, 'admin')
		 RETURNING id, email, name, password_hash, role, created_at, updated_at`,
		input.Body.Email, input.Body.Name, string(hash),
	).Scan(&user.ID, &user.Email, &user.Name, &user.PasswordHash, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create admin user")
	}

	if _, err = tx.Exec(ctx, `UPDATE system_settings SET setup_complete = TRUE`); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to complete setup")
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to commit setup")
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
