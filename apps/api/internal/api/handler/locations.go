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
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	ParentID     *string   `json:"parent_id"`
	Description  *string   `json:"description"`
	LocationType string    `json:"location_type"`
	GridRows     *int      `json:"grid_rows"`
	GridCols     *int      `json:"grid_cols"`
	ItemCount    int64     `json:"item_count"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
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
		Name         string  `json:"name" minLength:"1"`
		ParentID     *string `json:"parent_id,omitempty"`
		Description  *string `json:"description,omitempty"`
		LocationType string  `json:"location_type,omitempty" enum:"room,container"`
		GridRows     *int    `json:"grid_rows,omitempty"`
		GridCols     *int    `json:"grid_cols,omitempty"`
	}
}

// UpdateLocationInput is the request body for updating a location.
type UpdateLocationInput struct {
	ID   string `path:"id"`
	Body struct {
		Name         string  `json:"name" minLength:"1"`
		ParentID     *string `json:"parent_id,omitempty"`
		Description  *string `json:"description,omitempty"`
		LocationType string  `json:"location_type,omitempty" enum:"room,container"`
		GridRows     *int    `json:"grid_rows,omitempty"`
		GridCols     *int    `json:"grid_cols,omitempty"`
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
				LocationType: r.LocationType, GridRows: fromNullInt4(r.GridRows), GridCols: fromNullInt4(r.GridCols),
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
				LocationType: r.LocationType, GridRows: fromNullInt4(r.GridRows), GridCols: fromNullInt4(r.GridCols),
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
		LocationType: r.LocationType, GridRows: fromNullInt4(r.GridRows), GridCols: fromNullInt4(r.GridCols),
		ItemCount: r.ItemCount, CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
	}}, nil
}

// validateLocationType defaults an empty location_type to "room" and rejects
// grid dimensions on anything but a "container" location.
func validateLocationType(locType string, gridRows, gridCols *int) (string, error) {
	if locType == "" {
		locType = "room"
	}
	if locType != "room" && locType != "container" {
		return "", huma.NewError(http.StatusUnprocessableEntity, "location_type must be 'room' or 'container'")
	}
	if locType != "container" && (gridRows != nil || gridCols != nil) {
		return "", huma.NewError(http.StatusUnprocessableEntity, "grid dimensions require a container location")
	}
	return locType, nil
}

// validateParent rejects nesting a location inside a container location.
func (h *Handler) validateParent(ctx context.Context, parentID *string) error {
	if parentID == nil {
		return nil
	}
	parent, err := h.q.GetLocation(ctx, *parentID)
	if err != nil {
		return huma.NewError(http.StatusUnprocessableEntity, "parent location not found")
	}
	if parent.LocationType == "container" {
		return huma.NewError(http.StatusUnprocessableEntity, "cannot nest a location inside a container")
	}
	return nil
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
	locType, err := validateLocationType(input.Body.LocationType, input.Body.GridRows, input.Body.GridCols)
	if err != nil {
		return nil, err
	}
	if err := h.validateParent(ctx, input.Body.ParentID); err != nil {
		return nil, err
	}
	r, err := h.q.CreateLocation(ctx, store.CreateLocationParams{
		Name:         input.Body.Name,
		ParentID:     input.Body.ParentID,
		Description:  input.Body.Description,
		HomeID:       homeID,
		LocationType: locType,
		GridRows:     toNullInt4(input.Body.GridRows),
		GridCols:     toNullInt4(input.Body.GridCols),
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create location")
	}
	return &LocationOutput{Body: LocationRow{
		ID: r.ID, Name: r.Name, ParentID: r.ParentID, Description: r.Description,
		LocationType: r.LocationType, GridRows: fromNullInt4(r.GridRows), GridCols: fromNullInt4(r.GridCols),
		ItemCount: 0, CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
	}}, nil
}

// UpdateLocation updates a location.
func (h *Handler) UpdateLocation(ctx context.Context, input *UpdateLocationInput) (*LocationOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	existing, err := h.q.GetLocation(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "location not found")
	}
	locType, err := validateLocationType(input.Body.LocationType, input.Body.GridRows, input.Body.GridCols)
	if err != nil {
		return nil, err
	}
	if err := h.validateParent(ctx, input.Body.ParentID); err != nil {
		return nil, err
	}
	if locType == "container" && existing.LocationType != "container" {
		childCount, err := h.q.CountLocationChildren(ctx, &input.ID)
		if err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to check child locations")
		}
		if childCount > 0 {
			return nil, huma.NewError(http.StatusConflict, "move or remove child locations before making this a container")
		}
	}
	if input.Body.GridRows != nil || input.Body.GridCols != nil {
		maxCell, err := h.q.GetMaxGridCell(ctx, &input.ID)
		if err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to check placed items")
		}
		if input.Body.GridRows != nil && maxCell.MaxRow >= int32(*input.Body.GridRows) {
			return nil, huma.NewError(http.StatusConflict, "cannot shrink rows: an item is already placed in a row outside the new grid")
		}
		if input.Body.GridCols != nil && maxCell.MaxCol >= int32(*input.Body.GridCols) {
			return nil, huma.NewError(http.StatusConflict, "cannot shrink columns: an item is already placed in a column outside the new grid")
		}
	}
	if err := h.q.UpdateLocation(ctx, store.UpdateLocationParams{
		ID:           input.ID,
		Name:         input.Body.Name,
		ParentID:     input.Body.ParentID,
		Description:  input.Body.Description,
		LocationType: locType,
		GridRows:     toNullInt4(input.Body.GridRows),
		GridCols:     toNullInt4(input.Body.GridCols),
	}); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update location")
	}
	r, err := h.q.GetLocation(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "location not found")
	}
	return &LocationOutput{Body: LocationRow{
		ID: r.ID, Name: r.Name, ParentID: r.ParentID, Description: r.Description,
		LocationType: r.LocationType, GridRows: fromNullInt4(r.GridRows), GridCols: fromNullInt4(r.GridCols),
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
