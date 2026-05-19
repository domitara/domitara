# Domitara Development Guide

## SQL in the API (`apps/api`)

**Use sqlc for all database queries.** Write SQL in `apps/api/internal/db/queries/*.sql`, then run:

```
cd apps/api && go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1 generate
```

Use the generated `h.q.MethodName(ctx, params)` calls in handlers. Never write raw `h.pool.Query/QueryRow/Exec` SQL in a handler unless it falls into one of the documented exceptions below.

### Exceptions — hand-written SQL is required for these cases

1. **`ListItems` / `GetItem`** (`handler/items.go`): `GetItem` and `ListItems` use `COALESCE(array_agg(...) FILTER (...), '{}')` to collect label IDs. sqlc generates `interface{}` for this expression in pgx/v5 mode, making it unusable.

2. **`ListMaintenance`** (`handler/maintenance.go`): Dynamic `WHERE` clause that conditionally filters by `home_id` and/or `item_id` at runtime. sqlc cannot represent variable-arity WHERE clauses.

3. **Dashboard `SUM` queries** (`handler/admin.go`): `COALESCE(SUM(purchase_price), 0)` mixes `numeric` and `integer` types in the COALESCE, causing sqlc to generate `interface{}` in pgx/v5 mode.

### Type mapping

sqlc v1.31.1 in pgx/v5 mode generates `pgtype.Int4` and `pgtype.Numeric` for nullable int/numeric columns (type overrides don't apply). Use helpers in `handler/pgconv.go`:

- `fromNullInt4(n pgtype.Int4) *int`
- `fromNullNumeric(n pgtype.Numeric) *float64`
- `toNullInt4(p *int) pgtype.Int4`
- `toNullNumeric(p *float64) pgtype.Numeric`
- `pgDateStr(d pgtype.Date) string`
- `pgNullDateStr(t *time.Time) *string`
- `pgTimestampStr(t *time.Time) *string`
- `parseDatePtr(s *string) *time.Time`
- `pgtype.Timestamptz` fields: access `.Time` to get `time.Time`
