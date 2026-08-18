package imaging

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/color"
	"image/jpeg"
	"os"
	"path/filepath"
	"testing"
)

// buildMarker returns a 2x2 image with four distinct corners:
// red=top-left, green=top-right, blue=bottom-left, yellow=bottom-right.
// Checking the (top-left, top-right) colors after a transform uniquely
// identifies which of the 8 EXIF orientations was applied.
func buildMarker() image.Image {
	img := image.NewNRGBA(image.Rect(0, 0, 2, 2))
	img.Set(0, 0, color.NRGBA{255, 0, 0, 255})   // red: top-left
	img.Set(1, 0, color.NRGBA{0, 255, 0, 255})   // green: top-right
	img.Set(0, 1, color.NRGBA{0, 0, 255, 255})   // blue: bottom-left
	img.Set(1, 1, color.NRGBA{255, 255, 0, 255}) // yellow: bottom-right
	return img
}

func colorName(c color.Color) string {
	r, g, b, _ := c.RGBA()
	switch {
	case r > 0 && g == 0 && b == 0:
		return "red"
	case r == 0 && g > 0 && b == 0:
		return "green"
	case r == 0 && g == 0 && b > 0:
		return "blue"
	case r > 0 && g > 0 && b == 0:
		return "yellow"
	default:
		return "unknown"
	}
}

func TestApplyOrientationAllCases(t *testing.T) {
	cases := []struct {
		orientation    int
		wantTL, wantTR string
	}{
		{1, "red", "green"},
		{2, "green", "red"},
		{3, "yellow", "blue"},
		{4, "blue", "yellow"},
		{5, "red", "blue"},
		{6, "blue", "red"},
		{7, "yellow", "green"},
		{8, "green", "yellow"},
	}
	for _, tc := range cases {
		out := applyOrientation(buildMarker(), tc.orientation)
		b := out.Bounds()
		if b.Dx() != 2 || b.Dy() != 2 {
			t.Errorf("orientation %d: unexpected dims %v", tc.orientation, b)
			continue
		}
		gotTL := colorName(out.At(0, 0))
		gotTR := colorName(out.At(1, 0))
		if gotTL != tc.wantTL || gotTR != tc.wantTR {
			t.Errorf("orientation %d: got TL=%s TR=%s, want TL=%s TR=%s",
				tc.orientation, gotTL, gotTR, tc.wantTL, tc.wantTR)
		}
	}
}

// buildEXIFAPP1 hand-builds a minimal APP1 segment (little-endian TIFF, one
// IFD entry: Orientation=o) — the same shape a real phone camera JPEG carries.
func buildEXIFAPP1(o uint16) []byte {
	var tiff bytes.Buffer
	tiff.WriteString("II")                                   // little-endian
	_ = binary.Write(&tiff, binary.LittleEndian, uint16(42)) // magic
	_ = binary.Write(&tiff, binary.LittleEndian, uint32(8))  // offset to IFD0
	_ = binary.Write(&tiff, binary.LittleEndian, uint16(1))  // 1 entry
	_ = binary.Write(&tiff, binary.LittleEndian, uint16(0x0112))
	_ = binary.Write(&tiff, binary.LittleEndian, uint16(3)) // SHORT
	_ = binary.Write(&tiff, binary.LittleEndian, uint32(1)) // count
	_ = binary.Write(&tiff, binary.LittleEndian, o)
	_ = binary.Write(&tiff, binary.LittleEndian, uint16(0)) // pad value field to 4 bytes
	_ = binary.Write(&tiff, binary.LittleEndian, uint32(0)) // next IFD offset

	seg := append([]byte("Exif\x00\x00"), tiff.Bytes()...)
	segLen := len(seg) + 2 // includes the 2 length bytes themselves
	app1 := []byte{0xFF, 0xE1, byte(segLen >> 8), byte(segLen)}
	return append(app1, seg...)
}

func TestJpegOrientationParsesRealEXIFSegment(t *testing.T) {
	var plain bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	if err := jpeg.Encode(&plain, img, nil); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if plain.Bytes()[0] != 0xFF || plain.Bytes()[1] != 0xD8 {
		t.Fatalf("expected encoded jpeg to start with SOI")
	}

	for _, want := range []int{1, 3, 6, 8} {
		var data bytes.Buffer
		data.Write(plain.Bytes()[:2]) // SOI
		data.Write(buildEXIFAPP1(uint16(want)))
		data.Write(plain.Bytes()[2:]) // rest of the real JPEG (APP0, DQT, SOF, ... EOI)

		if _, err := jpeg.Decode(bytes.NewReader(data.Bytes())); err != nil {
			t.Fatalf("orientation %d: constructed JPEG failed to decode: %v", want, err)
		}
		if got := jpegOrientation(data.Bytes()); got != want {
			t.Errorf("orientation %d: jpegOrientation returned %d", want, got)
		}
	}
}

func TestJpegOrientationDefaultsToOneWithoutEXIF(t *testing.T) {
	var plain bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	if err := jpeg.Encode(&plain, img, nil); err != nil {
		t.Fatalf("encode: %v", err)
	}
	if got := jpegOrientation(plain.Bytes()); got != 1 {
		t.Errorf("expected default orientation 1, got %d", got)
	}
}

// TestGenerateThumbnailAppliesEXIFOrientation exercises the full
// GenerateThumbnail pipeline against a real file on disk: a wide (100x50)
// source with orientation=6 (rotate 90 CW to correct) should produce a
// *tall* thumbnail, matching what a viewer sees when it honors the tag.
func TestGenerateThumbnailAppliesEXIFOrientation(t *testing.T) {
	dir := t.TempDir()

	var plain bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 100, 50))
	if err := jpeg.Encode(&plain, img, nil); err != nil {
		t.Fatalf("encode: %v", err)
	}
	var data bytes.Buffer
	data.Write(plain.Bytes()[:2])
	data.Write(buildEXIFAPP1(6))
	data.Write(plain.Bytes()[2:])

	src := filepath.Join(dir, "src.jpg")
	if err := os.WriteFile(src, data.Bytes(), 0o644); err != nil {
		t.Fatalf("write src: %v", err)
	}

	dst := filepath.Join(dir, "thumb.jpg")
	if err := GenerateThumbnail(src, dst, "image/jpeg"); err != nil {
		t.Fatalf("GenerateThumbnail: %v", err)
	}

	out, err := os.Open(dst)
	if err != nil {
		t.Fatalf("open thumb: %v", err)
	}
	defer func() { _ = out.Close() }()
	thumb, err := jpeg.Decode(out)
	if err != nil {
		t.Fatalf("decode thumb: %v", err)
	}
	b := thumb.Bounds()
	if b.Dx() >= b.Dy() {
		t.Fatalf("expected a tall thumbnail after applying orientation 6, got %v", b)
	}
}
