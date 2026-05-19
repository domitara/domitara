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

type DocumentRow struct {
	ID          string    `json:"id"`
	ItemID      string    `json:"item_id"`
	Filename    string    `json:"filename"`
	ContentType string    `json:"content_type"`
	URL         string    `json:"url"`
	Size        int64     `json:"size"`
	CreatedAt   time.Time `json:"created_at"`
}

type DocumentsOutput struct{ Body []DocumentRow }

type DocItemIDInput struct {
	ItemID string `path:"itemId"`
}

type DeleteDocumentInput struct {
	ItemID     string `path:"itemId"`
	DocumentID string `path:"documentId"`
}

var allowedDocMIMEs = map[string]string{
	"application/pdf": ".pdf",
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
	"image/webp":      ".webp",
}

func (h *Handler) ListItemDocuments(ctx context.Context, input *DocItemIDInput) (*DocumentsOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	rows, err := h.q.ListItemDocuments(ctx, input.ItemID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list documents")
	}
	docs := make([]DocumentRow, len(rows))
	for i, d := range rows {
		docs[i] = DocumentRow{
			ID: d.ID, ItemID: d.ItemID, Filename: d.Filename, ContentType: d.ContentType,
			URL: "/uploads/" + d.FilePath, Size: d.Size, CreatedAt: d.CreatedAt.Time,
		}
	}
	return &DocumentsOutput{Body: docs}, nil
}

func (h *Handler) DeleteDocument(ctx context.Context, input *DeleteDocumentInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	filePath, err := h.q.GetItemDocumentFilePath(ctx, store.GetItemDocumentFilePathParams{
		ID: input.DocumentID, ItemID: input.ItemID,
	})
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "document not found")
	}
	if err := h.q.DeleteItemDocument(ctx, input.DocumentID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete document")
	}
	_ = os.Remove(filepath.Join(h.uploadDir, filePath))
	return nil, nil
}

// UploadDocument handles multipart document uploads as a raw chi handler.
func (h *Handler) UploadDocument(w http.ResponseWriter, r *http.Request) {
	if _, ok := apimw.GetClaims(r.Context()); !ok {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	itemID := chi.URLParam(r, "itemId")

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeJSONError(w, http.StatusBadRequest, "request too large or not multipart")
		return
	}
	file, header, err := r.FormFile("document")
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "document field required")
		return
	}
	defer file.Close()

	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	ct := http.DetectContentType(buf[:n])
	if _, err := file.(io.Seeker).Seek(0, io.SeekStart); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to read file")
		return
	}

	// DetectContentType can't distinguish PDF from other binary; check by extension too.
	if ext := strings.ToLower(filepath.Ext(header.Filename)); ext == ".pdf" {
		ct = "application/pdf"
	}

	ext, ok := allowedDocMIMEs[ct]
	if !ok {
		writeJSONError(w, http.StatusBadRequest, "unsupported file type; use PDF, JPEG, PNG or WEBP")
		return
	}

	itemDir := filepath.Join(h.uploadDir, itemID)
	if err := os.MkdirAll(itemDir, 0o755); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create upload directory")
		return
	}

	base := sanitizeFilename(strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename)))
	rec, err := h.q.CreateItemDocument(r.Context(), store.CreateItemDocumentParams{
		ItemID: itemID, Filename: base + ext, ContentType: ct,
	})
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create document record")
		return
	}

	relPath := itemID + "/doc_" + rec.ID + ext
	absPath := filepath.Join(h.uploadDir, relPath)

	dst, err := os.Create(absPath)
	if err != nil {
		_ = h.q.DeleteItemDocument(r.Context(), rec.ID)
		writeJSONError(w, http.StatusInternalServerError, "failed to save file")
		return
	}
	defer dst.Close()

	written, err := io.Copy(dst, file)
	if err != nil {
		_ = h.q.DeleteItemDocument(r.Context(), rec.ID)
		_ = os.Remove(absPath)
		writeJSONError(w, http.StatusInternalServerError, "failed to write file")
		return
	}

	if err := h.q.UpdateItemDocumentPath(r.Context(), store.UpdateItemDocumentPathParams{
		FilePath: relPath, Size: written, ID: rec.ID,
	}); err != nil {
		_ = h.q.DeleteItemDocument(r.Context(), rec.ID)
		_ = os.Remove(absPath)
		writeJSONError(w, http.StatusInternalServerError, "failed to update document record")
		return
	}

	row := DocumentRow{
		ID: rec.ID, ItemID: rec.ItemID, Filename: rec.Filename, ContentType: rec.ContentType,
		URL: "/uploads/" + relPath, Size: written, CreatedAt: rec.CreatedAt.Time,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(row)
}
