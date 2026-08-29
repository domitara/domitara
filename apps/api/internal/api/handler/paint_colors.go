package handler

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

// ---- paint color types ----

// PaintColorRow is the API representation of a paint color.
type PaintColorRow struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Color         string    `json:"color"`
	Brand         *string   `json:"brand"`
	ColorCode     *string   `json:"color_code"`
	Sheen         *string   `json:"sheen"`
	Notes         *string   `json:"notes"`
	LocationCount int64     `json:"location_count"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// PaintColorsOutput is the response body listing paint colors.
type PaintColorsOutput struct{ Body []PaintColorRow }

// PaintColorOutput is the response body for a single paint color.
type PaintColorOutput struct{ Body PaintColorRow }

// PaintColorIDInput carries a paint color ID path parameter.
type PaintColorIDInput struct {
	ID string `path:"id"`
}

// CreatePaintColorInput is the request body for creating a paint color.
type CreatePaintColorInput struct {
	Body struct {
		Name      string  `json:"name" minLength:"1"`
		Color     *string `json:"color,omitempty"`
		Brand     *string `json:"brand,omitempty"`
		ColorCode *string `json:"color_code,omitempty"`
		Sheen     *string `json:"sheen,omitempty"`
		Notes     *string `json:"notes,omitempty"`
	}
}

// UpdatePaintColorInput is the request body for updating a paint color.
type UpdatePaintColorInput struct {
	ID   string `path:"id"`
	Body struct {
		Name      string  `json:"name" minLength:"1"`
		Color     string  `json:"color"`
		Brand     *string `json:"brand,omitempty"`
		ColorCode *string `json:"color_code,omitempty"`
		Sheen     *string `json:"sheen,omitempty"`
		Notes     *string `json:"notes,omitempty"`
	}
}

// ---- location paint types ----

// LocationPaintRow is the API representation of a paint assignment on a location surface.
type LocationPaintRow struct {
	ID             string    `json:"id"`
	LocationID     string    `json:"location_id"`
	PaintColorID   string    `json:"paint_color_id"`
	Surface        string    `json:"surface"`
	SurfaceNote    *string   `json:"surface_note"`
	PaintedOn      *string   `json:"painted_on"`
	Coats          *int      `json:"coats"`
	Notes          *string   `json:"notes"`
	PaintName      string    `json:"paint_name"`
	PaintColor     string    `json:"paint_color"`
	PaintBrand     *string   `json:"paint_brand"`
	PaintColorCode *string   `json:"paint_color_code"`
	PaintSheen     *string   `json:"paint_sheen"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// LocationPaintListOutput is the response body listing a location's paint assignments.
type LocationPaintListOutput struct{ Body []LocationPaintRow }

// LocationPaintOutput is the response body for a single paint assignment.
type LocationPaintOutput struct{ Body LocationPaintRow }

// LocationPaintIDInput carries a location paint assignment ID path parameter.
type LocationPaintIDInput struct {
	ID string `path:"id"`
}

// LocationIDPathInput carries a location ID path parameter (for nested paint routes).
type LocationIDPathInput struct {
	ID string `path:"id"`
}

type locationPaintBody struct {
	PaintColorID string  `json:"paint_color_id" minLength:"1"`
	Surface      string  `json:"surface" enum:"walls,ceiling,trim,doors,accent"`
	SurfaceNote  *string `json:"surface_note,omitempty"`
	PaintedOn    *string `json:"painted_on,omitempty"`
	Coats        *int    `json:"coats,omitempty"`
	Notes        *string `json:"notes,omitempty"`
}

// CreateLocationPaintInput is the request body for assigning paint to a location surface.
type CreateLocationPaintInput struct {
	ID   string `path:"id"`
	Body locationPaintBody
}

// UpdateLocationPaintInput is the request body for updating a paint assignment.
type UpdateLocationPaintInput struct {
	ID   string `path:"id"`
	Body locationPaintBody
}

// ---- paint color handlers ----

const defaultPaintColor = "#e7e5e4"

// ListPaintColors returns paint colors for the active home, or all if none is set.
func (h *Handler) ListPaintColors(ctx context.Context, _ *struct{}) (*PaintColorsOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	homeID := apimw.GetActiveHome(ctx)
	colors := []PaintColorRow{}
	if homeID != "" {
		rows, err := h.q.ListPaintColorsByHome(ctx, homeID)
		if err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to list paint colors")
		}
		for _, r := range rows {
			colors = append(colors, PaintColorRow{
				ID: r.ID, Name: r.Name, Color: r.Color, Brand: r.Brand, ColorCode: r.ColorCode,
				Sheen: r.Sheen, Notes: r.Notes, LocationCount: r.LocationCount,
				CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
			})
		}
	} else {
		rows, err := h.q.ListAllPaintColors(ctx)
		if err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to list paint colors")
		}
		for _, r := range rows {
			colors = append(colors, PaintColorRow{
				ID: r.ID, Name: r.Name, Color: r.Color, Brand: r.Brand, ColorCode: r.ColorCode,
				Sheen: r.Sheen, Notes: r.Notes, LocationCount: r.LocationCount,
				CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
			})
		}
	}
	return &PaintColorsOutput{Body: colors}, nil
}

// CreatePaintColor creates a paint color in the active home.
func (h *Handler) CreatePaintColor(ctx context.Context, input *CreatePaintColorInput) (*PaintColorOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	homeID := apimw.GetActiveHome(ctx)
	if homeID == "" {
		return nil, huma.NewError(http.StatusBadRequest, "X-Active-Home header required")
	}
	color := defaultPaintColor
	if input.Body.Color != nil && *input.Body.Color != "" {
		color = *input.Body.Color
	}
	r, err := h.q.CreatePaintColor(ctx, store.CreatePaintColorParams{
		HomeID:    homeID,
		Name:      input.Body.Name,
		Color:     color,
		Brand:     input.Body.Brand,
		ColorCode: input.Body.ColorCode,
		Sheen:     input.Body.Sheen,
		Notes:     input.Body.Notes,
	})
	if err != nil {
		if isUniqueViolation(err, "paint_colors_home_id_name_key") {
			return nil, huma.NewError(http.StatusConflict, "a paint color with that name already exists in this home")
		}
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create paint color")
	}
	return &PaintColorOutput{Body: PaintColorRow{
		ID: r.ID, Name: r.Name, Color: r.Color, Brand: r.Brand, ColorCode: r.ColorCode,
		Sheen: r.Sheen, Notes: r.Notes, LocationCount: 0,
		CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
	}}, nil
}

// UpdatePaintColor updates a paint color's fields.
func (h *Handler) UpdatePaintColor(ctx context.Context, input *UpdatePaintColorInput) (*PaintColorOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	color := input.Body.Color
	if color == "" {
		color = defaultPaintColor
	}
	if err := h.q.UpdatePaintColor(ctx, store.UpdatePaintColorParams{
		ID:        input.ID,
		Name:      input.Body.Name,
		Color:     color,
		Brand:     input.Body.Brand,
		ColorCode: input.Body.ColorCode,
		Sheen:     input.Body.Sheen,
		Notes:     input.Body.Notes,
	}); err != nil {
		if isUniqueViolation(err, "paint_colors_home_id_name_key") {
			return nil, huma.NewError(http.StatusConflict, "a paint color with that name already exists in this home")
		}
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update paint color")
	}
	r, err := h.q.GetPaintColor(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "paint color not found")
	}
	return &PaintColorOutput{Body: PaintColorRow{
		ID: r.ID, Name: r.Name, Color: r.Color, Brand: r.Brand, ColorCode: r.ColorCode,
		Sheen: r.Sheen, Notes: r.Notes, LocationCount: r.LocationCount,
		CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
	}}, nil
}

// DeletePaintColor deletes a paint color that is not assigned to any location.
func (h *Handler) DeletePaintColor(ctx context.Context, input *PaintColorIDInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	inUse, err := h.q.CountPaintColorUsage(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete paint color")
	}
	if inUse > 0 {
		return nil, huma.NewError(http.StatusConflict,
			fmt.Sprintf("this paint color is assigned to %d location surface(s); remove those assignments first", inUse))
	}
	if err := h.q.DeletePaintColor(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete paint color")
	}
	return nil, nil
}

// ---- location paint handlers ----

func locationPaintRowFromList(r store.ListLocationPaintRow) LocationPaintRow {
	return LocationPaintRow{
		ID: r.ID, LocationID: r.LocationID, PaintColorID: r.PaintColorID,
		Surface: r.Surface, SurfaceNote: r.SurfaceNote,
		PaintedOn: pgNullDateStr(r.PaintedOn), Coats: fromNullInt4(r.Coats), Notes: r.Notes,
		PaintName: r.PaintName, PaintColor: r.PaintColor, PaintBrand: r.PaintBrand,
		PaintColorCode: r.PaintColorCode, PaintSheen: r.PaintSheen,
		CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
	}
}

func locationPaintRowFromGet(r store.GetLocationPaintRow) LocationPaintRow {
	return LocationPaintRow{
		ID: r.ID, LocationID: r.LocationID, PaintColorID: r.PaintColorID,
		Surface: r.Surface, SurfaceNote: r.SurfaceNote,
		PaintedOn: pgNullDateStr(r.PaintedOn), Coats: fromNullInt4(r.Coats), Notes: r.Notes,
		PaintName: r.PaintName, PaintColor: r.PaintColor, PaintBrand: r.PaintBrand,
		PaintColorCode: r.PaintColorCode, PaintSheen: r.PaintSheen,
		CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time,
	}
}

// locationInActiveHome returns the location's home ID, or a 404 error if the
// location does not exist or belongs to a different active home.
func (h *Handler) locationInActiveHome(ctx context.Context, locationID string) (string, error) {
	homeID, err := h.q.LocationHomeID(ctx, locationID)
	if err != nil {
		return "", huma.NewError(http.StatusNotFound, "location not found")
	}
	if active := apimw.GetActiveHome(ctx); active != "" && active != homeID {
		return "", huma.NewError(http.StatusNotFound, "location not found")
	}
	return homeID, nil
}

// ListLocationPaint returns the paint assignments for a location.
func (h *Handler) ListLocationPaint(ctx context.Context, input *LocationIDPathInput) (*LocationPaintListOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if _, err := h.locationInActiveHome(ctx, input.ID); err != nil {
		return nil, err
	}
	rows, err := h.q.ListLocationPaint(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list location paint")
	}
	out := []LocationPaintRow{}
	for _, r := range rows {
		out = append(out, locationPaintRowFromList(r))
	}
	return &LocationPaintListOutput{Body: out}, nil
}

// CreateLocationPaint assigns a paint color to a location surface.
func (h *Handler) CreateLocationPaint(ctx context.Context, input *CreateLocationPaintInput) (*LocationPaintOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	locHome, err := h.locationInActiveHome(ctx, input.ID)
	if err != nil {
		return nil, err
	}
	paintHome, err := h.q.PaintColorHomeID(ctx, input.Body.PaintColorID)
	if err != nil {
		return nil, huma.NewError(http.StatusUnprocessableEntity, "paint color not found")
	}
	if paintHome != locHome {
		return nil, huma.NewError(http.StatusUnprocessableEntity, "paint color belongs to a different home")
	}
	id, err := h.q.CreateLocationPaint(ctx, store.CreateLocationPaintParams{
		LocationID:   input.ID,
		PaintColorID: input.Body.PaintColorID,
		Surface:      input.Body.Surface,
		SurfaceNote:  input.Body.SurfaceNote,
		PaintedOn:    parseDatePtr(input.Body.PaintedOn),
		Coats:        toNullInt4(input.Body.Coats),
		Notes:        input.Body.Notes,
	})
	if err != nil {
		if isUniqueViolation(err, "location_paint_loc_surface_uniq") {
			return nil, huma.NewError(http.StatusConflict, "this location already has a paint color for that surface")
		}
		return nil, huma.NewError(http.StatusInternalServerError, "failed to assign paint")
	}
	r, err := h.q.GetLocationPaint(ctx, id)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to load assignment")
	}
	return &LocationPaintOutput{Body: locationPaintRowFromGet(r)}, nil
}

// UpdateLocationPaint updates a paint assignment.
func (h *Handler) UpdateLocationPaint(ctx context.Context, input *UpdateLocationPaintInput) (*LocationPaintOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	existing, err := h.q.GetLocationPaint(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "paint assignment not found")
	}
	locHome, err := h.locationInActiveHome(ctx, existing.LocationID)
	if err != nil {
		return nil, err
	}
	paintHome, err := h.q.PaintColorHomeID(ctx, input.Body.PaintColorID)
	if err != nil {
		return nil, huma.NewError(http.StatusUnprocessableEntity, "paint color not found")
	}
	if paintHome != locHome {
		return nil, huma.NewError(http.StatusUnprocessableEntity, "paint color belongs to a different home")
	}
	if err := h.q.UpdateLocationPaint(ctx, store.UpdateLocationPaintParams{
		ID:           input.ID,
		PaintColorID: input.Body.PaintColorID,
		Surface:      input.Body.Surface,
		SurfaceNote:  input.Body.SurfaceNote,
		PaintedOn:    parseDatePtr(input.Body.PaintedOn),
		Coats:        toNullInt4(input.Body.Coats),
		Notes:        input.Body.Notes,
	}); err != nil {
		if isUniqueViolation(err, "location_paint_loc_surface_uniq") {
			return nil, huma.NewError(http.StatusConflict, "this location already has a paint color for that surface")
		}
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update paint assignment")
	}
	r, err := h.q.GetLocationPaint(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to load assignment")
	}
	return &LocationPaintOutput{Body: locationPaintRowFromGet(r)}, nil
}

// DeleteLocationPaint removes a paint assignment.
func (h *Handler) DeleteLocationPaint(ctx context.Context, input *LocationPaintIDInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if err := h.q.DeleteLocationPaint(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete paint assignment")
	}
	return nil, nil
}
