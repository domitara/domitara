package handler

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/go-chi/chi/v5"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

// PhotoRow is the API representation of an item photo.
type PhotoRow struct {
	ID          string    `json:"id"`
	ItemID      string    `json:"item_id"`
	Filename    string    `json:"filename"`
	ContentType string    `json:"content_type"`
	URL         string    `json:"url"`
	CreatedAt   time.Time `json:"created_at"`
}

// PhotosOutput is the response body listing item photos.
type PhotosOutput struct{ Body []PhotoRow }

// PhotoItemIDInput carries an item ID path parameter for photo endpoints.
type PhotoItemIDInput struct {
	ItemID string `path:"itemId"`
}

// DeletePhotoInput identifies a photo to delete by item and photo ID.
type DeletePhotoInput struct {
	ItemID  string `path:"itemId"`
	PhotoID string `path:"photoId"`
}

var allowedPhotoMIMEs = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// ListItemPhotos returns all photos attached to an item.
func (h *Handler) ListItemPhotos(ctx context.Context, input *PhotoItemIDInput) (*PhotosOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	rows, err := h.q.ListItemPhotos(ctx, input.ItemID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list photos")
	}
	photos := make([]PhotoRow, len(rows))
	for i, p := range rows {
		photos[i] = PhotoRow{
			ID: p.ID, ItemID: p.ItemID, Filename: p.Filename, ContentType: p.ContentType,
			URL: "/uploads/" + p.FilePath, CreatedAt: p.CreatedAt.Time,
		}
	}
	return &PhotosOutput{Body: photos}, nil
}

// DeletePhoto removes a photo record and its file from disk.
func (h *Handler) DeletePhoto(ctx context.Context, input *DeletePhotoInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	filePath, err := h.q.GetItemPhotoFilePath(ctx, store.GetItemPhotoFilePathParams{
		ID: input.PhotoID, ItemID: input.ItemID,
	})
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "photo not found")
	}
	if err := h.q.DeleteItemPhoto(ctx, input.PhotoID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete photo")
	}
	_ = os.Remove(filepath.Join(h.uploadDir, filePath))
	return nil, nil
}

// UploadPhoto handles multipart photo uploads. Registered as a raw chi handler
// because HUMA does not natively support multipart/form-data.
func (h *Handler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	if _, ok := apimw.GetClaims(r.Context()); !ok {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	itemID := chi.URLParam(r, "itemId")

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeJSONError(w, http.StatusBadRequest, "request too large or not multipart")
		return
	}
	file, header, err := r.FormFile("photo")
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "photo field required")
		return
	}
	defer func() { _ = file.Close() }()

	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	ct := http.DetectContentType(buf[:n])
	if _, err := file.(io.Seeker).Seek(0, io.SeekStart); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to read file")
		return
	}
	ext, ok := allowedPhotoMIMEs[ct]
	if !ok {
		writeJSONError(w, http.StatusBadRequest, "unsupported file type; use JPEG, PNG or WEBP")
		return
	}

	itemDir := filepath.Join(h.uploadDir, itemID)
	if err := os.MkdirAll(itemDir, 0o755); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create upload directory")
		return
	}

	base := sanitizeFilename(strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename)))
	rec, err := h.q.CreateItemPhoto(r.Context(), store.CreateItemPhotoParams{
		ItemID: itemID, Filename: base + ext, ContentType: ct,
	})
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create photo record")
		return
	}

	relPath := itemID + "/" + rec.ID + ext
	absPath := filepath.Join(h.uploadDir, relPath)

	dst, err := os.Create(absPath)
	if err != nil {
		_ = h.q.DeleteItemPhoto(r.Context(), rec.ID)
		writeJSONError(w, http.StatusInternalServerError, "failed to save file")
		return
	}
	defer func() { _ = dst.Close() }()
	if _, err := io.Copy(dst, file); err != nil {
		_ = h.q.DeleteItemPhoto(r.Context(), rec.ID)
		_ = os.Remove(absPath)
		writeJSONError(w, http.StatusInternalServerError, "failed to write file")
		return
	}

	if err := h.q.UpdateItemPhotoPath(r.Context(), store.UpdateItemPhotoPathParams{
		FilePath: relPath, ID: rec.ID,
	}); err != nil {
		_ = h.q.DeleteItemPhoto(r.Context(), rec.ID)
		_ = os.Remove(absPath)
		writeJSONError(w, http.StatusInternalServerError, "failed to update photo record")
		return
	}

	row := PhotoRow{
		ID: rec.ID, ItemID: rec.ItemID, Filename: rec.Filename, ContentType: rec.ContentType,
		URL: "/uploads/" + relPath, CreatedAt: rec.CreatedAt.Time,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(row)
}

func writeJSONError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func sanitizeFilename(name string) string {
	if name == "" {
		return "photo"
	}
	var b strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteRune('_')
		}
	}
	s := b.String()
	if len(s) > 64 {
		s = s[:64]
	}
	return s
}
