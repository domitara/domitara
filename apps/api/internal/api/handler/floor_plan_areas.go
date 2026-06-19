package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"regexp"
	"time"

	"github.com/danielgtaylor/huma/v2"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

var hexColorRe = regexp.MustCompile(`^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$`)

// FloorPlanGeometry is a normalized polygon in percentage coordinates (0.0–1.0).
type FloorPlanGeometry struct {
	Type        string       `json:"type"`
	Coordinates [][2]float64 `json:"coordinates"`
}

func geometryBytes(g *FloorPlanGeometry) []byte {
	if g == nil {
		return nil
	}
	b, _ := json.Marshal(g)
	return b
}

// ---- types ----

// FloorPlanAreaRow is the API representation of a floor plan area.
type FloorPlanAreaRow struct {
	ID         string          `json:"id"`
	HomeID     string          `json:"home_id"`
	DocumentID *string         `json:"document_id"`
	Name       string          `json:"name"`
	Color      string          `json:"color"`
	Geometry   json.RawMessage `json:"geometry"`
	CreatedAt  time.Time       `json:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at"`
}

// FloorPlanAreasOutput is the response body listing floor plan areas.
type FloorPlanAreasOutput struct{ Body []FloorPlanAreaRow }

// FloorPlanAreaOutput is the response body for a single floor plan area.
type FloorPlanAreaOutput struct{ Body FloorPlanAreaRow }

// FloorPlanAreaIDInput carries a floor plan area ID path parameter.
type FloorPlanAreaIDInput struct {
	ID string `path:"id"`
}

// CreateFloorPlanAreaInput is the request body for creating a floor plan area.
type CreateFloorPlanAreaInput struct {
	HomeID string `path:"homeId"`
	Body   struct {
		Name       string             `json:"name" minLength:"1"`
		Color      string             `json:"color,omitempty"`
		DocumentID *string            `json:"document_id,omitempty"`
		Geometry   *FloorPlanGeometry `json:"geometry,omitempty"`
	}
}

// UpdateFloorPlanAreaInput is the request body for updating a floor plan area.
type UpdateFloorPlanAreaInput struct {
	ID   string `path:"id"`
	Body struct {
		Name     string             `json:"name" minLength:"1"`
		Color    string             `json:"color"`
		Geometry *FloorPlanGeometry `json:"geometry,omitempty"`
	}
}

// ---- handlers ----

// ListFloorPlanAreas returns the floor plan areas for a home.
func (h *Handler) ListFloorPlanAreas(ctx context.Context, input *struct {
	HomeID string `path:"homeId"`
}) (*FloorPlanAreasOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, input.HomeID, claims.Sub); err != nil {
		return nil, err
	}
	rows, err := h.q.ListFloorPlanAreas(ctx, input.HomeID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list floor plan areas")
	}
	areas := make([]FloorPlanAreaRow, len(rows))
	for i, a := range rows {
		areas[i] = FloorPlanAreaRow{
			ID: a.ID, HomeID: a.HomeID, DocumentID: a.DocumentID, Name: a.Name, Color: a.Color,
			Geometry:  json.RawMessage(a.Geometry),
			CreatedAt: a.CreatedAt.Time, UpdatedAt: a.UpdatedAt.Time,
		}
	}
	return &FloorPlanAreasOutput{Body: areas}, nil
}

// CreateFloorPlanArea creates a floor plan area in a home.
func (h *Handler) CreateFloorPlanArea(ctx context.Context, input *CreateFloorPlanAreaInput) (*FloorPlanAreaOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, input.HomeID, claims.Sub); err != nil {
		return nil, err
	}
	color := "#3b82f6"
	if input.Body.Color != "" {
		if !hexColorRe.MatchString(input.Body.Color) {
			return nil, huma.NewError(http.StatusUnprocessableEntity, "color must be a valid hex color (e.g. #3b82f6)")
		}
		color = input.Body.Color
	}
	a, err := h.q.CreateFloorPlanArea(ctx, store.CreateFloorPlanAreaParams{
		HomeID:     input.HomeID,
		DocumentID: input.Body.DocumentID,
		Name:       input.Body.Name,
		Color:      color,
		Geometry:   geometryBytes(input.Body.Geometry),
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create floor plan area")
	}
	return &FloorPlanAreaOutput{Body: FloorPlanAreaRow{
		ID: a.ID, HomeID: a.HomeID, DocumentID: a.DocumentID, Name: a.Name, Color: a.Color,
		Geometry:  json.RawMessage(a.Geometry),
		CreatedAt: a.CreatedAt.Time, UpdatedAt: a.UpdatedAt.Time,
	}}, nil
}

// UpdateFloorPlanArea updates a floor plan area.
func (h *Handler) UpdateFloorPlanArea(ctx context.Context, input *UpdateFloorPlanAreaInput) (*FloorPlanAreaOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if input.Body.Color != "" && !hexColorRe.MatchString(input.Body.Color) {
		return nil, huma.NewError(http.StatusUnprocessableEntity, "color must be a valid hex color")
	}
	a, err := h.q.UpdateFloorPlanArea(ctx, store.UpdateFloorPlanAreaParams{
		ID:       input.ID,
		Name:     input.Body.Name,
		Color:    input.Body.Color,
		Geometry: geometryBytes(input.Body.Geometry),
	})
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "floor plan area not found")
	}
	return &FloorPlanAreaOutput{Body: FloorPlanAreaRow{
		ID: a.ID, HomeID: a.HomeID, DocumentID: a.DocumentID, Name: a.Name, Color: a.Color,
		Geometry:  json.RawMessage(a.Geometry),
		CreatedAt: a.CreatedAt.Time, UpdatedAt: a.UpdatedAt.Time,
	}}, nil
}

// DeleteFloorPlanArea deletes a floor plan area.
func (h *Handler) DeleteFloorPlanArea(ctx context.Context, input *FloorPlanAreaIDInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if err := h.q.DeleteFloorPlanArea(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete floor plan area")
	}
	return nil, nil
}
