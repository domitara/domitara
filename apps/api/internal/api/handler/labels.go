package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
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

const labelSelectSQL = `
	SELECT lb.id, lb.name, lb.color, COUNT(il.item_id) AS item_count, lb.created_at, lb.updated_at
	FROM labels lb
	LEFT JOIN item_labels il ON il.label_id = lb.id`

func (h *Handler) ListLabels(ctx context.Context, _ *struct{}) (*LabelsOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	rows, err := h.pool.Query(ctx, labelSelectSQL+` GROUP BY lb.id ORDER BY lb.name`)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list labels")
	}
	defer rows.Close()
	labels := []LabelRow{}
	for rows.Next() {
		var l LabelRow
		if err := rows.Scan(&l.ID, &l.Name, &l.Color, &l.ItemCount, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to scan label")
		}
		labels = append(labels, l)
	}
	return &LabelsOutput{Body: labels}, nil
}

func (h *Handler) CreateLabel(ctx context.Context, input *CreateLabelInput) (*LabelOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	color := "#3b82f6"
	if input.Body.Color != nil && *input.Body.Color != "" {
		color = *input.Body.Color
	}
	var l LabelRow
	err := h.pool.QueryRow(ctx,
		`INSERT INTO labels (name, color) VALUES ($1, $2) RETURNING id, name, color, 0, created_at, updated_at`,
		input.Body.Name, color,
	).Scan(&l.ID, &l.Name, &l.Color, &l.ItemCount, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create label")
	}
	return &LabelOutput{Body: l}, nil
}

func (h *Handler) UpdateLabel(ctx context.Context, input *UpdateLabelInput) (*LabelOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if _, err := h.pool.Exec(ctx,
		`UPDATE labels SET name = $2, color = $3, updated_at = NOW() WHERE id = $1`,
		input.ID, input.Body.Name, input.Body.Color); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update label")
	}
	var l LabelRow
	err := h.pool.QueryRow(ctx, labelSelectSQL+` WHERE lb.id = $1 GROUP BY lb.id`, input.ID).
		Scan(&l.ID, &l.Name, &l.Color, &l.ItemCount, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "label not found")
	}
	return &LabelOutput{Body: l}, nil
}

func (h *Handler) DeleteLabel(ctx context.Context, input *LabelIDInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if _, err := h.pool.Exec(ctx, `DELETE FROM labels WHERE id = $1`, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete label")
	}
	return nil, nil
}
