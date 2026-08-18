// Package imaging generates downscaled JPEG thumbnails for uploaded photos.
package imaging

import (
	"bytes"
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
//
// For JPEGs, the source's EXIF Orientation tag (phones store portrait
// photos as landscape pixel data plus a tag telling viewers how to rotate
// it) is read and applied before resizing, since image/jpeg.Decode ignores
// it and the re-encoded thumbnail would otherwise come out sideways even
// though the original displays correctly.
func GenerateThumbnail(srcPath, dstPath, contentType string) error {
	data, err := os.ReadFile(srcPath)
	if err != nil {
		return err
	}

	var src image.Image
	switch contentType {
	case "image/jpeg":
		src, err = jpeg.Decode(bytes.NewReader(data))
		if err == nil {
			src = applyOrientation(src, jpegOrientation(data))
		}
	case "image/png":
		src, err = png.Decode(bytes.NewReader(data))
	case "image/webp":
		src, err = webp.Decode(bytes.NewReader(data))
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
	defer func() { _ = out.Close() }()
	return jpeg.Encode(out, dst, &jpeg.Options{Quality: 82})
}
