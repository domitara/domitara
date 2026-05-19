-- name: CreateItem :one
INSERT INTO items (name, description, location_id, status, manufacturer, model, serial,
                   purchase_price, purchased_at, warranty, insured, notes, asset_id, home_id)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
RETURNING id;

-- name: UpdateItem :exec
UPDATE items SET name=$2, description=$3, location_id=$4, status=$5,
                 manufacturer=$6, model=$7, serial=$8,
                 purchase_price=$9, purchased_at=$10, warranty=$11,
                 insured=$12, notes=$13, asset_id=$14, updated_at=NOW()
WHERE id=$1;

-- name: DeleteItem :exec
DELETE FROM items WHERE id = $1;

-- name: DeleteItemLabels :exec
DELETE FROM item_labels WHERE item_id = $1;

-- name: InsertItemLabel :exec
INSERT INTO item_labels (item_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;

-- name: CountItemsByHome :one
SELECT COUNT(*) FROM items WHERE home_id = $1;

-- name: CountAllItems :one
SELECT COUNT(*) FROM items;
