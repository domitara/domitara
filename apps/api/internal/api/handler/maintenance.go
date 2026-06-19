package handler

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5/pgtype"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

// --- Maintenance Logs ---

// MaintenanceLogRow is the API representation of a maintenance log entry.
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

// MaintenanceLogsOutput is the response body listing maintenance log entries.
type MaintenanceLogsOutput struct{ Body []MaintenanceLogRow }

// MaintenanceLogOutput is the response body for a single maintenance log entry.
type MaintenanceLogOutput struct{ Body MaintenanceLogRow }

// ListMaintenanceInput holds the optional query filters for listing logs.
type ListMaintenanceInput struct {
	ItemID string `query:"item_id"`
}

// MaintenanceIDInput carries a maintenance log ID path parameter.
type MaintenanceIDInput struct {
	ID string `path:"id"`
}

// CreateMaintenanceInput is the request body for creating a maintenance log entry.
type CreateMaintenanceInput struct {
	Body struct {
		ItemID      *string  `json:"item_id,omitempty"`
		ScheduleID  *string  `json:"schedule_id,omitempty"`
		Title       string   `json:"title" minLength:"1"`
		Notes       *string  `json:"notes,omitempty"`
		Cost        *float64 `json:"cost,omitempty"`
		PerformedAt *string  `json:"performed_at,omitempty"`
	}
}

// ListMaintenance returns maintenance log entries, optionally filtered by item.
//
// sqlc not used here: dynamic WHERE clause built at runtime based on optional filters (home_id, item_id)
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
	conditions := []string{}
	n := 1

	homeID := apimw.GetActiveHome(ctx)
	if homeID != "" {
		conditions = append(conditions, fmt.Sprintf(`ml.home_id = $%d`, n))
		args = append(args, homeID)
		n++
	}
	if input.ItemID != "" {
		conditions = append(conditions, fmt.Sprintf(`ml.item_id = $%d`, n))
		args = append(args, input.ItemID)
		n++
	}
	if len(conditions) > 0 {
		query += ` WHERE ` + strings.Join(conditions, ` AND `)
	}
	_ = n
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

// CreateMaintenance creates a maintenance log entry and advances any linked schedule.
func (h *Handler) CreateMaintenance(ctx context.Context, input *CreateMaintenanceInput) (*MaintenanceLogOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	homeID := apimw.GetActiveHome(ctx)
	if homeID == "" {
		return nil, huma.NewError(http.StatusBadRequest, "X-Active-Home header required")
	}

	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to begin transaction")
	}
	defer func() { _ = tx.Rollback(ctx) }()
	qtx := h.q.WithTx(tx)

	rec, err := qtx.CreateMaintenanceLog(ctx, store.CreateMaintenanceLogParams{
		ItemID:     input.Body.ItemID,
		Title:      input.Body.Title,
		Notes:      input.Body.Notes,
		Cost:       toNullNumeric(input.Body.Cost),
		Column5:    parseDatePtr(input.Body.PerformedAt),
		CreatedBy:  pgtype.Int8{Int64: claims.Sub, Valid: true},
		HomeID:     &homeID,
		ScheduleID: input.Body.ScheduleID,
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create maintenance log")
	}

	if input.Body.ScheduleID != nil {
		if err := qtx.AdvanceMaintenanceSchedule(ctx, store.AdvanceMaintenanceScheduleParams{
			ID:              *input.Body.ScheduleID,
			LastPerformedAt: parseDatePtr(input.Body.PerformedAt),
		}); err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to advance schedule")
		}
		_ = qtx.DeleteReminderByKey(ctx, "schedule_due_"+*input.Body.ScheduleID)
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to commit transaction")
	}

	log := MaintenanceLogRow{
		ID:          rec.ID,
		ItemID:      rec.ItemID,
		ItemName:    rec.ItemName,
		Title:       rec.Title,
		Notes:       rec.Notes,
		Cost:        fromNullNumeric(rec.Cost),
		PerformedAt: pgDateStr(rec.PerformedAt),
		CreatedAt:   rec.CreatedAt.Time,
	}
	return &MaintenanceLogOutput{Body: log}, nil
}

// DeleteMaintenance deletes a maintenance log entry.
func (h *Handler) DeleteMaintenance(ctx context.Context, input *MaintenanceIDInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if err := h.q.DeleteMaintenanceLog(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete log")
	}
	return nil, nil
}

// --- Maintenance Schedules ---

// MaintenanceScheduleRow is the API representation of a maintenance schedule.
type MaintenanceScheduleRow struct {
	ID              string    `json:"id"`
	ItemID          *string   `json:"item_id"`
	ItemName        *string   `json:"item_name"`
	Title           string    `json:"title"`
	Notes           *string   `json:"notes"`
	FrequencyValue  int       `json:"frequency_value"`
	FrequencyUnit   string    `json:"frequency_unit"`
	LastPerformedAt *string   `json:"last_performed_at"`
	NextDueAt       string    `json:"next_due_at"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// MaintenanceSchedulesOutput is the response body listing maintenance schedules.
type MaintenanceSchedulesOutput struct{ Body []MaintenanceScheduleRow }

// MaintenanceScheduleOutput is the response body for a single maintenance schedule.
type MaintenanceScheduleOutput struct{ Body MaintenanceScheduleRow }

// ScheduleIDInput carries a maintenance schedule ID path parameter.
type ScheduleIDInput struct {
	ID string `path:"id"`
}

// CreateScheduleInput is the request body for creating a maintenance schedule.
type CreateScheduleInput struct {
	Body struct {
		ItemID         *string `json:"item_id,omitempty"`
		Title          string  `json:"title" minLength:"1"`
		Notes          *string `json:"notes,omitempty"`
		FrequencyValue int     `json:"frequency_value" minimum:"1"`
		FrequencyUnit  string  `json:"frequency_unit" enum:"days,weeks,months,years"`
		NextDueAt      *string `json:"next_due_at,omitempty"`
	}
}

// UpdateScheduleInput is the request body for updating a maintenance schedule.
type UpdateScheduleInput struct {
	ID   string `path:"id"`
	Body struct {
		ItemID         *string `json:"item_id,omitempty"`
		Title          string  `json:"title" minLength:"1"`
		Notes          *string `json:"notes,omitempty"`
		FrequencyValue int     `json:"frequency_value" minimum:"1"`
		FrequencyUnit  string  `json:"frequency_unit" enum:"days,weeks,months,years"`
		NextDueAt      string  `json:"next_due_at"`
	}
}

func scheduleRowFromSQL(id string, itemID *string, itemName *string, title string, notes *string,
	freqValue int32, freqUnit string, lastPerformedAt *time.Time, nextDueAt pgtype.Date,
	createdAt pgtype.Timestamptz, updatedAt pgtype.Timestamptz) MaintenanceScheduleRow {
	return MaintenanceScheduleRow{
		ID:              id,
		ItemID:          itemID,
		ItemName:        itemName,
		Title:           title,
		Notes:           notes,
		FrequencyValue:  int(freqValue),
		FrequencyUnit:   freqUnit,
		LastPerformedAt: pgNullDateStr(lastPerformedAt),
		NextDueAt:       pgDateStr(nextDueAt),
		CreatedAt:       createdAt.Time,
		UpdatedAt:       updatedAt.Time,
	}
}

// ListSchedules returns the maintenance schedules for the active home.
func (h *Handler) ListSchedules(ctx context.Context, _ *struct{}) (*MaintenanceSchedulesOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	homeID := apimw.GetActiveHome(ctx)
	if homeID == "" {
		return nil, huma.NewError(http.StatusBadRequest, "X-Active-Home header required")
	}
	rows, err := h.q.ListMaintenanceSchedules(ctx, homeID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list schedules")
	}
	schedules := make([]MaintenanceScheduleRow, len(rows))
	for i, r := range rows {
		schedules[i] = scheduleRowFromSQL(r.ID, r.ItemID, r.ItemName, r.Title, r.Notes,
			r.FrequencyValue, r.FrequencyUnit, r.LastPerformedAt, r.NextDueAt, r.CreatedAt, r.UpdatedAt)
	}
	return &MaintenanceSchedulesOutput{Body: schedules}, nil
}

// CreateSchedule creates a maintenance schedule.
func (h *Handler) CreateSchedule(ctx context.Context, input *CreateScheduleInput) (*MaintenanceScheduleOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	homeID := apimw.GetActiveHome(ctx)
	if homeID == "" {
		return nil, huma.NewError(http.StatusBadRequest, "X-Active-Home header required")
	}
	r, err := h.q.CreateMaintenanceSchedule(ctx, store.CreateMaintenanceScheduleParams{
		HomeID:         homeID,
		ItemID:         input.Body.ItemID,
		Title:          input.Body.Title,
		Notes:          input.Body.Notes,
		FrequencyValue: int32(input.Body.FrequencyValue),
		FrequencyUnit:  input.Body.FrequencyUnit,
		Column7:        parseDatePtr(input.Body.NextDueAt),
		CreatedBy:      pgtype.Int8{Int64: claims.Sub, Valid: true},
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create schedule")
	}
	s := scheduleRowFromSQL(r.ID, r.ItemID, r.ItemName, r.Title, r.Notes,
		r.FrequencyValue, r.FrequencyUnit, r.LastPerformedAt, r.NextDueAt, r.CreatedAt, r.UpdatedAt)
	return &MaintenanceScheduleOutput{Body: s}, nil
}

// UpdateSchedule updates a maintenance schedule.
func (h *Handler) UpdateSchedule(ctx context.Context, input *UpdateScheduleInput) (*MaintenanceScheduleOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	nextDueAt := pgtype.Date{}
	if t := parseDatePtr(&input.Body.NextDueAt); t != nil {
		nextDueAt = pgtype.Date{Time: *t, Valid: true}
	}
	r, err := h.q.UpdateMaintenanceSchedule(ctx, store.UpdateMaintenanceScheduleParams{
		ID:             input.ID,
		ItemID:         input.Body.ItemID,
		Title:          input.Body.Title,
		Notes:          input.Body.Notes,
		FrequencyValue: int32(input.Body.FrequencyValue),
		FrequencyUnit:  input.Body.FrequencyUnit,
		NextDueAt:      nextDueAt,
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update schedule")
	}
	s := scheduleRowFromSQL(r.ID, r.ItemID, r.ItemName, r.Title, r.Notes,
		r.FrequencyValue, r.FrequencyUnit, r.LastPerformedAt, r.NextDueAt, r.CreatedAt, r.UpdatedAt)
	return &MaintenanceScheduleOutput{Body: s}, nil
}

// DeleteSchedule deletes a maintenance schedule.
func (h *Handler) DeleteSchedule(ctx context.Context, input *ScheduleIDInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if err := h.q.DeleteMaintenanceSchedule(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete schedule")
	}
	return nil, nil
}
