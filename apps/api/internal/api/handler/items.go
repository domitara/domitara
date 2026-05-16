package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5"

	apimw "github.com/domitara/domitara/apps/api/internal/api/middleware"
)

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
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type ItemsOutput struct{ Body []ItemRow }
type ItemOutput struct{ Body ItemRow }

type ListItemsInput struct {
	LocationID string `query:"location_id"`
	LabelID    string `query:"label_id"`
}

type ItemIDInput struct {
	ID string `path:"id"`
}

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
	LabelIDs      []string `json:"label_ids,omitempty"`
}

type CreateItemInput struct{ Body ItemBody }

type UpdateItemInput struct {
	ID   string `path:"id"`
	Body ItemBody
}

const itemSelectSQL = `
	SELECT i.id, i.name, i.description, i.location_id, i.status,
	       i.manufacturer, i.model, i.serial,
	       i.purchase_price, i.purchased_at::text, i.warranty,
	       i.insured, i.notes, i.asset_id,
	       COALESCE(array_agg(il.label_id::text ORDER BY il.label_id) FILTER (WHERE il.label_id IS NOT NULL), '{}'),
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
		&it.LabelIDs, &it.CreatedAt, &it.UpdatedAt,
	)
	return it, err
}

func (h *Handler) ListItems(ctx context.Context, input *ListItemsInput) (*ItemsOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	query := itemSelectSQL
	args := []any{}
	n := 1
	if input.LocationID != "" {
		query += ` WHERE i.location_id = $` + strconv.Itoa(n)
		args = append(args, input.LocationID)
		n++
	} else if input.LabelID != "" {
		query += ` WHERE i.id IN (SELECT item_id FROM item_labels WHERE label_id = $` + strconv.Itoa(n) + `)`
		args = append(args, input.LabelID)
		n++
	}
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

func (h *Handler) CreateItem(ctx context.Context, input *CreateItemInput) (*ItemOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	b := input.Body
	if b.Status == "" {
		b.Status = "owned"
	}
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "transaction failed")
	}
	defer tx.Rollback(ctx)

	var itemID string
	err = tx.QueryRow(ctx,
		`INSERT INTO items (name, description, location_id, status, manufacturer, model, serial,
		                    purchase_price, purchased_at, warranty, insured, notes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10,$11,$12) RETURNING id`,
		b.Name, b.Description, b.LocationID, b.Status,
		b.Manufacturer, b.Model, b.Serial,
		b.PurchasePrice, b.PurchasedAt, b.Warranty, b.Insured, b.Notes,
	).Scan(&itemID)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to create item")
	}
	for _, lid := range b.LabelIDs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO item_labels (item_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			itemID, lid); err != nil {
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

func (h *Handler) UpdateItem(ctx context.Context, input *UpdateItemInput) (*ItemOutput, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	b := input.Body
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "transaction failed")
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`UPDATE items SET name=$2, description=$3, location_id=$4, status=$5,
		                  manufacturer=$6, model=$7, serial=$8,
		                  purchase_price=$9, purchased_at=$10::date, warranty=$11,
		                  insured=$12, notes=$13, updated_at=NOW()
		 WHERE id=$1`,
		input.ID, b.Name, b.Description, b.LocationID, b.Status,
		b.Manufacturer, b.Model, b.Serial,
		b.PurchasePrice, b.PurchasedAt, b.Warranty, b.Insured, b.Notes,
	); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to update item")
	}
	if _, err := tx.Exec(ctx, `DELETE FROM item_labels WHERE item_id = $1`, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to clear labels")
	}
	for _, lid := range b.LabelIDs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO item_labels (item_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			input.ID, lid); err != nil {
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

func (h *Handler) DeleteItem(ctx context.Context, input *ItemIDInput) (*struct{}, error) {
	if _, err := apimw.RequireAuth(ctx); err != nil {
		return nil, err
	}
	if _, err := h.pool.Exec(ctx, `DELETE FROM items WHERE id = $1`, input.ID); err != nil {
		return nil, huma.NewError(http.StatusInternalServerError, "failed to delete item")
	}
	return nil, nil
}
