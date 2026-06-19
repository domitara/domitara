package handler

import "context"

// HealthOutput is the response body for the health check endpoint.
type HealthOutput struct {
	Body struct {
		Status string `json:"status"`
	}
}

// Health reports service liveness.
func (h *Handler) Health(_ context.Context, _ *struct{}) (*HealthOutput, error) {
	out := &HealthOutput{}
	out.Body.Status = "ok"
	return out, nil
}
