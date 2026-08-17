// Command backfillthumbnails generates thumbnails for item and home photos
// that were uploaded before thumbnail generation existed (thumbnail_path is
// still NULL). Safe to re-run — it only touches rows missing a thumbnail.
package main

import (
	"context"
	"log"
	"os"
	"path/filepath"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"github.com/domitara/domitara/apps/api/internal/imaging"
)

func main() {
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL not set")
	}
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./data/uploads"
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	itemDone, itemFailed := backfill(ctx, pool, uploadDir,
		`SELECT id, content_type, file_path FROM item_photos WHERE thumbnail_path IS NULL`,
		`UPDATE item_photos SET thumbnail_path = $1 WHERE id = $2`,
	)
	log.Printf("item photos: %d thumbnails generated, %d failed", itemDone, itemFailed)

	homeDone, homeFailed := backfill(ctx, pool, uploadDir,
		`SELECT id, content_type, file_path FROM home_photos WHERE thumbnail_path IS NULL`,
		`UPDATE home_photos SET thumbnail_path = $1 WHERE id = $2`,
	)
	log.Printf("home photos: %d thumbnails generated, %d failed", homeDone, homeFailed)
}

// backfill runs listQuery (columns: id, content_type, file_path) and generates a thumbnail
// for each row, writing the new thumbnail_path back via updateQuery ($1 = thumbnail_path, $2 = id).
func backfill(ctx context.Context, pool *pgxpool.Pool, uploadDir, listQuery, updateQuery string) (done, failed int) {
	rows, err := pool.Query(ctx, listQuery)
	if err != nil {
		log.Fatalf("query: %v", err)
	}
	type photo struct{ id, contentType, filePath string }
	var photos []photo
	for rows.Next() {
		var p photo
		if err := rows.Scan(&p.id, &p.contentType, &p.filePath); err != nil {
			log.Fatalf("scan: %v", err)
		}
		photos = append(photos, p)
	}
	rows.Close()

	for _, p := range photos {
		ext := filepath.Ext(p.filePath)
		thumbRelPath := p.filePath[:len(p.filePath)-len(ext)] + "_thumb.jpg"
		srcAbs := filepath.Join(uploadDir, p.filePath)
		dstAbs := filepath.Join(uploadDir, thumbRelPath)

		if err := imaging.GenerateThumbnail(srcAbs, dstAbs, p.contentType); err != nil {
			log.Printf("skip %s (%s): %v", p.id, p.filePath, err)
			failed++
			continue
		}
		if _, err := pool.Exec(ctx, updateQuery, thumbRelPath, p.id); err != nil {
			log.Printf("update %s: %v", p.id, err)
			failed++
			continue
		}
		done++
	}
	return done, failed
}
