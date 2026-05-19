package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

// ---- types ----

type ElectricalBreakerRow struct {
	ID              string    `json:"id"`
	PanelID         string    `json:"panel_id"`
	Slot            int       `json:"slot"`
	Label           *string   `json:"label"`
	Amps            *int      `json:"amps"`
	BreakerType     string    `json:"breaker_type"`
	IsGFCI          bool      `json:"is_gfci"`
	IsAFCI          bool      `json:"is_afci"`
	Notes           *string   `json:"notes"`
	FloorPlanAreaID *string   `json:"floor_plan_area_id"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type ElectricalBreakersOutput struct{ Body []ElectricalBreakerRow }
type ElectricalBreakerOutput struct{ Body ElectricalBreakerRow }

type ElectricalBreakerIDInput struct {
	ID string `path:"id"`
}

type CreateElectricalBreakerInput struct {
	PanelID string `path:"panelId"`
	Body    struct {
		Slot            int     `json:"slot"`
		Label           *string `json:"label,omitempty"`
		Amps            *int    `json:"amps,omitempty"`
		BreakerType     string  `json:"breaker_type,omitempty" enum:"standard,double_pole,tandem,blank,main"`
		IsGFCI          bool    `json:"is_gfci,omitempty"`
		IsAFCI          bool    `json:"is_afci,omitempty"`
		Notes           *string `json:"notes,omitempty"`
		FloorPlanAreaID *string `json:"floor_plan_area_id,omitempty"`
	}
}

type UpdateElectricalBreakerInput struct {
	ID   string `path:"id"`
	Body struct {
		Label           *string `json:"label,omitempty"`
		Amps            *int    `json:"amps,omitempty"`
		BreakerType     string  `json:"breaker_type,omitempty" enum:"standard,double_pole,tandem,blank,main"`
		IsGFCI          bool    `json:"is_gfci"`
		IsAFCI          bool    `json:"is_afci"`
		Notes           *string `json:"notes,omitempty"`
		FloorPlanAreaID *string `json:"floor_plan_area_id,omitempty"`
	}
}

func breakerRowFromSQL(b store.ElectricalBreaker) ElectricalBreakerRow {
	return ElectricalBreakerRow{
		ID:              b.ID,
		PanelID:         b.PanelID,
		Slot:            int(b.Slot),
		Label:           b.Label,
		Amps:            fromNullInt4(b.Amps),
		BreakerType:     b.BreakerType,
		IsGFCI:          b.IsGfci,
		IsAFCI:          b.IsAfci,
		Notes:           b.Notes,
		FloorPlanAreaID: b.FloorPlanAreaID,
		CreatedAt:       b.CreatedAt.Time,
		UpdatedAt:       b.UpdatedAt.Time,
	}
}

// panelHomeID fetches the home_id for a panel (used for access control).
func (h *Handler) panelHomeID(ctx context.Context, panelID string) (string, error) {
	homeID, err := h.q.GetPanelHomeID(ctx, panelID)
	if err != nil {
		return "", huma.NewError(http.StatusNotFound, "panel not found")
	}
	return homeID, nil
}

// ---- handlers ----

func (h *Handler) ListBreakers(ctx context.Context, input *struct {
	PanelID string `path:"panelId"`
}) (*ElectricalBreakersOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	homeID, err := h.panelHomeID(ctx, input.PanelID)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, homeID, claims.Sub); err != nil {
		return nil, err
	}
	rows, err := h.q.ListBreakers(ctx, input.PanelID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list breakers")
	}
	breakers := make([]ElectricalBreakerRow, len(rows))
	for i, b := range rows {
		breakers[i] = breakerRowFromSQL(b)
	}
	return &ElectricalBreakersOutput{Body: breakers}, nil
}

func (h *Handler) CreateBreaker(ctx context.Context, input *CreateElectricalBreakerInput) (*ElectricalBreakerOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	homeID, err := h.panelHomeID(ctx, input.PanelID)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, homeID, claims.Sub); err != nil {
		return nil, err
	}

	breakerType := input.Body.BreakerType
	if breakerType == "" {
		breakerType = "standard"
	}

	if breakerType == "double_pole" && input.Body.Slot%2 == 0 {
		return nil, huma.NewError(http.StatusUnprocessableEntity, "double_pole breakers must start on an odd slot")
	}

	if breakerType == "double_pole" {
		count, err := h.q.CountBreakersAtDoublePoleSlots(ctx, store.CountBreakersAtDoublePoleSlotsParams{
			PanelID: input.PanelID,
			Slot:    int32(input.Body.Slot),
			Slot_2:  int32(input.Body.Slot + 1),
		})
		if err == nil && count > 0 {
			return nil, huma.NewError(http.StatusConflict, "slot conflict: another breaker occupies this slot or the adjacent even slot")
		}
	} else {
		count, err := h.q.CountBreakerAtSlot(ctx, store.CountBreakerAtSlotParams{
			PanelID: input.PanelID,
			Slot:    int32(input.Body.Slot),
		})
		if err == nil && count > 0 {
			return nil, huma.NewError(http.StatusConflict, "a breaker already exists at this slot")
		}
	}

	if input.Body.FloorPlanAreaID != nil {
		areaHomeID, err := h.q.GetFloorPlanAreaHomeID(ctx, *input.Body.FloorPlanAreaID)
		if err != nil || areaHomeID != homeID {
			return nil, huma.NewError(http.StatusUnprocessableEntity, "floor_plan_area_id must belong to the same home")
		}
	}

	b, err := h.q.CreateBreaker(ctx, store.CreateBreakerParams{
		PanelID:         input.PanelID,
		Slot:            int32(input.Body.Slot),
		Label:           input.Body.Label,
		Amps:            toNullInt4(input.Body.Amps),
		BreakerType:     breakerType,
		IsGfci:          input.Body.IsGFCI,
		IsAfci:          input.Body.IsAFCI,
		Notes:           input.Body.Notes,
		FloorPlanAreaID: input.Body.FloorPlanAreaID,
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create breaker")
	}
	return &ElectricalBreakerOutput{Body: breakerRowFromSQL(b)}, nil
}

func (h *Handler) UpdateBreaker(ctx context.Context, input *UpdateElectricalBreakerInput) (*ElectricalBreakerOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	existing, err := h.q.GetBreaker(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "breaker not found")
	}
	homeID, err := h.panelHomeID(ctx, existing.PanelID)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, homeID, claims.Sub); err != nil {
		return nil, err
	}

	breakerType := input.Body.BreakerType
	if breakerType == "" {
		breakerType = existing.BreakerType
	}

	if input.Body.FloorPlanAreaID != nil {
		areaHomeID, err := h.q.GetFloorPlanAreaHomeID(ctx, *input.Body.FloorPlanAreaID)
		if err != nil || areaHomeID != homeID {
			return nil, huma.NewError(http.StatusUnprocessableEntity, "floor_plan_area_id must belong to the same home")
		}
	}

	b, err := h.q.UpdateBreaker(ctx, store.UpdateBreakerParams{
		ID:              input.ID,
		Label:           input.Body.Label,
		Amps:            toNullInt4(input.Body.Amps),
		BreakerType:     breakerType,
		IsGfci:          input.Body.IsGFCI,
		IsAfci:          input.Body.IsAFCI,
		Notes:           input.Body.Notes,
		FloorPlanAreaID: input.Body.FloorPlanAreaID,
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update breaker")
	}
	return &ElectricalBreakerOutput{Body: breakerRowFromSQL(b)}, nil
}

func (h *Handler) DeleteBreaker(ctx context.Context, input *ElectricalBreakerIDInput) (*struct{}, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	existing, err := h.q.GetBreaker(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "breaker not found")
	}
	homeID, err := h.panelHomeID(ctx, existing.PanelID)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, homeID, claims.Sub); err != nil {
		return nil, err
	}
	if err := h.q.DeleteBreaker(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete breaker")
	}
	return nil, nil
}
