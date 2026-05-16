package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
)

type LocationRow struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	ParentID    *string   `json:"parent_id"`
	Description *string   `json:"description"`
	ItemCount   int64     `json:"item_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type LocationsOutput struct{ Body []LocationRow }
type LocationOutput struct{ Body LocationRow }

type LocationIDInput struct {
	ID string `path:"id"`
}

type CreateLocationInput struct {
	Body struct {
		Name        string  `json:"name" minLength:"1"`
		ParentID    *string `json:"parent_id,omitempty"`
		Description *string `json:"description,omitempty"`
	}
}

type UpdateLocationInput struct {
	ID   string `path:"id"`
	Body struct {
		Name        string  `json:"name" minLength:"1"`
		ParentID    *string `json:"parent_id,omitempty"`
		Description *string `json:"description,omitempty"`
	}
}

const locationSelectSQL = `
	SELECT l.id, l.name, l.parent_id, l.description,
	       COUNT(i.id) AS item_count, l.created_at, l.updated_at
	FROM locations l
	LEFT JOIN items i ON i.location_id = l.id`

func (h *Handler) ListLocations(ctx context.Context, _ *struct{}) (*LocationsOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	rows, err := h.pool.Query(ctx, locationSelectSQL+` GROUP BY l.id ORDER BY l.name`)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list locations")
	}
	defer rows.Close()
	locs := []LocationRow{}
	for rows.Next() {
		var l LocationRow
		if err := rows.Scan(&l.ID, &l.Name, &l.ParentID, &l.Description, &l.ItemCount, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to scan location")
		}
		locs = append(locs, l)
	}
	return &LocationsOutput{Body: locs}, nil
}

func (h *Handler) GetLocation(ctx context.Context, input *LocationIDInput) (*LocationOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	var l LocationRow
	err := h.pool.QueryRow(ctx, locationSelectSQL+` WHERE l.id = $1 GROUP BY l.id`, input.ID).
		Scan(&l.ID, &l.Name, &l.ParentID, &l.Description, &l.ItemCount, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "location not found")
	}
	return &LocationOutput{Body: l}, nil
}

func (h *Handler) CreateLocation(ctx context.Context, input *CreateLocationInput) (*LocationOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	var l LocationRow
	err := h.pool.QueryRow(ctx,
		`INSERT INTO locations (name, parent_id, description) VALUES ($1, $2, $3)
		 RETURNING id, name, parent_id, description, 0, created_at, updated_at`,
		input.Body.Name, input.Body.ParentID, input.Body.Description,
	).Scan(&l.ID, &l.Name, &l.ParentID, &l.Description, &l.ItemCount, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create location")
	}
	return &LocationOutput{Body: l}, nil
}

func (h *Handler) UpdateLocation(ctx context.Context, input *UpdateLocationInput) (*LocationOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if _, err := h.pool.Exec(ctx,
		`UPDATE locations SET name = $2, parent_id = $3, description = $4, updated_at = NOW() WHERE id = $1`,
		input.ID, input.Body.Name, input.Body.ParentID, input.Body.Description); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update location")
	}
	var l LocationRow
	err := h.pool.QueryRow(ctx, locationSelectSQL+` WHERE l.id = $1 GROUP BY l.id`, input.ID).
		Scan(&l.ID, &l.Name, &l.ParentID, &l.Description, &l.ItemCount, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "location not found")
	}
	return &LocationOutput{Body: l}, nil
}

func (h *Handler) DeleteLocation(ctx context.Context, input *LocationIDInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if _, err := h.pool.Exec(ctx, `DELETE FROM locations WHERE id = $1`, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete location")
	}
	return nil, nil
}
