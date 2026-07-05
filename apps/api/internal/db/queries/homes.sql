-- name: ListHomesForUser :many
SELECT h.id, h.name,
       h.address_street, h.address_city, h.address_state, h.address_zip, h.address_country,
       h.property_type, h.year_built, h.sqft, h.acreage, h.notes,
       h.purchase_price, h.purchased_at, h.estimated_value,
       h.mortgage_lender, h.mortgage_notes,
       h.hoa_name, h.hoa_contact, h.hoa_monthly_dues,
       hm.role, h.created_at, h.updated_at
FROM homes h
JOIN home_members hm ON hm.home_id = h.id AND hm.user_id = $1
ORDER BY h.name;

-- name: GetHomeForUser :one
SELECT h.id, h.name,
       h.address_street, h.address_city, h.address_state, h.address_zip, h.address_country,
       h.property_type, h.year_built, h.sqft, h.acreage, h.notes,
       h.purchase_price, h.purchased_at, h.estimated_value,
       h.mortgage_lender, h.mortgage_notes,
       h.hoa_name, h.hoa_contact, h.hoa_monthly_dues,
       hm.role, h.created_at, h.updated_at
FROM homes h
JOIN home_members hm ON hm.home_id = h.id AND hm.user_id = $1
WHERE h.id = $2;

-- name: CreateHome :one
INSERT INTO homes (name, address_street, address_city, address_state, address_zip, address_country,
                   property_type, year_built, sqft, acreage, notes,
                   purchase_price, purchased_at, estimated_value,
                   mortgage_lender, mortgage_notes,
                   hoa_name, hoa_contact, hoa_monthly_dues)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
RETURNING id;

-- name: CreateFirstHome :one
INSERT INTO homes (name) VALUES ($1) RETURNING id;

-- name: UpdateHome :exec
UPDATE homes SET name=$2, address_street=$3, address_city=$4, address_state=$5,
                 address_zip=$6, address_country=$7, property_type=$8,
                 year_built=$9, sqft=$10, acreage=$11, notes=$12,
                 purchase_price=$13, purchased_at=$14, estimated_value=$15,
                 mortgage_lender=$16, mortgage_notes=$17,
                 hoa_name=$18, hoa_contact=$19, hoa_monthly_dues=$20, updated_at=NOW()
WHERE id=$1;

-- name: DeleteHome :exec
DELETE FROM homes WHERE id = $1;

-- name: GetHomeMemberRole :one
SELECT role FROM home_members WHERE home_id = $1 AND user_id = $2;

-- name: CountHomeOwners :one
SELECT COUNT(*) FROM home_members WHERE home_id = $1 AND role = 'owner';

-- name: ListHomeMembers :many
SELECT u.id, u.name, u.email, hm.role, hm.created_at
FROM home_members hm
JOIN users u ON u.id = hm.user_id
WHERE hm.home_id = $1
ORDER BY hm.created_at ASC;

-- name: UpsertHomeMember :exec
INSERT INTO home_members (home_id, user_id, role) VALUES ($1, $2, $3)
ON CONFLICT (home_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- name: DeleteHomeMember :exec
DELETE FROM home_members WHERE home_id = $1 AND user_id = $2;

-- name: ListHomePhotos :many
SELECT id, home_id, filename, content_type, file_path, created_at
FROM home_photos WHERE home_id = $1 ORDER BY created_at ASC;

-- name: GetHomePhotoFilePath :one
SELECT file_path FROM home_photos WHERE id = $1 AND home_id = $2;

-- name: CreateHomePhoto :one
INSERT INTO home_photos (home_id, filename, content_type, file_path)
VALUES ($1, $2, $3, 'pending')
RETURNING id, home_id, filename, content_type, file_path, created_at;

-- name: UpdateHomePhotoPath :exec
UPDATE home_photos SET file_path = $1 WHERE id = $2;

-- name: DeleteHomePhoto :exec
DELETE FROM home_photos WHERE id = $1;

-- name: ListHomeDocuments :many
SELECT id, home_id, filename, content_type, file_path, size, document_type, floor_level, created_at
FROM home_documents WHERE home_id = $1
ORDER BY (document_type = 'floor_plan') DESC, created_at ASC;

-- name: UpdateHomeDocumentFloorLevel :exec
UPDATE home_documents SET floor_level = $1 WHERE id = $2 AND home_id = $3;

-- name: UpdateHomeDocumentType :exec
UPDATE home_documents SET document_type = $1 WHERE id = $2 AND home_id = $3;

-- name: GetHomeDocumentFilePath :one
SELECT file_path FROM home_documents WHERE id = $1 AND home_id = $2;

-- name: CreateHomeDocument :one
INSERT INTO home_documents (home_id, filename, content_type, file_path, size, document_type)
VALUES ($1, $2, $3, 'pending', 0, $4)
RETURNING id, home_id, filename, content_type, file_path, size, document_type, created_at;

-- name: UpdateHomeDocumentPath :exec
UPDATE home_documents SET file_path = $1, size = $2 WHERE id = $3;

-- name: DeleteHomeDocument :exec
DELETE FROM home_documents WHERE id = $1;
