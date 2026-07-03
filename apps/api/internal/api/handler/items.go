package handler

import (
	"context"
	crand "crypto/rand"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
	store "github.com/domitara/domitara/apps/api/internal/db/sqlc"
)

// ItemRow is the API representation of an inventory item.
type ItemRow struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Description   *string   `json:"description"`
	LocationID    *string   `json:"location_id"`
	Status        string    `json:"status"`
	Manufacturer  *string   `json:"manufacturer"`
	Model         *string   `json:"model"`
	Serial        *string   `json:"serial"`
	PurchasePrice *float64  `json:"purchase_price"`
	PurchasedAt   *string   `json:"purchased_at"`
	Warranty      *string   `json:"warranty"`
	Insured       bool      `json:"insured"`
	Notes         *string   `json:"notes"`
	AssetID       *string   `json:"asset_id"`
	LabelIDs      []string  `json:"label_ids"`
	Tier          string    `json:"tier"`
	GridRow       *int      `json:"grid_row"`
	GridCol       *int      `json:"grid_col"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// ItemsOutput is the response body listing items.
type ItemsOutput struct{ Body []ItemRow }

// ItemOutput is the response body for a single item.
type ItemOutput struct{ Body ItemRow }

// ListItemsInput holds the optional query filters for listing items.
type ListItemsInput struct {
	LocationID   string `query:"location_id"`
	LabelID      string `query:"label_id"`
	Q            string `query:"q" doc:"Search query — matches name, description, manufacturer, model, serial, notes, asset_id"`
	IncludeQuick bool   `query:"include_quick" doc:"Include quick-tier items (excluded by default)"`
}

// ItemIDInput carries an item ID path parameter.
type ItemIDInput struct {
	ID string `path:"id"`
}

// ItemBody is the shared request body for creating and updating items.
type ItemBody struct {
	Name          string   `json:"name" minLength:"1"`
	Description   *string  `json:"description,omitempty"`
	LocationID    *string  `json:"location_id,omitempty"`
	Status        string   `json:"status,omitempty"`
	Manufacturer  *string  `json:"manufacturer,omitempty"`
	Model         *string  `json:"model,omitempty"`
	Serial        *string  `json:"serial,omitempty"`
	PurchasePrice *float64 `json:"purchase_price,omitempty"`
	PurchasedAt   *string  `json:"purchased_at,omitempty"`
	Warranty      *string  `json:"warranty,omitempty"`
	Insured       bool     `json:"insured,omitempty"`
	Notes         *string  `json:"notes,omitempty"`
	AssetID       *string  `json:"asset_id,omitempty"`
	LabelIDs      []string `json:"label_ids,omitempty"`
	Tier          string   `json:"tier,omitempty" enum:"quick,full"`
	GridRow       *int     `json:"grid_row,omitempty"`
	GridCol       *int     `json:"grid_col,omitempty"`
}

// CreateItemInput is the request body for creating an item.
type CreateItemInput struct{ Body ItemBody }

// UpdateItemInput is the request body for updating an item.
type UpdateItemInput struct {
	ID   string `path:"id"`
	Body ItemBody
}

// sqlc not used here: COALESCE(array_agg(...) FILTER (...), '{}') generates interface{} in sqlc pgx/v5 mode
const itemSelectSQL = `
	SELECT i.id, i.name, i.description, i.location_id, i.status,
	       i.manufacturer, i.model, i.serial,
	       i.purchase_price, i.purchased_at::text, i.warranty,
	       i.insured, i.notes, i.asset_id,
	       COALESCE(array_agg(il.label_id::text ORDER BY il.label_id) FILTER (WHERE il.label_id IS NOT NULL), '{}'),
	       i.tier, i.grid_row, i.grid_col,
	       i.created_at, i.updated_at
	FROM items i
	LEFT JOIN item_labels il ON il.item_id = i.id`

func scanItem(row pgx.Row) (ItemRow, error) {
	var it ItemRow
	err := row.Scan(
		&it.ID, &it.Name, &it.Description, &it.LocationID, &it.Status,
		&it.Manufacturer, &it.Model, &it.Serial,
		&it.PurchasePrice, &it.PurchasedAt, &it.Warranty,
		&it.Insured, &it.Notes, &it.AssetID,
		&it.LabelIDs,
		&it.Tier, &it.GridRow, &it.GridCol,
		&it.CreatedAt, &it.UpdatedAt,
	)
	return it, err
}

// ListItems returns items for the active home, filtered by optional query params.
//
// sqlc not used here: dynamic WHERE clause built at runtime based on optional filters (home_id, q, location_id, label_id)
func (h *Handler) ListItems(ctx context.Context, input *ListItemsInput) (*ItemsOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	query := itemSelectSQL
	args := []any{}
	n := 1
	conditions := []string{}

	homeID := apimw.GetActiveHome(ctx)
	if homeID != "" {
		conditions = append(conditions, fmt.Sprintf(`i.home_id = $%d`, n))
		args = append(args, homeID)
		n++
	}

	if input.Q != "" {
		like := "%" + input.Q + "%"
		conditions = append(conditions, fmt.Sprintf(
			`(i.name ILIKE $%[1]d OR i.description ILIKE $%[1]d OR i.manufacturer ILIKE $%[1]d`+
				` OR i.model ILIKE $%[1]d OR i.serial ILIKE $%[1]d OR i.notes ILIKE $%[1]d OR i.asset_id ILIKE $%[1]d)`,
			n,
		))
		args = append(args, like)
		n++
	}
	if input.LocationID != "" {
		conditions = append(conditions, fmt.Sprintf(`i.location_id = $%d`, n))
		args = append(args, input.LocationID)
		n++
	} else if input.LabelID != "" {
		conditions = append(conditions, fmt.Sprintf(`i.id IN (SELECT item_id FROM item_labels WHERE label_id = $%d)`, n))
		args = append(args, input.LabelID)
		n++
	}
	if !input.IncludeQuick {
		conditions = append(conditions, `i.tier != 'quick'`)
	}
	if len(conditions) > 0 {
		query += ` WHERE ` + strings.Join(conditions, ` AND `)
	}
	_ = n
	query += ` GROUP BY i.id ORDER BY i.created_at DESC`

	rows, err := h.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to list items")
	}
	defer rows.Close()
	items := []ItemRow{}
	for rows.Next() {
		it, err := scanItem(rows)
		if err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to scan item")
		}
		items = append(items, it)
	}
	return &ItemsOutput{Body: items}, nil
}

// GetItem returns a single item by ID.
//
// sqlc not used here: COALESCE(array_agg(...) FILTER (...), '{}') generates interface{} in sqlc pgx/v5 mode
func (h *Handler) GetItem(ctx context.Context, input *ItemIDInput) (*ItemOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	it, err := scanItem(h.pool.QueryRow(ctx, itemSelectSQL+` WHERE i.id = $1 GROUP BY i.id`, input.ID))
	if err != nil {
		return nil, huma.NewError(http.StatusNotFound, "item not found")
	}
	return &ItemOutput{Body: it}, nil
}

// CreateItem creates an item in the active home with optional labels.
func (h *Handler) CreateItem(ctx context.Context, input *CreateItemInput) (*ItemOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	homeID := apimw.GetActiveHome(ctx)
	if homeID == "" {
		return nil, huma.NewError(http.StatusBadRequest, "X-Active-Home header required")
	}
	b := input.Body
	if b.Status == "" {
		b.Status = "owned"
	}
	if b.AssetID == nil {
		id := generateAssetID()
		b.AssetID = &id
	}
	if err := h.validateGridPlacement(ctx, &b); err != nil {
		return nil, err
	}
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "transaction failed")
	}
	defer func() { _ = tx.Rollback(ctx) }()
	qtx := h.q.WithTx(tx)

	itemID, err := qtx.CreateItem(ctx, store.CreateItemParams{
		Name:          b.Name,
		Description:   b.Description,
		LocationID:    b.LocationID,
		Status:        b.Status,
		Manufacturer:  b.Manufacturer,
		Model:         b.Model,
		Serial:        b.Serial,
		PurchasePrice: toNullNumeric(b.PurchasePrice),
		PurchasedAt:   parseDatePtr(b.PurchasedAt),
		Warranty:      b.Warranty,
		Insured:       b.Insured,
		Notes:         b.Notes,
		AssetID:       b.AssetID,
		HomeID:        homeID,
		Tier:          b.Tier,
		GridRow:       toNullInt4(b.GridRow),
		GridCol:       toNullInt4(b.GridCol),
	})
	if err != nil {
		if isUniqueViolation(err, "items_asset_id_key") {
			return nil, huma.NewError(http.StatusConflict, "asset ID is already in use")
		}
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create item")
	}
	for _, lid := range b.LabelIDs {
		if err := qtx.InsertItemLabel(ctx, store.InsertItemLabelParams{
			ItemID: itemID, LabelID: lid,
		}); err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to assign label")
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to commit")
	}
	it, err := scanItem(h.pool.QueryRow(ctx, itemSelectSQL+` WHERE i.id = $1 GROUP BY i.id`, itemID))
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch created item")
	}
	return &ItemOutput{Body: it}, nil
}

// UpdateItem updates an item and its labels.
func (h *Handler) UpdateItem(ctx context.Context, input *UpdateItemInput) (*ItemOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	b := input.Body
	if err := h.validateGridPlacement(ctx, &b); err != nil {
		return nil, err
	}
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "transaction failed")
	}
	defer func() { _ = tx.Rollback(ctx) }()
	qtx := h.q.WithTx(tx)

	if err := qtx.UpdateItem(ctx, store.UpdateItemParams{
		ID:            input.ID,
		Name:          b.Name,
		Description:   b.Description,
		LocationID:    b.LocationID,
		Status:        b.Status,
		Manufacturer:  b.Manufacturer,
		Model:         b.Model,
		Serial:        b.Serial,
		PurchasePrice: toNullNumeric(b.PurchasePrice),
		PurchasedAt:   parseDatePtr(b.PurchasedAt),
		Warranty:      b.Warranty,
		Insured:       b.Insured,
		Notes:         b.Notes,
		AssetID:       b.AssetID,
		Tier:          b.Tier,
		GridRow:       toNullInt4(b.GridRow),
		GridCol:       toNullInt4(b.GridCol),
	}); err != nil {
		if isUniqueViolation(err, "items_asset_id_key") {
			return nil, huma.NewError(http.StatusConflict, "asset ID is already in use")
		}
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update item")
	}
	if err := qtx.DeleteItemLabels(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to clear labels")
	}
	for _, lid := range b.LabelIDs {
		if err := qtx.InsertItemLabel(ctx, store.InsertItemLabelParams{
			ItemID: input.ID, LabelID: lid,
		}); err != nil {
			return nil, huma.NewError(http.StatusInternalServerError, "failed to assign label")
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to commit")
	}
	it, err := scanItem(h.pool.QueryRow(ctx, itemSelectSQL+` WHERE i.id = $1 GROUP BY i.id`, input.ID))
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to fetch updated item")
	}
	return &ItemOutput{Body: it}, nil
}

// DeleteItem deletes an item.
func (h *Handler) DeleteItem(ctx context.Context, input *ItemIDInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if err := h.q.DeleteItem(ctx, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete item")
	}
	return nil, nil
}

// validateGridPlacement defaults tier to "full" and, if a grid cell is set,
// validates the location is a grid container and the cell is within bounds.
func (h *Handler) validateGridPlacement(ctx context.Context, b *ItemBody) error {
	if b.Tier == "" {
		b.Tier = "full"
	}
	if b.Tier != "quick" && b.Tier != "full" {
		return huma.NewError(http.StatusUnprocessableEntity, "tier must be 'quick' or 'full'")
	}
	if (b.GridRow == nil) != (b.GridCol == nil) {
		return huma.NewError(http.StatusUnprocessableEntity, "grid_row and grid_col must be set together")
	}
	if b.GridRow == nil {
		return nil
	}
	if b.LocationID == nil {
		return huma.NewError(http.StatusUnprocessableEntity, "a grid cell requires a location")
	}
	loc, err := h.q.GetLocation(ctx, *b.LocationID)
	if err != nil {
		return huma.NewError(http.StatusUnprocessableEntity, "location not found")
	}
	if loc.LocationType != "container" || !loc.GridRows.Valid || !loc.GridCols.Valid {
		return huma.NewError(http.StatusUnprocessableEntity, "location is not a grid container")
	}
	if *b.GridRow < 0 || *b.GridRow >= int(loc.GridRows.Int32) || *b.GridCol < 0 || *b.GridCol >= int(loc.GridCols.Int32) {
		return huma.NewError(http.StatusUnprocessableEntity, "grid cell is out of bounds")
	}
	return nil
}

func isUniqueViolation(err error, constraintName string) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == pgerrcode.UniqueViolation && pgErr.ConstraintName == constraintName
	}
	return false
}

func generateAssetID() string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 6)
	_, _ = crand.Read(b)
	for i, v := range b {
		b[i] = chars[int(v)%len(chars)]
	}
	return "DT-" + string(b)
}
