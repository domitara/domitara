package handler

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

func ptr[T any](v T) *T { return &v }

func TestFromNullInt4(t *testing.T) {
	if got := fromNullInt4(pgtype.Int4{}); got != nil {
		t.Errorf("invalid: want nil, got %v", got)
	}
	got := fromNullInt4(pgtype.Int4{Int32: 42, Valid: true})
	if got == nil || *got != 42 {
		t.Errorf("valid: want 42, got %v", got)
	}
}

func TestFromNullNumeric(t *testing.T) {
	if got := fromNullNumeric(pgtype.Numeric{}); got != nil {
		t.Errorf("invalid: want nil, got %v", got)
	}
	var n pgtype.Numeric
	_ = n.Scan("3.14")
	got := fromNullNumeric(n)
	if got == nil {
		t.Fatal("valid: want non-nil")
	}
	if diff := *got - 3.14; diff < -0.001 || diff > 0.001 {
		t.Errorf("want ~3.14, got %v", *got)
	}
}

func TestFromNullInt8(t *testing.T) {
	if got := fromNullInt8(pgtype.Int8{}); got != nil {
		t.Errorf("invalid: want nil, got %v", got)
	}
	got := fromNullInt8(pgtype.Int8{Int64: 999, Valid: true})
	if got == nil || *got != 999 {
		t.Errorf("valid: want 999, got %v", got)
	}
}

func TestToNullInt4(t *testing.T) {
	if got := toNullInt4(nil); got.Valid {
		t.Error("nil: want invalid pgtype.Int4")
	}
	got := toNullInt4(ptr(7))
	if !got.Valid || got.Int32 != 7 {
		t.Errorf("non-nil: want {7, valid}, got %v", got)
	}
}

func TestToNullNumeric(t *testing.T) {
	if got := toNullNumeric(nil); got.Valid {
		t.Error("nil: want invalid pgtype.Numeric")
	}
	got := toNullNumeric(ptr(1.5))
	if !got.Valid {
		t.Error("non-nil: want valid")
	}
}

func TestToNullInt8(t *testing.T) {
	if got := toNullInt8(nil); got.Valid {
		t.Error("nil: want invalid pgtype.Int8")
	}
	got := toNullInt8(ptr(int64(55)))
	if !got.Valid || got.Int64 != 55 {
		t.Errorf("non-nil: want {55, valid}, got %v", got)
	}
}

func TestPgDateStr(t *testing.T) {
	d := pgtype.Date{Time: time.Date(2024, 6, 15, 0, 0, 0, 0, time.UTC), Valid: true}
	if got := pgDateStr(d); got != "2024-06-15" {
		t.Errorf("want 2024-06-15, got %q", got)
	}
}

func TestPgNullDateStr(t *testing.T) {
	if got := pgNullDateStr(nil); got != nil {
		t.Errorf("nil: want nil, got %v", got)
	}
	ts := time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC)
	got := pgNullDateStr(&ts)
	if got == nil || *got != "2024-01-02" {
		t.Errorf("non-nil: want 2024-01-02, got %v", got)
	}
}

func TestPgTimestampStr(t *testing.T) {
	if got := pgTimestampStr(nil); got != nil {
		t.Error("nil: want nil")
	}
	ts := time.Date(2024, 3, 15, 12, 30, 0, 0, time.UTC)
	got := pgTimestampStr(&ts)
	if got == nil || *got != "2024-03-15T12:30:00Z" {
		t.Errorf("non-nil: want RFC3339, got %v", got)
	}
}

func TestParseDatePtr(t *testing.T) {
	if got := parseDatePtr(nil); got != nil {
		t.Error("nil: want nil")
	}
	empty := ""
	if got := parseDatePtr(&empty); got != nil {
		t.Error("empty string: want nil")
	}
	bad := "not-a-date"
	if got := parseDatePtr(&bad); got != nil {
		t.Error("invalid: want nil")
	}
	s := "2024-06-15"
	got := parseDatePtr(&s)
	if got == nil {
		t.Fatal("valid: want non-nil")
	}
	if got.Year() != 2024 || got.Month() != 6 || got.Day() != 15 {
		t.Errorf("want 2024-06-15, got %v", got)
	}
}
