-- name: ListPaintColorsByHome :many
SELECT pc.id, pc.name, pc.color, pc.brand, pc.color_code, pc.sheen, pc.notes,
       COUNT(lp.id) AS location_count, pc.created_at, pc.updated_at
FROM paint_colors pc
LEFT JOIN location_paint lp ON lp.paint_color_id = pc.id
WHERE pc.home_id = $1
GROUP BY pc.id ORDER BY pc.name;

-- name: ListAllPaintColors :many
SELECT pc.id, pc.name, pc.color, pc.brand, pc.color_code, pc.sheen, pc.notes,
       COUNT(lp.id) AS location_count, pc.created_at, pc.updated_at
FROM paint_colors pc
LEFT JOIN location_paint lp ON lp.paint_color_id = pc.id
GROUP BY pc.id ORDER BY pc.name;

-- name: GetPaintColor :one
SELECT pc.id, pc.name, pc.color, pc.brand, pc.color_code, pc.sheen, pc.notes,
       COUNT(lp.id) AS location_count, pc.created_at, pc.updated_at
FROM paint_colors pc
LEFT JOIN location_paint lp ON lp.paint_color_id = pc.id
WHERE pc.id = $1
GROUP BY pc.id;

-- name: CreatePaintColor :one
INSERT INTO paint_colors (home_id, name, color, brand, color_code, sheen, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, name, color, brand, color_code, sheen, notes, created_at, updated_at;

-- name: UpdatePaintColor :exec
UPDATE paint_colors SET name = $2, color = $3, brand = $4, color_code = $5,
       sheen = $6, notes = $7, updated_at = NOW()
WHERE id = $1;

-- name: DeletePaintColor :exec
DELETE FROM paint_colors WHERE id = $1;

-- name: CountPaintColorUsage :one
SELECT COUNT(*) FROM location_paint WHERE paint_color_id = $1;

-- name: PaintColorHomeID :one
SELECT home_id FROM paint_colors WHERE id = $1;

-- name: LocationHomeID :one
SELECT home_id FROM locations WHERE id = $1;

-- name: ListLocationPaint :many
SELECT lp.id, lp.location_id, lp.paint_color_id, lp.surface, lp.surface_note,
       lp.painted_on, lp.coats, lp.notes, lp.created_at, lp.updated_at,
       pc.name AS paint_name, pc.color AS paint_color, pc.brand AS paint_brand,
       pc.color_code AS paint_color_code, pc.sheen AS paint_sheen
FROM location_paint lp
JOIN paint_colors pc ON pc.id = lp.paint_color_id
WHERE lp.location_id = $1
ORDER BY lp.surface, lp.created_at;

-- name: GetLocationPaint :one
SELECT lp.id, lp.location_id, lp.paint_color_id, lp.surface, lp.surface_note,
       lp.painted_on, lp.coats, lp.notes, lp.created_at, lp.updated_at,
       pc.name AS paint_name, pc.color AS paint_color, pc.brand AS paint_brand,
       pc.color_code AS paint_color_code, pc.sheen AS paint_sheen
FROM location_paint lp
JOIN paint_colors pc ON pc.id = lp.paint_color_id
WHERE lp.id = $1;

-- name: CreateLocationPaint :one
INSERT INTO location_paint (location_id, paint_color_id, surface, surface_note, painted_on, coats, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id;

-- name: UpdateLocationPaint :exec
UPDATE location_paint SET paint_color_id = $2, surface = $3, surface_note = $4,
       painted_on = $5, coats = $6, notes = $7, updated_at = NOW()
WHERE id = $1;

-- name: DeleteLocationPaint :exec
DELETE FROM location_paint WHERE id = $1;
