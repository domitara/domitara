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

// ElectricalPanelRow is the API representation of an electrical panel.
type ElectricalPanelRow struct {
	ID             string    `json:"id"`
	HomeID         string    `json:"home_id"`
	Name           string    `json:"name"`
	TotalAmps      int       `json:"total_amps"`
	TotalSlots     int       `json:"total_slots"`
	LocationNote   *string   `json:"location_note"`
	ParentPanelID  *string   `json:"parent_panel_id"`
	FedByBreakerID *string   `json:"fed_by_breaker_id"`
	SortOrder      int       `json:"sort_order"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// ElectricalPanelsOutput is the response body listing panels.
type ElectricalPanelsOutput struct{ Body []ElectricalPanelRow }

// ElectricalPanelOutput is the response body for a single panel.
type ElectricalPanelOutput struct{ Body ElectricalPanelRow }

// ElectricalPanelIDInput carries a panel ID path parameter.
type ElectricalPanelIDInput struct {
	ID string `path:"id"`
}

// CreateElectricalPanelInput is the request body for creating a panel.
type CreateElectricalPanelInput struct {
	HomeID string `path:"homeId"`
	Body   struct {
		Name           string  `json:"name" minLength:"1"`
		TotalAmps      int     `json:"total_amps"`
		TotalSlots     *int    `json:"total_slots,omitempty"`
		LocationNote   *string `json:"location_note,omitempty"`
		ParentPanelID  *string `json:"parent_panel_id,omitempty"`
		FedByBreakerID *string `json:"fed_by_breaker_id,omitempty"`
		SortOrder      *int    `json:"sort_order,omitempty"`
	}
}

// UpdateElectricalPanelInput is the request body for updating a panel.
type UpdateElectricalPanelInput struct {
	ID   string `path:"id"`
	Body struct {
		Name           string  `json:"name" minLength:"1"`
		TotalAmps      int     `json:"total_amps"`
		TotalSlots     int     `json:"total_slots"`
		LocationNote   *string `json:"location_note,omitempty"`
		ParentPanelID  *string `json:"parent_panel_id,omitempty"`
		FedByBreakerID *string `json:"fed_by_breaker_id,omitempty"`
		SortOrder      int     `json:"sort_order"`
	}
}

// defaultSlots maps common amperage values to typical slot counts.
func defaultSlots(amps int) int {
	switch amps {
	case 100:
		return 20
	case 150:
		return 30
	case 400:
		return 84
	default:
		return 40 // 200A default
	}
}

func panelRowFromSQL(p store.ElectricalPanel) ElectricalPanelRow {
	return ElectricalPanelRow{
		ID:             p.ID,
		HomeID:         p.HomeID,
		Name:           p.Name,
		TotalAmps:      int(p.TotalAmps),
		TotalSlots:     int(p.TotalSlots),
		LocationNote:   p.LocationNote,
		ParentPanelID:  p.ParentPanelID,
		FedByBreakerID: p.FedByBreakerID,
		SortOrder:      int(p.SortOrder),
		CreatedAt:      p.CreatedAt.Time,
		UpdatedAt:      p.UpdatedAt.Time,
	}
}

// ---- handlers ----

// ListPanels returns the electrical panels for a home.
func (h *Handler) ListPanels(ctx context.Context, input *struct {
	HomeID string `path:"homeId"`
}) (*ElectricalPanelsOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, input.HomeID, claims.Sub); err != nil {
		return nil, err
	}
	rows, err := h.q.ListPanels(ctx, input.HomeID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list panels")
	}
	panels := make([]ElectricalPanelRow, len(rows))
	for i, p := range rows {
		panels[i] = panelRowFromSQL(p)
	}
	return &ElectricalPanelsOutput{Body: panels}, nil
}

// CreatePanel creates an electrical panel in a home.
func (h *Handler) CreatePanel(ctx context.Context, input *CreateElectricalPanelInput) (*ElectricalPanelOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, input.HomeID, claims.Sub); err != nil {
		return nil, err
	}

	slots := defaultSlots(input.Body.TotalAmps)
	if input.Body.TotalSlots != nil {
		slots = *input.Body.TotalSlots
	}
	sortOrder := 0
	if input.Body.SortOrder != nil {
		sortOrder = *input.Body.SortOrder
	}

	if input.Body.FedByBreakerID != nil {
		if _, err := h.q.GetBreakerPanelID(ctx, *input.Body.FedByBreakerID); err != nil {
			return nil, huma.NewError(http.StatusUnprocessableEntity, "fed_by_breaker_id does not reference a valid breaker")
		}
	}

	p, err := h.q.CreatePanel(ctx, store.CreatePanelParams{
		HomeID:         input.HomeID,
		Name:           input.Body.Name,
		TotalAmps:      int32(input.Body.TotalAmps),
		TotalSlots:     int32(slots),
		LocationNote:   input.Body.LocationNote,
		ParentPanelID:  input.Body.ParentPanelID,
		FedByBreakerID: input.Body.FedByBreakerID,
		SortOrder:      int32(sortOrder),
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create panel")
	}
	return &ElectricalPanelOutput{Body: panelRowFromSQL(p)}, nil
}

// GetPanel returns a single panel by ID.
func (h *Handler) GetPanel(ctx context.Context, input *ElectricalPanelIDInput) (*ElectricalPanelOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	p, err := h.q.GetPanel(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "panel not found")
	}
	if _, err := h.requireHomeMember(ctx, p.HomeID, claims.Sub); err != nil {
		return nil, err
	}
	return &ElectricalPanelOutput{Body: panelRowFromSQL(p)}, nil
}

// UpdatePanel updates a panel.
func (h *Handler) UpdatePanel(ctx context.Context, input *UpdateElectricalPanelInput) (*ElectricalPanelOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	existing, err := h.q.GetPanel(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "panel not found")
	}
	if _, err := h.requireHomeMember(ctx, existing.HomeID, claims.Sub); err != nil {
		return nil, err
	}

	if input.Body.FedByBreakerID != nil {
		bPanelID, err := h.q.GetBreakerPanelID(ctx, *input.Body.FedByBreakerID)
		if err != nil {
			return nil, huma.NewError(http.StatusUnprocessableEntity, "fed_by_breaker_id does not reference a valid breaker")
		}
		if bPanelID == input.ID {
			return nil, huma.NewError(http.StatusUnprocessableEntity, "fed_by_breaker_id must reference a breaker in a different panel")
		}
	}

	p, err := h.q.UpdatePanel(ctx, store.UpdatePanelParams{
		ID:             input.ID,
		Name:           input.Body.Name,
		TotalAmps:      int32(input.Body.TotalAmps),
		TotalSlots:     int32(input.Body.TotalSlots),
		LocationNote:   input.Body.LocationNote,
		ParentPanelID:  input.Body.ParentPanelID,
		FedByBreakerID: input.Body.FedByBreakerID,
		SortOrder:      int32(input.Body.SortOrder),
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update panel")
	}
	return &ElectricalPanelOutput{Body: panelRowFromSQL(p)}, nil
}

// DeletePanel deletes a panel.
func (h *Handler) DeletePanel(ctx context.Context, input *ElectricalPanelIDInput) (*struct{}, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	existing, err := h.q.GetPanel(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "panel not found")
	}
	if _, err := h.requireHomeMember(ctx, existing.HomeID, claims.Sub); err != nil {
		return nil, err
	}

	panelID := input.ID
	subCount, err := h.q.CountSubpanels(ctx, &panelID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to check subpanels")
	}
	if subCount > 0 {
		return nil, huma.NewError(http.StatusConflict, "delete all subpanels before deleting this panel")
	}

	if err := h.q.DeletePanel(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete panel")
	}
	return nil, nil
}
