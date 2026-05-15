package handler

import "context"

type HealthOutput struct {
	Body struct {
		Status string `json:"status"`
	}
}

func (h *Handler) Health(_ context.Context, _ *struct{}) (*HealthOutput, error) {
	out := &HealthOutput{}
	out.Body.Status = "ok"
	return out, nil
}
