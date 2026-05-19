package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

// FloorPlanGeometry is defined in floor_plan_areas.go

// ---- types ----

type FloorPlanShapeRow struct {
	ID         string          `json:"id"`
	HomeID     string          `json:"home_id"`
	DocumentID *string         `json:"document_id"`
	ItemID     *string         `json:"item_id"`
	Label      *string         `json:"label"`
	Color      string          `json:"color"`
	Geometry   json.RawMessage `json:"geometry"`
	CreatedAt  time.Time       `json:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at"`
}

type FloorPlanShapesOutput struct{ Body []FloorPlanShapeRow }
type FloorPlanShapeOutput struct{ Body FloorPlanShapeRow }

type FloorPlanShapeIDInput struct {
	ID string `path:"id"`
}

type CreateFloorPlanShapeInput struct {
	HomeID string `path:"homeId"`
	Body   struct {
		DocumentID *string            `json:"document_id,omitempty"`
		ItemID     *string            `json:"item_id,omitempty"`
		Label      *string            `json:"label,omitempty"`
		Color      string             `json:"color,omitempty"`
		Geometry   *FloorPlanGeometry `json:"geometry,omitempty"`
	}
}

type UpdateFloorPlanShapeInput struct {
	ID   string `path:"id"`
	Body struct {
		DocumentID *string            `json:"document_id,omitempty"`
		ItemID     *string            `json:"item_id,omitempty"`
		Label      *string            `json:"label,omitempty"`
		Color      string             `json:"color,omitempty"`
		Geometry   *FloorPlanGeometry `json:"geometry,omitempty"`
	}
}

// ---- helpers ----

func shapeRowFrom(s store.FloorPlanShape) FloorPlanShapeRow {
	return FloorPlanShapeRow{
		ID: s.ID, HomeID: s.HomeID, DocumentID: s.DocumentID, ItemID: s.ItemID,
		Label: s.Label, Color: s.Color, Geometry: json.RawMessage(s.Geometry),
		CreatedAt: s.CreatedAt.Time, UpdatedAt: s.UpdatedAt.Time,
	}
}

// ---- handlers ----

func (h *Handler) ListFloorPlanShapes(ctx context.Context, input *struct {
	HomeID string `path:"homeId"`
}) (*FloorPlanShapesOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, input.HomeID, claims.Sub); err != nil {
		return nil, err
	}
	rows, err := h.q.ListFloorPlanShapes(ctx, input.HomeID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list floor plan shapes")
	}
	shapes := make([]FloorPlanShapeRow, len(rows))
	for i, s := range rows {
		shapes[i] = FloorPlanShapeRow{
			ID: s.ID, HomeID: s.HomeID, DocumentID: s.DocumentID, ItemID: s.ItemID,
			Label: s.Label, Color: s.Color, Geometry: json.RawMessage(s.Geometry),
			CreatedAt: s.CreatedAt.Time, UpdatedAt: s.UpdatedAt.Time,
		}
	}
	return &FloorPlanShapesOutput{Body: shapes}, nil
}

func (h *Handler) CreateFloorPlanShape(ctx context.Context, input *CreateFloorPlanShapeInput) (*FloorPlanShapeOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, input.HomeID, claims.Sub); err != nil {
		return nil, err
	}
	color := "#f59e0b"
	if input.Body.Color != "" {
		if !hexColorRe.MatchString(input.Body.Color) {
			return nil, huma.NewError(http.StatusUnprocessableEntity, "color must be a valid hex color (e.g. #f59e0b)")
		}
		color = input.Body.Color
	}
	s, err := h.q.CreateFloorPlanShape(ctx, store.CreateFloorPlanShapeParams{
		HomeID:     input.HomeID,
		DocumentID: input.Body.DocumentID,
		ItemID:     input.Body.ItemID,
		Label:      input.Body.Label,
		Color:      color,
		Geometry:   geometryBytes(input.Body.Geometry),
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create floor plan shape")
	}
	return &FloorPlanShapeOutput{Body: shapeRowFrom(s)}, nil
}

func (h *Handler) UpdateFloorPlanShape(ctx context.Context, input *UpdateFloorPlanShapeInput) (*FloorPlanShapeOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if input.Body.Color != "" && !hexColorRe.MatchString(input.Body.Color) {
		return nil, huma.NewError(http.StatusUnprocessableEntity, "color must be a valid hex color")
	}
	color := input.Body.Color
	if color == "" {
		color = "#f59e0b"
	}
	s, err := h.q.UpdateFloorPlanShape(ctx, store.UpdateFloorPlanShapeParams{
		ID:         input.ID,
		DocumentID: input.Body.DocumentID,
		ItemID:     input.Body.ItemID,
		Label:      input.Body.Label,
		Color:      color,
		Geometry:   geometryBytes(input.Body.Geometry),
	})
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "floor plan shape not found")
	}
	return &FloorPlanShapeOutput{Body: shapeRowFrom(s)}, nil
}

func (h *Handler) DeleteFloorPlanShape(ctx context.Context, input *FloorPlanShapeIDInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if err := h.q.DeleteFloorPlanShape(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete floor plan shape")
	}
	return nil, nil
}
