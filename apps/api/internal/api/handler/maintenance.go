package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"

	apimw "github.com/your-org/monorepo/apps/api/internal/api/middleware"
)

type MaintenanceLogRow struct {
	ID          string    `json:"id"`
	ItemID      *string   `json:"item_id"`
	ItemName    *string   `json:"item_name"`
	Title       string    `json:"title"`
	Notes       *string   `json:"notes"`
	Cost        *float64  `json:"cost"`
	PerformedAt string    `json:"performed_at"`
	CreatedAt   time.Time `json:"created_at"`
}

type MaintenanceLogsOutput struct{ Body []MaintenanceLogRow }
type MaintenanceLogOutput struct{ Body MaintenanceLogRow }

type ListMaintenanceInput struct {
	ItemID *string `query:"item_id"`
}

type MaintenanceIDInput struct {
	ID string `path:"id"`
}

type CreateMaintenanceInput struct {
	Body struct {
		ItemID      *string  `json:"item_id,omitempty"`
		Title       string   `json:"title" minLength:"1"`
		Notes       *string  `json:"notes,omitempty"`
		Cost        *float64 `json:"cost,omitempty"`
		PerformedAt *string  `json:"performed_at,omitempty"`
	}
}

func (h *Handler) ListMaintenance(ctx context.Context, input *ListMaintenanceInput) (*MaintenanceLogsOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	query := `
		SELECT ml.id, ml.item_id, i.name, ml.title, ml.notes,
		       ml.cost, ml.performed_at::text, ml.created_at
		FROM maintenance_logs ml
		LEFT JOIN items i ON i.id = ml.item_id`
	args := []any{}
	if input.ItemID != nil {
		query += ` WHERE ml.item_id = $1`
		args = append(args, *input.ItemID)
	}
	query += ` ORDER BY ml.performed_at DESC, ml.created_at DESC`

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list maintenance logs")
	}
	defer rows.Close()
	logs := []MaintenanceLogRow{}
	for rows.Next() {
		var l MaintenanceLogRow
		if err := rows.Scan(&l.ID, &l.ItemID, &l.ItemName, &l.Title, &l.Notes,
			&l.Cost, &l.PerformedAt, &l.CreatedAt); err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to scan maintenance log")
		}
		logs = append(logs, l)
	}
	return &MaintenanceLogsOutput{Body: logs}, nil
}

func (h *Handler) CreateMaintenance(ctx context.Context, input *CreateMaintenanceInput) (*MaintenanceLogOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var log MaintenanceLogRow
	err = h.pool.QueryRow(ctx,
		`INSERT INTO maintenance_logs (item_id, title, notes, cost, performed_at, created_by)
		 VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6)
		 RETURNING id, item_id, NULL, title, notes, cost, performed_at::text, created_at`,
		input.Body.ItemID, input.Body.Title, input.Body.Notes,
		input.Body.Cost, input.Body.PerformedAt, claims.Sub,
	).Scan(&log.ID, &log.ItemID, &log.ItemName, &log.Title, &log.Notes,
		&log.Cost, &log.PerformedAt, &log.CreatedAt)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create maintenance log")
	}
	return &MaintenanceLogOutput{Body: log}, nil
}

func (h *Handler) DeleteMaintenance(ctx context.Context, input *MaintenanceIDInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if _, err := h.pool.Exec(ctx, `DELETE FROM maintenance_logs WHERE id = $1`, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete log")
	}
	return nil, nil
}
