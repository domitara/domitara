package handler

import (
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// pgtype → Go pointer conversions

func fromNullInt4(n pgtype.Int4) *int {
	if !n.Valid {
		return nil
	}
	v := int(n.Int32)
	return &v
}

func fromNullNumeric(n pgtype.Numeric) *float64 {
	if !n.Valid {
		return nil
	}
	f, err := n.Float64Value()
	if err != nil || !f.Valid {
		return nil
	}
	return &f.Float64
}

func fromNullInt8(n pgtype.Int8) *int64 {
	if !n.Valid {
		return nil
	}
	return &n.Int64
}

func pgDateStr(d pgtype.Date) string {
	return d.Time.Format("2006-01-02")
}

func pgNullDateStr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format("2006-01-02")
	return &s
}

func pgTimestampStr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format(time.RFC3339)
	return &s
}

// Go pointer → pgtype conversions (for query params)

func toNullInt4(p *int) pgtype.Int4 {
	if p == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: int32(*p), Valid: true}
}

func toNullNumeric(p *float64) pgtype.Numeric {
	if p == nil {
		return pgtype.Numeric{}
	}
	var n pgtype.Numeric
	if err := n.Scan(strconv.FormatFloat(*p, 'f', -1, 64)); err != nil {
		return pgtype.Numeric{}
	}
	return n
}

func toNullInt8(p *int64) pgtype.Int8 {
	if p == nil {
		return pgtype.Int8{}
	}
	return pgtype.Int8{Int64: *p, Valid: true}
}

// parseDatePtr parses a YYYY-MM-DD string pointer to a *time.Time for sqlc params.
func parseDatePtr(s *string) *time.Time {
	if s == nil || *s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", *s)
	if err != nil {
		return nil
	}
	return &t
}
