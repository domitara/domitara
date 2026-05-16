package handler

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5"

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
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM items`).Scan(&out.Body.TotalItems)
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM locations`).Scan(&out.Body.TotalLocations)
	h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM labels`).Scan(&out.Body.TotalLabels)
	h.pool.QueryRow(ctx, `SELECT COALESCE(SUM(purchase_price), 0) FROM items WHERE purchase_price IS NOT NULL`).Scan(&out.Body.TotalValue)
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
	if _, err := h.pool.Exec(ctx, `UPDATE users SET role = $1 WHERE id = $2`, input.Body.Role, input.ID); err != nil {
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
