-- name: CreateItem :one
INSERT INTO items (name, description, location_id, status, manufacturer, model, serial,
                   purchase_price, purchased_at, warranty, warranty_expires_at, insured, notes, asset_id, home_id,
                   tier, grid_row, grid_col)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
RETURNING id;

-- name: UpdateItem :exec
UPDATE items SET name=$2, description=$3, location_id=$4, status=$5,
                 manufacturer=$6, model=$7, serial=$8,
                 purchase_price=$9, purchased_at=$10, warranty=$11, warranty_expires_at=$12,
                 insured=$13, notes=$14, asset_id=$15,
                 tier=$16, grid_row=$17, grid_col=$18, updated_at=NOW()
WHERE id=$1;

-- name: DeleteItem :exec
DELETE FROM items WHERE id = $1;

-- name: DeleteItemLabels :exec
DELETE FROM item_labels WHERE item_id = $1;

-- name: InsertItemLabel :exec
INSERT INTO item_labels (item_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;

-- name: CountItemsByHome :one
SELECT COUNT(*) FROM items WHERE home_id = $1 AND tier != 'quick';

-- name: CountAllItems :one
SELECT COUNT(*) FROM items WHERE tier != 'quick';

-- name: CountExpiringWarrantiesByHome :one
SELECT COUNT(*) FROM items
WHERE home_id = $1 AND tier != 'quick'
  AND warranty_expires_at IS NOT NULL AND warranty_expires_at <= NOW() + INTERVAL '30 days';

-- name: CountAllExpiringWarranties :one
SELECT COUNT(*) FROM items
WHERE tier != 'quick'
  AND warranty_expires_at IS NOT NULL AND warranty_expires_at <= NOW() + INTERVAL '30 days';

-- name: GetMaxGridCell :one
SELECT COALESCE(MAX(grid_row), -1)::int AS max_row, COALESCE(MAX(grid_col), -1)::int AS max_col
FROM items WHERE location_id = $1;

-- name: DeleteItemCustomFields :exec
DELETE FROM item_custom_fields WHERE item_id = $1;

-- name: InsertItemCustomField :exec
INSERT INTO item_custom_fields (item_id, field_key, label, value, value_type, unit, sort_order)
VALUES ($1, $2, $3, $4, $5, $6, $7);
