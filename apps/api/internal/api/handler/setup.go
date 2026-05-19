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
	setupComplete, _ := h.q.GetSystemStatus(ctx)
	out := &SystemStatusOutput{}
	out.Body.SetupComplete = setupComplete
	return out, nil
}

type SetupInput struct {
	Body struct {
		Name     string `json:"name" minLength:"1"`
		Email    string `json:"email" format:"email"`
		Password string `json:"password" minLength:"8"`
		HomeName string `json:"home_name,omitempty"`
	}
}

func (h *Handler) Setup(ctx context.Context, input *SetupInput) (*AuthOutput, error) {
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to start transaction")
	}
	defer tx.Rollback(ctx)
	qtx := h.q.WithTx(tx)

	setupComplete, _ := qtx.GetSystemStatusForUpdate(ctx)
	if setupComplete {
		return nil, huma.NewError(http.StatusForbidden, "setup already complete")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Body.Password), 12)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to hash password")
	}

	user, err := qtx.CreateUser(ctx, store.CreateUserParams{
		Email:        input.Body.Email,
		Name:         input.Body.Name,
		PasswordHash: string(hash),
		Role:         "admin",
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create admin user")
	}

	homeName := input.Body.HomeName
	if homeName == "" {
		homeName = "My Home"
	}
	homeID, err := qtx.CreateFirstHome(ctx, homeName)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create home")
	}

	if err = qtx.UpsertHomeMember(ctx, store.UpsertHomeMemberParams{
		HomeID: homeID,
		UserID: user.ID,
		Role:   "owner",
	}); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to assign home owner")
	}

	if err = qtx.CompleteSetup(ctx); err != nil {
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
