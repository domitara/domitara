package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

type LabelRow struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	ItemCount int64     `json:"item_count"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type LabelsOutput struct{ Body []LabelRow }
type LabelOutput struct{ Body LabelRow }

type LabelIDInput struct {
	ID string `path:"id"`
}

type CreateLabelInput struct {
	Body struct {
		Name  string  `json:"name" minLength:"1"`
		Color *string `json:"color,omitempty"`
	}
}

type UpdateLabelInput struct {
	ID   string `path:"id"`
	Body struct {
		Name  string `json:"name" minLength:"1"`
		Color string `json:"color"`
	}
}

func (h *Handler) ListLabels(ctx context.Context, _ *struct{}) (*LabelsOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	homeID := apimw.GetActiveHome(ctx)
	labels := []LabelRow{}
	if homeID != "" {
		rows, err := h.q.ListLabelsByHome(ctx, homeID)
		if err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to list labels")
		}
		for _, r := range rows {
			labels = append(labels, LabelRow{
				ID: r.ID, Name: r.Name, Color: r.Color, ItemCount: r.ItemCount,
				CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
			})
		}
	} else {
		rows, err := h.q.ListAllLabels(ctx)
		if err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to list labels")
		}
		for _, r := range rows {
			labels = append(labels, LabelRow{
				ID: r.ID, Name: r.Name, Color: r.Color, ItemCount: r.ItemCount,
				CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
			})
		}
	}
	return &LabelsOutput{Body: labels}, nil
}

func (h *Handler) CreateLabel(ctx context.Context, input *CreateLabelInput) (*LabelOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	homeID := apimw.GetActiveHome(ctx)
	if homeID == "" {
		return nil, huma.NewError(http.StatusBadRequest, "X-Active-Home header required")
	}
	color := "#3b82f6"
	if input.Body.Color != nil && *input.Body.Color != "" {
		color = *input.Body.Color
	}
	r, err := h.q.CreateLabel(ctx, store.CreateLabelParams{
		Name:   input.Body.Name,
		Color:  color,
		HomeID: homeID,
	})
	if err != nil {
		if isUniqueViolation(err, "labels_home_name_key") {
			return nil, huma.NewError(http.StatusConflict, "a label with that name already exists in this home")
		}
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create label")
	}
	return &LabelOutput{Body: LabelRow{
		ID: r.ID, Name: r.Name, Color: r.Color, ItemCount: 0,
		CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
	}}, nil
}

func (h *Handler) UpdateLabel(ctx context.Context, input *UpdateLabelInput) (*LabelOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if err := h.q.UpdateLabel(ctx, store.UpdateLabelParams{
		ID:    input.ID,
		Name:  input.Body.Name,
		Color: input.Body.Color,
	}); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update label")
	}
	r, err := h.q.GetLabel(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "label not found")
	}
	return &LabelOutput{Body: LabelRow{
		ID: r.ID, Name: r.Name, Color: r.Color, ItemCount: r.ItemCount,
		CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
	}}, nil
}

func (h *Handler) DeleteLabel(ctx context.Context, input *LabelIDInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if err := h.q.DeleteLabel(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete label")
	}
	return nil, nil
}
