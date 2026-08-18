package imaging

import (
	"encoding/binary"
	"image"
)

// jpegOrientation scans the JPEG markers in data for an EXIF APP1 segment
// and returns its Orientation tag (1-8), or 1 (identity) if none is found
// or the data can't be parsed. Phone cameras store portrait photos as
// landscape pixel data plus this tag telling viewers how to rotate it for
// display; Go's image/jpeg decoder ignores it, so callers that re-encode
// the decoded pixels (like thumbnail generation) must apply it themselves
// or the result comes out sideways/upside-down.
func jpegOrientation(data []byte) int {
	if len(data) < 4 || data[0] != 0xFF || data[1] != 0xD8 {
		return 1
	}
	i := 2
	for i+4 <= len(data) {
		if data[i] != 0xFF {
			break
		}
		marker := data[i+1]
		if marker == 0x01 || (marker >= 0xD0 && marker <= 0xD9) {
			i += 2
			if marker == 0xD9 { // EOI
				break
			}
			continue
		}
		segLen := int(data[i+2])<<8 | int(data[i+3])
		if segLen < 2 || i+2+segLen > len(data) {
			break
		}
		if marker == 0xE1 { // APP1
			if o := exifOrientation(data[i+4 : i+2+segLen]); o != 0 {
				return o
			}
		}
		if marker == 0xDA { // SOS — compressed data follows, no more markers to scan
			break
		}
		i += 2 + segLen
	}
	return 1
}

// exifOrientation parses an "Exif\0\0"-prefixed APP1 payload and returns the
// Orientation tag (0x0112) value, or 0 if not present/parseable.
func exifOrientation(seg []byte) int {
	if len(seg) < 8 || string(seg[:6]) != "Exif\x00\x00" {
		return 0
	}
	tiff := seg[6:]
	var bo binary.ByteOrder
	switch string(tiff[:2]) {
	case "II":
		bo = binary.LittleEndian
	case "MM":
		bo = binary.BigEndian
	default:
		return 0
	}
	if len(tiff) < 8 {
		return 0
	}
	p := int(bo.Uint32(tiff[4:8]))
	if p < 0 || p+2 > len(tiff) {
		return 0
	}
	numEntries := int(bo.Uint16(tiff[p : p+2]))
	p += 2
	for e := 0; e < numEntries; e++ {
		if p+12 > len(tiff) {
			break
		}
		tag := bo.Uint16(tiff[p : p+2])
		if tag == 0x0112 {
			val := int(bo.Uint16(tiff[p+8 : p+10]))
			if val >= 1 && val <= 8 {
				return val
			}
			return 0
		}
		p += 12
	}
	return 0
}

// applyOrientation returns img transformed to correct for the given EXIF
// Orientation tag value (1 = identity, returned as-is).
func applyOrientation(img image.Image, o int) image.Image {
	switch o {
	case 2:
		return flipH(img)
	case 3:
		return rotate180(img)
	case 4:
		return flipV(img)
	case 5:
		return transpose(img)
	case 6:
		return rotate90CW(img)
	case 7:
		return transverse(img)
	case 8:
		return rotate270CW(img)
	default:
		return img
	}
}

func flipH(img image.Image) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	dst := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			dst.Set(x, y, img.At(b.Min.X+w-1-x, b.Min.Y+y))
		}
	}
	return dst
}

func flipV(img image.Image) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	dst := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			dst.Set(x, y, img.At(b.Min.X+x, b.Min.Y+h-1-y))
		}
	}
	return dst
}

func rotate180(img image.Image) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	dst := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			dst.Set(x, y, img.At(b.Min.X+w-1-x, b.Min.Y+h-1-y))
		}
	}
	return dst
}

// transpose mirrors across the top-left/bottom-right diagonal (swaps width/height).
func transpose(img image.Image) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	dst := image.NewNRGBA(image.Rect(0, 0, h, w))
	for y := 0; y < w; y++ {
		for x := 0; x < h; x++ {
			dst.Set(x, y, img.At(b.Min.X+y, b.Min.Y+x))
		}
	}
	return dst
}

// transverse mirrors across the top-right/bottom-left diagonal (swaps width/height).
func transverse(img image.Image) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	dst := image.NewNRGBA(image.Rect(0, 0, h, w))
	for y := 0; y < w; y++ {
		for x := 0; x < h; x++ {
			dst.Set(x, y, img.At(b.Min.X+w-1-y, b.Min.Y+h-1-x))
		}
	}
	return dst
}

// rotate90CW rotates the image 90° clockwise (swaps width/height).
func rotate90CW(img image.Image) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	dst := image.NewNRGBA(image.Rect(0, 0, h, w))
	for y := 0; y < w; y++ {
		for x := 0; x < h; x++ {
			dst.Set(x, y, img.At(b.Min.X+y, b.Min.Y+h-1-x))
		}
	}
	return dst
}

// rotate270CW rotates the image 270° clockwise / 90° counter-clockwise (swaps width/height).
func rotate270CW(img image.Image) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	dst := image.NewNRGBA(image.Rect(0, 0, h, w))
	for y := 0; y < w; y++ {
		for x := 0; x < h; x++ {
			dst.Set(x, y, img.At(b.Min.X+w-1-y, b.Min.Y+x))
		}
	}
	return dst
}
