package handler

import (
	"context"

	"github.com/domitara/domitara/apps/api/internal/version"
)

// VersionOutput reports the running server version.
type VersionOutput struct {
	Body struct {
		Version string `json:"version"`
	}
}

// Version reports the running server version.
func (h *Handler) Version(_ context.Context, _ *struct{}) (*VersionOutput, error) {
	out := &VersionOutput{}
	out.Body.Version = version.Version
	return out, nil
}
