package handler

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	"github.com/domitara/domitara/apps/api/internal/scheduler"
)

// ScheduledTasks is the slice of the scheduler the admin API needs.
type ScheduledTasks interface {
	Tasks() []scheduler.TaskStatus
	RunNow(name string) error
}

// ScheduledTaskRow is the API representation of a scheduled task.
type ScheduledTaskRow struct {
	Name           string     `json:"name"`
	Description    string     `json:"description"`
	Interval       string     `json:"interval"`
	Schedule       string     `json:"schedule"`
	Running        bool       `json:"running"`
	LastRunAt      *time.Time `json:"last_run_at,omitempty"`
	LastDurationMs *int64     `json:"last_duration_ms,omitempty"`
	LastStatus     string     `json:"last_status,omitempty"`
	LastError      string     `json:"last_error,omitempty"`
	NextRunAt      *time.Time `json:"next_run_at,omitempty"`
}

// ScheduledTasksOutput is the response body listing scheduled tasks.
type ScheduledTasksOutput struct{ Body []ScheduledTaskRow }

// RunScheduledTaskInput carries the task name path parameter.
type RunScheduledTaskInput struct {
	Name string `path:"name"`
}

// AdminListScheduledTasks returns every scheduled task with its last/next run info.
func (h *Handler) AdminListScheduledTasks(ctx context.Context, _ *struct{}) (*ScheduledTasksOutput, error) {
	if _, err := apimw.RequireAdmin(ctx); err != nil {
		return nil, err
	}
	statuses := h.tasks.Tasks()
	rows := make([]ScheduledTaskRow, len(statuses))
	for i, s := range statuses {
		rows[i] = ScheduledTaskRow{
			Name: s.Name, Description: s.Description, Interval: s.Interval, Schedule: s.Schedule,
			Running: s.Running, LastRunAt: s.LastRunAt, LastDurationMs: s.LastDurationMs,
			LastStatus: s.LastStatus, LastError: s.LastError, NextRunAt: s.NextRunAt,
		}
	}
	return &ScheduledTasksOutput{Body: rows}, nil
}

// AdminRunScheduledTask starts a task in the background (204 means started). The caller polls the list for progress.
func (h *Handler) AdminRunScheduledTask(ctx context.Context, input *RunScheduledTaskInput) (*struct{}, error) {
	if _, err := apimw.RequireAdmin(ctx); err != nil {
		return nil, err
	}
	switch err := h.tasks.RunNow(input.Name); {
	case errors.Is(err, scheduler.ErrUnknownTask):
		return nil, huma.NewError(http.StatusNotFound, "scheduled task not found")
	case errors.Is(err, scheduler.ErrAlreadyRunning):
		return nil, huma.NewError(http.StatusConflict, "task is already running")
	case err != nil:
		return nil, huma.NewError(http.StatusInternalServerError, "failed to start task")
	}
	return nil, nil
}
