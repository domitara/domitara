package handler

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

type DashboardOutput struct {
	Body struct {
		TotalItems     int64   `json:"total_items"`
		TotalLocations int64   `json:"total_locations"`
		TotalLabels    int64   `json:"total_labels"`
		TotalValue     float64 `json:"total_value"`
	}
}

func (h *Handler) Dashboard(ctx context.Context, _ *struct{}) (*DashboardOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	out := &DashboardOutput{}
	homeID := apimw.GetActiveHome(ctx)
	if homeID != "" {
		// sqlc not used here: COALESCE(SUM(numeric), 0) mixes numeric types and generates interface{} in sqlc pgx/v5 mode
		out.Body.TotalItems, _ = h.q.CountItemsByHome(ctx, homeID)
		out.Body.TotalLocations, _ = h.q.CountLocationsByHome(ctx, homeID)
		out.Body.TotalLabels, _ = h.q.CountLabelsByHome(ctx, homeID)
		h.pool.QueryRow(ctx, `SELECT COALESCE(SUM(purchase_price), 0) FROM items WHERE home_id = $1 AND purchase_price IS NOT NULL`, homeID).Scan(&out.Body.TotalValue)
	} else {
		// sqlc not used here: COALESCE(SUM(numeric), 0) mixes numeric types and generates interface{} in sqlc pgx/v5 mode
		out.Body.TotalItems, _ = h.q.CountAllItems(ctx)
		out.Body.TotalLocations, _ = h.q.CountAllLocations(ctx)
		out.Body.TotalLabels, _ = h.q.CountAllLabels(ctx)
		h.pool.QueryRow(ctx, `SELECT COALESCE(SUM(purchase_price), 0) FROM items WHERE purchase_price IS NOT NULL`).Scan(&out.Body.TotalValue)
	}
	return out, nil
}

type UsersOutput struct{ Body []UserResponse }

func (h *Handler) AdminListUsers(ctx context.Context, _ *struct{}) (*UsersOutput, error) {
	if _, err := apimw.RequireAdmin(ctx); err != nil {
		return nil, err
	}
	users, err := h.q.ListUsers(ctx)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list users")
	}
	resp := make([]UserResponse, len(users))
	for i, u := range users {
		resp[i] = userResponse(u)
	}
	return &UsersOutput{Body: resp}, nil
}

type AdminCreateUserInput struct {
	Body struct {
		Name     string `json:"name" minLength:"1"`
		Email    string `json:"email" format:"email"`
		Password string `json:"password" minLength:"8"`
		Role     string `json:"role" enum:"admin,member"`
	}
}

func (h *Handler) AdminCreateUser(ctx context.Context, input *AdminCreateUserInput) (*MeOutput, error) {
	if _, err := apimw.RequireAdmin(ctx); err != nil {
		return nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Body.Password), 12)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to hash password")
	}
	user, err := h.q.CreateUser(ctx, store.CreateUserParams{
		Email:        input.Body.Email,
		Name:         input.Body.Name,
		PasswordHash: string(hash),
		Role:         input.Body.Role,
	})
	if err != nil {
		return nil, huma.NewError(http.StatusConflict, "email already in use")
	}
	return &MeOutput{Body: userResponse(user)}, nil
}

type AdminUserIDInput struct {
	ID int64 `path:"id"`
}

type AdminUpdateUserInput struct {
	ID   int64 `path:"id"`
	Body struct {
		Name string `json:"name" minLength:"1"`
		Role string `json:"role" enum:"admin,member"`
	}
}

func (h *Handler) AdminUpdateUser(ctx context.Context, input *AdminUpdateUserInput) (*MeOutput, error) {
	if _, err := apimw.RequireAdmin(ctx); err != nil {
		return nil, err
	}
	user, err := h.q.UpdateUser(ctx, store.UpdateUserParams{ID: input.ID, Name: input.Body.Name})
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, huma.NewError(http.StatusNotFound, "user not found")
		}
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update user")
	}
	if err := h.q.UpdateUserRole(ctx, store.UpdateUserRoleParams{Role: input.Body.Role, ID: input.ID}); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update role")
	}
	user.Role = input.Body.Role
	return &MeOutput{Body: userResponse(user)}, nil
}

func (h *Handler) AdminDeleteUser(ctx context.Context, input *AdminUserIDInput) (*struct{}, error) {
	claims, err := apimw.RequireAdmin(ctx)
	if err != nil {
		return nil, err
	}
	if input.ID == claims.Sub {
		return nil, huma.NewError(http.StatusBadRequest, "cannot delete your own account")
	}
	if err := h.q.DeleteUser(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete user")
	}
	return nil, nil
}
