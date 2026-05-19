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
	"github.com/jackc/pgx/v5/pgtype"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

// ---- response types ----

type HomeRow struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	AddressStreet  *string   `json:"address_street"`
	AddressCity    *string   `json:"address_city"`
	AddressState   *string   `json:"address_state"`
	AddressZip     *string   `json:"address_zip"`
	AddressCountry *string   `json:"address_country"`
	PropertyType   *string   `json:"property_type"`
	YearBuilt      *int      `json:"year_built"`
	Sqft           *float64  `json:"sqft"`
	Acreage        *float64  `json:"acreage"`
	Notes          *string   `json:"notes"`
	PurchasePrice  *float64  `json:"purchase_price"`
	PurchasedAt    *string   `json:"purchased_at"`
	EstimatedValue *float64  `json:"estimated_value"`
	MortgageLender *string   `json:"mortgage_lender"`
	MortgageNotes  *string   `json:"mortgage_notes"`
	HoaName        *string   `json:"hoa_name"`
	HoaContact     *string   `json:"hoa_contact"`
	HoaMonthlyDues *float64  `json:"hoa_monthly_dues"`
	Role           string    `json:"role"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type HomesOutput struct{ Body []HomeRow }
type HomeOutput struct{ Body HomeRow }

type HomeMemberRow struct {
	UserID    int64     `json:"user_id"`
	UserName  string    `json:"user_name"`
	UserEmail string    `json:"user_email"`
	Role      string    `json:"role"`
	JoinedAt  time.Time `json:"joined_at"`
}

type HomeMembersOutput struct{ Body []HomeMemberRow }

type HomePhotoRow struct {
	ID          string    `json:"id"`
	HomeID      string    `json:"home_id"`
	Filename    string    `json:"filename"`
	ContentType string    `json:"content_type"`
	URL         string    `json:"url"`
	CreatedAt   time.Time `json:"created_at"`
}

type HomePhotosOutput struct{ Body []HomePhotoRow }

type HomeDocRow struct {
	ID           string    `json:"id"`
	HomeID       string    `json:"home_id"`
	Filename     string    `json:"filename"`
	ContentType  string    `json:"content_type"`
	URL          string    `json:"url"`
	Size         int64     `json:"size"`
	DocumentType *string   `json:"document_type"`
	FloorLevel   *int      `json:"floor_level"`
	CreatedAt    time.Time `json:"created_at"`
}

type HomeDocsOutput struct{ Body []HomeDocRow }

// ---- input types ----

type HomeIDInput struct {
	ID string `path:"id"`
}

type HomeBody struct {
	Name           string   `json:"name" minLength:"1"`
	AddressStreet  *string  `json:"address_street,omitempty"`
	AddressCity    *string  `json:"address_city,omitempty"`
	AddressState   *string  `json:"address_state,omitempty"`
	AddressZip     *string  `json:"address_zip,omitempty"`
	AddressCountry *string  `json:"address_country,omitempty"`
	PropertyType   *string  `json:"property_type,omitempty"`
	YearBuilt      *int     `json:"year_built,omitempty"`
	Sqft           *float64 `json:"sqft,omitempty"`
	Acreage        *float64 `json:"acreage,omitempty"`
	Notes          *string  `json:"notes,omitempty"`
	PurchasePrice  *float64 `json:"purchase_price,omitempty"`
	PurchasedAt    *string  `json:"purchased_at,omitempty"`
	EstimatedValue *float64 `json:"estimated_value,omitempty"`
	MortgageLender *string  `json:"mortgage_lender,omitempty"`
	MortgageNotes  *string  `json:"mortgage_notes,omitempty"`
	HoaName        *string  `json:"hoa_name,omitempty"`
	HoaContact     *string  `json:"hoa_contact,omitempty"`
	HoaMonthlyDues *float64 `json:"hoa_monthly_dues,omitempty"`
}

type CreateHomeInput struct{ Body HomeBody }

type UpdateHomeInput struct {
	ID   string `path:"id"`
	Body HomeBody
}

type AddMemberInput struct {
	ID   string `path:"id"`
	Body struct {
		Email string `json:"email" format:"email"`
		Role  string `json:"role,omitempty" enum:"owner,member"`
	}
}

type RemoveMemberInput struct {
	ID     string `path:"id"`
	UserID int64  `path:"userId"`
}

type DeleteHomePhotoInput struct {
	ID      string `path:"id"`
	PhotoID string `path:"photoId"`
}

type DeleteHomeDocInput struct {
	ID    string `path:"id"`
	DocID string `path:"docId"`
}

type UpdateHomeDocFloorLevelInput struct {
	HomeID string `path:"homeId"`
	DocID  string `path:"docId"`
	Body   struct {
		FloorLevel *int `json:"floor_level"`
	}
}

// ---- mapping helpers ----

// homeParamsFromBody converts the HomeBody request fields to pgtype values for sqlc.
func homeParamsFromBody(b HomeBody) (
	yearBuilt pgtype.Int4,
	sqft pgtype.Numeric,
	acreage pgtype.Numeric,
	purchasePrice pgtype.Numeric,
	purchasedAt *time.Time,
	estimatedValue pgtype.Numeric,
	hoaMonthlyDues pgtype.Numeric,
) {
	yearBuilt = toNullInt4(b.YearBuilt)
	sqft = toNullNumeric(b.Sqft)
	acreage = toNullNumeric(b.Acreage)
	purchasePrice = toNullNumeric(b.PurchasePrice)
	purchasedAt = parseDatePtr(b.PurchasedAt)
	estimatedValue = toNullNumeric(b.EstimatedValue)
	hoaMonthlyDues = toNullNumeric(b.HoaMonthlyDues)
	return
}

// homeRowFromFields maps the flat SQL row fields (shared by ListHomesForUserRow and GetHomeForUserRow) to HomeRow.
func homeRowFromFields(
	id, name string,
	addrStreet, addrCity, addrState, addrZip, addrCountry *string,
	propType *string,
	yearBuilt pgtype.Int4,
	sqft pgtype.Numeric,
	acreage pgtype.Numeric,
	notes *string,
	purchasePrice pgtype.Numeric,
	purchasedAt *time.Time,
	estimatedValue pgtype.Numeric,
	mortgageLender, mortgageNotes *string,
	hoaName, hoaContact *string,
	hoaMonthlyDues pgtype.Numeric,
	role string,
	createdAt, updatedAt pgtype.Timestamptz,
) HomeRow {
	return HomeRow{
		ID:             id,
		Name:           name,
		AddressStreet:  addrStreet,
		AddressCity:    addrCity,
		AddressState:   addrState,
		AddressZip:     addrZip,
		AddressCountry: addrCountry,
		PropertyType:   propType,
		YearBuilt:      fromNullInt4(yearBuilt),
		Sqft:           fromNullNumeric(sqft),
		Acreage:        fromNullNumeric(acreage),
		Notes:          notes,
		PurchasePrice:  fromNullNumeric(purchasePrice),
		PurchasedAt:    pgNullDateStr(purchasedAt),
		EstimatedValue: fromNullNumeric(estimatedValue),
		MortgageLender: mortgageLender,
		MortgageNotes:  mortgageNotes,
		HoaName:        hoaName,
		HoaContact:     hoaContact,
		HoaMonthlyDues: fromNullNumeric(hoaMonthlyDues),
		Role:           role,
		CreatedAt:      createdAt.Time,
		UpdatedAt:      updatedAt.Time,
	}
}

func homeRowFromList(r store.ListHomesForUserRow) HomeRow {
	return homeRowFromFields(
		r.ID, r.Name,
		r.AddressStreet, r.AddressCity, r.AddressState, r.AddressZip, r.AddressCountry,
		r.PropertyType, r.YearBuilt, r.Sqft, r.Acreage, r.Notes,
		r.PurchasePrice, r.PurchasedAt, r.EstimatedValue,
		r.MortgageLender, r.MortgageNotes,
		r.HoaName, r.HoaContact, r.HoaMonthlyDues,
		r.Role, r.CreatedAt, r.UpdatedAt,
	)
}

func homeRowFromGet(r store.GetHomeForUserRow) HomeRow {
	return homeRowFromFields(
		r.ID, r.Name,
		r.AddressStreet, r.AddressCity, r.AddressState, r.AddressZip, r.AddressCountry,
		r.PropertyType, r.YearBuilt, r.Sqft, r.Acreage, r.Notes,
		r.PurchasePrice, r.PurchasedAt, r.EstimatedValue,
		r.MortgageLender, r.MortgageNotes,
		r.HoaName, r.HoaContact, r.HoaMonthlyDues,
		r.Role, r.CreatedAt, r.UpdatedAt,
	)
}

// requireHomeMember checks the user is a member and returns their role.
func (h *Handler) requireHomeMember(ctx context.Context, homeID string, userID int64) (string, error) {
	role, err := h.q.GetHomeMemberRole(ctx, store.GetHomeMemberRoleParams{HomeID: homeID, UserID: userID})
	if err != nil {
		return "", huma.NewError(http.StatusForbidden, "not a member of this home")
	}
	return role, nil
}

// ---- CRUD handlers ----

func (h *Handler) ListHomes(ctx context.Context, _ *struct{}) (*HomesOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := h.q.ListHomesForUser(ctx, claims.Sub)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list homes")
	}
	homes := make([]HomeRow, len(rows))
	for i, r := range rows {
		homes[i] = homeRowFromList(r)
	}
	return &HomesOutput{Body: homes}, nil
}

func (h *Handler) GetHome(ctx context.Context, input *HomeIDInput) (*HomeOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	r, err := h.q.GetHomeForUser(ctx, store.GetHomeForUserParams{UserID: claims.Sub, ID: input.ID})
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "home not found")
	}
	return &HomeOutput{Body: homeRowFromGet(r)}, nil
}

func (h *Handler) CreateHome(ctx context.Context, input *CreateHomeInput) (*HomeOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	b := input.Body
	yearBuilt, sqft, acreage, purchasePrice, purchasedAt, estimatedValue, hoaMonthlyDues := homeParamsFromBody(b)

	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "transaction failed")
	}
	defer tx.Rollback(ctx)
	qtx := h.q.WithTx(tx)

	homeID, err := qtx.CreateHome(ctx, store.CreateHomeParams{
		Name:           b.Name,
		AddressStreet:  b.AddressStreet,
		AddressCity:    b.AddressCity,
		AddressState:   b.AddressState,
		AddressZip:     b.AddressZip,
		AddressCountry: b.AddressCountry,
		PropertyType:   b.PropertyType,
		YearBuilt:      yearBuilt,
		Sqft:           sqft,
		Acreage:        acreage,
		Notes:          b.Notes,
		PurchasePrice:  purchasePrice,
		PurchasedAt:    purchasedAt,
		EstimatedValue: estimatedValue,
		MortgageLender: b.MortgageLender,
		MortgageNotes:  b.MortgageNotes,
		HoaName:        b.HoaName,
		HoaContact:     b.HoaContact,
		HoaMonthlyDues: hoaMonthlyDues,
	})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create home")
	}

	if err := qtx.UpsertHomeMember(ctx, store.UpsertHomeMemberParams{
		HomeID: homeID, UserID: claims.Sub, Role: "owner",
	}); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to add owner")
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to commit")
	}

	r, err := h.q.GetHomeForUser(ctx, store.GetHomeForUserParams{UserID: claims.Sub, ID: homeID})
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch created home")
	}
	return &HomeOutput{Body: homeRowFromGet(r)}, nil
}

func (h *Handler) UpdateHome(ctx context.Context, input *UpdateHomeInput) (*HomeOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, input.ID, claims.Sub); err != nil {
		return nil, err
	}
	b := input.Body
	yearBuilt, sqft, acreage, purchasePrice, purchasedAt, estimatedValue, hoaMonthlyDues := homeParamsFromBody(b)

	if err := h.q.UpdateHome(ctx, store.UpdateHomeParams{
		ID:             input.ID,
		Name:           b.Name,
		AddressStreet:  b.AddressStreet,
		AddressCity:    b.AddressCity,
		AddressState:   b.AddressState,
		AddressZip:     b.AddressZip,
		AddressCountry: b.AddressCountry,
		PropertyType:   b.PropertyType,
		YearBuilt:      yearBuilt,
		Sqft:           sqft,
		Acreage:        acreage,
		Notes:          b.Notes,
		PurchasePrice:  purchasePrice,
		PurchasedAt:    purchasedAt,
		EstimatedValue: estimatedValue,
		MortgageLender: b.MortgageLender,
		MortgageNotes:  b.MortgageNotes,
		HoaName:        b.HoaName,
		HoaContact:     b.HoaContact,
		HoaMonthlyDues: hoaMonthlyDues,
	}); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update home")
	}
	r, err := h.q.GetHomeForUser(ctx, store.GetHomeForUserParams{UserID: claims.Sub, ID: input.ID})
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "home not found")
	}
	return &HomeOutput{Body: homeRowFromGet(r)}, nil
}

func (h *Handler) DeleteHome(ctx context.Context, input *HomeIDInput) (*struct{}, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	role, err := h.requireHomeMember(ctx, input.ID, claims.Sub)
	if err != nil {
		return nil, err
	}
	if role != "owner" {
		return nil, huma.NewError(http.StatusForbidden, "only the owner can delete a home")
	}
	if err := h.q.DeleteHome(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete home")
	}
	return nil, nil
}

// ---- Member management ----

func (h *Handler) ListHomeMembers(ctx context.Context, input *HomeIDInput) (*HomeMembersOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, input.ID, claims.Sub); err != nil {
		return nil, err
	}
	rows, err := h.q.ListHomeMembers(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list members")
	}
	members := make([]HomeMemberRow, len(rows))
	for i, m := range rows {
		members[i] = HomeMemberRow{
			UserID: m.ID, UserName: m.Name, UserEmail: m.Email,
			Role: m.Role, JoinedAt: m.CreatedAt.Time,
		}
	}
	return &HomeMembersOutput{Body: members}, nil
}

func (h *Handler) AddHomeMember(ctx context.Context, input *AddMemberInput) (*HomeMembersOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	role, err := h.requireHomeMember(ctx, input.ID, claims.Sub)
	if err != nil {
		return nil, err
	}
	if role != "owner" {
		return nil, huma.NewError(http.StatusForbidden, "only the owner can add members")
	}
	memberRole := input.Body.Role
	if memberRole == "" {
		memberRole = "member"
	}
	targetID, err := h.q.GetUserIDByEmail(ctx, input.Body.Email)
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "user not found")
	}
	if err := h.q.UpsertHomeMember(ctx, store.UpsertHomeMemberParams{
		HomeID: input.ID, UserID: targetID, Role: memberRole,
	}); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to add member")
	}
	return h.ListHomeMembers(ctx, &HomeIDInput{ID: input.ID})
}

func (h *Handler) RemoveHomeMember(ctx context.Context, input *RemoveMemberInput) (*struct{}, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	role, err := h.requireHomeMember(ctx, input.ID, claims.Sub)
	if err != nil {
		return nil, err
	}
	if role != "owner" {
		return nil, huma.NewError(http.StatusForbidden, "only the owner can remove members")
	}
	if input.UserID == claims.Sub {
		ownerCount, _ := h.q.CountHomeOwners(ctx, input.ID)
		if ownerCount <= 1 {
			return nil, huma.NewError(http.StatusBadRequest, "cannot remove the sole owner; transfer ownership first")
		}
	}
	if err := h.q.DeleteHomeMember(ctx, store.DeleteHomeMemberParams{
		HomeID: input.ID, UserID: input.UserID,
	}); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to remove member")
	}
	return nil, nil
}

// ---- Home photos ----

func (h *Handler) ListHomePhotos(ctx context.Context, input *HomeIDInput) (*HomePhotosOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, input.ID, claims.Sub); err != nil {
		return nil, err
	}
	rows, err := h.q.ListHomePhotos(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list photos")
	}
	photos := make([]HomePhotoRow, len(rows))
	for i, p := range rows {
		photos[i] = HomePhotoRow{
			ID: p.ID, HomeID: p.HomeID, Filename: p.Filename, ContentType: p.ContentType,
			URL: "/uploads/" + p.FilePath, CreatedAt: p.CreatedAt.Time,
		}
	}
	return &HomePhotosOutput{Body: photos}, nil
}

func (h *Handler) DeleteHomePhoto(ctx context.Context, input *DeleteHomePhotoInput) (*struct{}, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, input.ID, claims.Sub); err != nil {
		return nil, err
	}
	filePath, err := h.q.GetHomePhotoFilePath(ctx, store.GetHomePhotoFilePathParams{
		ID: input.PhotoID, HomeID: input.ID,
	})
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "photo not found")
	}
	if err := h.q.DeleteHomePhoto(ctx, input.PhotoID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete photo")
	}
	_ = os.Remove(filepath.Join(h.uploadDir, filePath))
	return nil, nil
}

func (h *Handler) UploadHomePhoto(w http.ResponseWriter, r *http.Request) {
	claims, ok := apimw.GetClaims(r.Context())
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	homeID := chi.URLParam(r, "id")

	if _, err := h.q.GetHomeMemberRole(r.Context(), store.GetHomeMemberRoleParams{
		HomeID: homeID, UserID: claims.Sub,
	}); err != nil {
		writeJSONError(w, http.StatusForbidden, "not a member of this home")
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeJSONError(w, http.StatusBadRequest, "request too large or not multipart")
		return
	}
	file, header, err := r.FormFile("photo")
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "photo field required")
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
	ext, ok := allowedPhotoMIMEs[ct]
	if !ok {
		writeJSONError(w, http.StatusBadRequest, "unsupported file type; use JPEG, PNG or WEBP")
		return
	}

	homeDir := filepath.Join(h.uploadDir, "homes", homeID)
	if err := os.MkdirAll(homeDir, 0o755); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create upload directory")
		return
	}

	base := sanitizeFilename(strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename)))
	rec, err := h.q.CreateHomePhoto(r.Context(), store.CreateHomePhotoParams{
		HomeID: homeID, Filename: base + ext, ContentType: ct,
	})
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create photo record")
		return
	}

	relPath := "homes/" + homeID + "/" + rec.ID + ext
	absPath := filepath.Join(h.uploadDir, relPath)

	dst, err := os.Create(absPath)
	if err != nil {
		_ = h.q.DeleteHomePhoto(r.Context(), rec.ID)
		writeJSONError(w, http.StatusInternalServerError, "failed to save file")
		return
	}
	defer dst.Close()
	if _, err := io.Copy(dst, file); err != nil {
		_ = h.q.DeleteHomePhoto(r.Context(), rec.ID)
		_ = os.Remove(absPath)
		writeJSONError(w, http.StatusInternalServerError, "failed to write file")
		return
	}

	if err := h.q.UpdateHomePhotoPath(r.Context(), store.UpdateHomePhotoPathParams{
		FilePath: relPath, ID: rec.ID,
	}); err != nil {
		_ = h.q.DeleteHomePhoto(r.Context(), rec.ID)
		_ = os.Remove(absPath)
		writeJSONError(w, http.StatusInternalServerError, "failed to update photo record")
		return
	}

	row := HomePhotoRow{
		ID: rec.ID, HomeID: rec.HomeID, Filename: rec.Filename, ContentType: rec.ContentType,
		URL: "/uploads/" + relPath, CreatedAt: rec.CreatedAt.Time,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(row)
}

// ---- Home documents ----

func (h *Handler) ListHomeDocuments(ctx context.Context, input *HomeIDInput) (*HomeDocsOutput, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, input.ID, claims.Sub); err != nil {
		return nil, err
	}
	rows, err := h.q.ListHomeDocuments(ctx, input.ID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list documents")
	}
	docs := make([]HomeDocRow, len(rows))
	for i, d := range rows {
		docs[i] = HomeDocRow{
			ID: d.ID, HomeID: d.HomeID, Filename: d.Filename, ContentType: d.ContentType,
			URL: "/uploads/" + d.FilePath, Size: d.Size, DocumentType: d.DocumentType,
			FloorLevel: fromNullInt4(d.FloorLevel),
			CreatedAt:  d.CreatedAt.Time,
		}
	}
	return &HomeDocsOutput{Body: docs}, nil
}

func (h *Handler) DeleteHomeDocument(ctx context.Context, input *DeleteHomeDocInput) (*struct{}, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, input.ID, claims.Sub); err != nil {
		return nil, err
	}
	filePath, err := h.q.GetHomeDocumentFilePath(ctx, store.GetHomeDocumentFilePathParams{
		ID: input.DocID, HomeID: input.ID,
	})
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "document not found")
	}
	if err := h.q.DeleteHomeDocument(ctx, input.DocID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete document")
	}
	_ = os.Remove(filepath.Join(h.uploadDir, filePath))
	return nil, nil
}

func (h *Handler) UpdateHomeDocumentFloorLevel(ctx context.Context, input *UpdateHomeDocFloorLevelInput) (*struct{}, error) {
	claims, err := apimw.RequireAuth(ctx)
	if err != nil {
		return nil, err
	}
	if _, err := h.requireHomeMember(ctx, input.HomeID, claims.Sub); err != nil {
		return nil, err
	}
	if input.Body.FloorLevel != nil && (*input.Body.FloorLevel < 0 || *input.Body.FloorLevel > 9) {
		return nil, huma.NewError(http.StatusUnprocessableEntity, "floor_level must be 0–9 or null")
	}
	if err := h.q.UpdateHomeDocumentFloorLevel(ctx, store.UpdateHomeDocumentFloorLevelParams{
		FloorLevel: toNullInt4(input.Body.FloorLevel),
		ID:         input.DocID,
		HomeID:     input.HomeID,
	}); err != nil {
		return nil, huma.NewError(http.StatusNotFound, "document not found")
	}
	return nil, nil
}

func (h *Handler) UploadHomeDocument(w http.ResponseWriter, r *http.Request) {
	claims, ok := apimw.GetClaims(r.Context())
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	homeID := chi.URLParam(r, "id")

	if _, err := h.q.GetHomeMemberRole(r.Context(), store.GetHomeMemberRoleParams{
		HomeID: homeID, UserID: claims.Sub,
	}); err != nil {
		writeJSONError(w, http.StatusForbidden, "not a member of this home")
		return
	}

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
	if ext := strings.ToLower(filepath.Ext(header.Filename)); ext == ".pdf" {
		ct = "application/pdf"
	}
	ext, ok := allowedDocMIMEs[ct]
	if !ok {
		writeJSONError(w, http.StatusBadRequest, "unsupported file type; use PDF, JPEG, PNG or WEBP")
		return
	}

	docType := r.FormValue("document_type")

	homeDir := filepath.Join(h.uploadDir, "homes", homeID)
	if err := os.MkdirAll(homeDir, 0o755); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create upload directory")
		return
	}

	base := sanitizeFilename(strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename)))
	var docTypePtr *string
	if docType != "" {
		docTypePtr = &docType
	}
	rec, err := h.q.CreateHomeDocument(r.Context(), store.CreateHomeDocumentParams{
		HomeID: homeID, Filename: base + ext, ContentType: ct, DocumentType: docTypePtr,
	})
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create document record")
		return
	}

	relPath := "homes/" + homeID + "/doc_" + rec.ID + ext
	absPath := filepath.Join(h.uploadDir, relPath)

	dst, err := os.Create(absPath)
	if err != nil {
		_ = h.q.DeleteHomeDocument(r.Context(), rec.ID)
		writeJSONError(w, http.StatusInternalServerError, "failed to save file")
		return
	}
	defer dst.Close()

	written, err := io.Copy(dst, file)
	if err != nil {
		_ = h.q.DeleteHomeDocument(r.Context(), rec.ID)
		_ = os.Remove(absPath)
		writeJSONError(w, http.StatusInternalServerError, "failed to write file")
		return
	}

	if err := h.q.UpdateHomeDocumentPath(r.Context(), store.UpdateHomeDocumentPathParams{
		FilePath: relPath, Size: written, ID: rec.ID,
	}); err != nil {
		_ = h.q.DeleteHomeDocument(r.Context(), rec.ID)
		_ = os.Remove(absPath)
		writeJSONError(w, http.StatusInternalServerError, "failed to update document record")
		return
	}

	row := HomeDocRow{
		ID: rec.ID, HomeID: rec.HomeID, Filename: rec.Filename, ContentType: rec.ContentType,
		URL: "/uploads/" + relPath, Size: written, DocumentType: rec.DocumentType,
		CreatedAt: rec.CreatedAt.Time,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(row)
}
