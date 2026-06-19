package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

// LocationRow is the API representation of a location.
type LocationRow struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	ParentID    *string   `json:"parent_id"`
	Description *string   `json:"description"`
	ItemCount   int64     `json:"item_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// LocationsOutput is the response body listing locations.
type LocationsOutput struct{ Body []LocationRow }

// LocationOutput is the response body for a single location.
type LocationOutput struct{ Body LocationRow }

// LocationIDInput carries a location ID path parameter.
type LocationIDInput struct {
	ID string `path:"id"`
}

// CreateLocationInput is the request body for creating a location.
type CreateLocationInput struct {
	Body struct {
		Name        string  `json:"name" minLength:"1"`
		ParentID    *string `json:"parent_id,omitempty"`
		Description *string `json:"description,omitempty"`
	}
}

// UpdateLocationInput is the request body for updating a location.
type UpdateLocationInput struct {
	ID   string `path:"id"`
	Body struct {
		Name        string  `json:"name" minLength:"1"`
		ParentID    *string `json:"parent_id,omitempty"`
		Description *string `json:"description,omitempty"`
	}
}

// ListLocations returns locations for the active home, or all if none is set.
func (h *Handler) ListLocations(ctx context.Context, _ *struct{}) (*LocationsOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	homeID := apimw.GetActiveHome(ctx)
	locs := []LocationRow{}
	if homeID != "" {
		rows, err := h.q.ListLocationsByHome(ctx, homeID)
		if err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to list locations")
		}
		for _, r := range rows {
			locs = append(locs, LocationRow{
				ID: r.ID, Name: r.Name, ParentID: r.ParentID, Description: r.Description,
				ItemCount: r.ItemCount, CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
			})
		}
	} else {
		rows, err := h.q.ListAllLocations(ctx)
		if err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to list locations")
		}
		for _, r := range rows {
			locs = append(locs, LocationRow{
				ID: r.ID, Name: r.Name, ParentID: r.ParentID, Description: r.Description,
				ItemCount: r.ItemCount, CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
			})
		}
	}
	return &LocationsOutput{Body: locs}, nil
}

// GetLocation returns a single location by ID.
func (h *Handler) GetLocation(ctx context.Context, input *LocationIDInput) (*LocationOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	r, err := h.q.GetLocation(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "location not found")
	}
	return &LocationOutput{Body: LocationRow{
		ID: r.ID, Name: r.Name, ParentID: r.ParentID, Description: r.Description,
		ItemCount: r.ItemCount, CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
	}}, nil
}

// CreateLocation creates a location in the active home.
func (h *Handler) CreateLocation(ctx context.Context, input *CreateLocationInput) (*LocationOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	homeID := apimw.GetActiveHome(ctx)
	if homeID == "" {
		return nil, huma.NewError(http.StatusBadRequest, "X-Active-Home header required")
	}
	r, err := h.q.CreateLocation(ctx, store.CreateLocationParams{
		Name:        input.Body.Name,
		ParentID:    input.Body.ParentID,
		Description: input.Body.Description,
		HomeID:      homeID,
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create location")
	}
	return &LocationOutput{Body: LocationRow{
		ID: r.ID, Name: r.Name, ParentID: r.ParentID, Description: r.Description,
		ItemCount: 0, CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
	}}, nil
}

// UpdateLocation updates a location.
func (h *Handler) UpdateLocation(ctx context.Context, input *UpdateLocationInput) (*LocationOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if err := h.q.UpdateLocation(ctx, store.UpdateLocationParams{
		ID:          input.ID,
		Name:        input.Body.Name,
		ParentID:    input.Body.ParentID,
		Description: input.Body.Description,
	}); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update location")
	}
	r, err := h.q.GetLocation(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "location not found")
	}
	return &LocationOutput{Body: LocationRow{
		ID: r.ID, Name: r.Name, ParentID: r.ParentID, Description: r.Description,
		ItemCount: r.ItemCount, CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
	}}, nil
}

// DeleteLocation deletes a location.
func (h *Handler) DeleteLocation(ctx context.Context, input *LocationIDInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if err := h.q.DeleteLocation(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete location")
	}
	return nil, nil
}
