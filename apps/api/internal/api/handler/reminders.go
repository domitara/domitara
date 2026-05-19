package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

type ReminderRow struct {
	ID           string     `json:"id"`
	Key          string     `json:"key"`
	Title        string     `json:"title"`
	Body         string     `json:"body"`
	Tone         string     `json:"tone"`
	SnoozedUntil *time.Time `json:"snoozed_until,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

type RemindersOutput struct{ Body []ReminderRow }

type ReminderIDInput struct {
	ID string `path:"id"`
}

type SnoozeReminderInput struct {
	ID   string `path:"id"`
	Body struct {
		Days int `json:"days" minimum:"1" maximum:"90"`
	}
}

func (h *Handler) ListReminders(ctx context.Context, _ *struct{}) (*RemindersOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := h.q.ListReminders(ctx, claims.Sub)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list reminders")
	}
	result := make([]ReminderRow, len(rows))
	for i, r := range rows {
		result[i] = ReminderRow{
			ID: r.ID, Key: r.Key, Title: r.Title, Body: r.Body, Tone: r.Tone,
			SnoozedUntil: r.SnoozedUntil, CreatedAt: r.CreatedAt.Time,
		}
	}
	return &RemindersOutput{Body: result}, nil
}

func (h *Handler) DismissReminder(ctx context.Context, input *ReminderIDInput) (*struct{}, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	n, err := h.q.DismissReminder(ctx, store.DismissReminderParams{ID: input.ID, UserID: claims.Sub})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to dismiss reminder")
	}
	if n == 0 {
		return nil, huma.NewError(http.StatusNotFound, "reminder not found")
	}
	return nil, nil
}

func (h *Handler) SnoozeReminder(ctx context.Context, input *SnoozeReminderInput) (*struct{}, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	until := time.Now().AddDate(0, 0, input.Body.Days)
	n, err := h.q.SnoozeReminder(ctx, store.SnoozeReminderParams{
		ID: input.ID, UserID: claims.Sub, SnoozedUntil: &until,
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to snooze reminder")
	}
	if n == 0 {
		return nil, huma.NewError(http.StatusNotFound, "reminder not found")
	}
	return nil, nil
}
