// Package imaging generates downscaled JPEG thumbnails for uploaded photos.
package imaging

import (
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"os"

	"golang.org/x/image/draw"
	"golang.org/x/image/webp"
)

// MaxDim is the longest edge, in pixels, a generated thumbnail is scaled
// down to. Kept well above typical inline display sizes so it still looks
// sharp, while being small enough that the browser no longer has to
// downscale a multi-megapixel original into a tiny preview box — which is
// what produces visible grain/aliasing in Chrome.
const MaxDim = 800

// GenerateThumbnail reads the image at srcPath, downscales it so neither
// dimension exceeds MaxDim (smaller originals are left at their native
// size), and writes a JPEG encoding to dstPath. contentType must be one of
// "image/jpeg", "image/png", or "image/webp".
func GenerateThumbnail(srcPath, dstPath, contentType string) error {
	f, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer f.Close()

	var src image.Image
	switch contentType {
	case "image/jpeg":
		src, err = jpeg.Decode(f)
	case "image/png":
		src, err = png.Decode(f)
	case "image/webp":
		src, err = webp.Decode(f)
	default:
		return fmt.Errorf("unsupported content type %q", contentType)
	}
	if err != nil {
		return err
	}

	bounds := src.Bounds()
	w, h := bounds.Dx(), bounds.Dy()
	if w > MaxDim || h > MaxDim {
		if w >= h {
			h = h * MaxDim / w
			w = MaxDim
		} else {
			w = w * MaxDim / h
			h = MaxDim
		}
	}

	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.CatmullRom.Scale(dst, dst.Bounds(), src, bounds, draw.Src, nil)

	out, err := os.Create(dstPath)
	if err != nil {
		return err
	}
	defer out.Close()
	return jpeg.Encode(out, dst, &jpeg.Options{Quality: 82})
}
