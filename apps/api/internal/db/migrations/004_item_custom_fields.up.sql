CREATE TABLE item_custom_fields (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id    UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    field_key  TEXT NOT NULL,
    label      TEXT NOT NULL,
    value      TEXT,
    value_type TEXT NOT NULL DEFAULT 'text' CHECK (value_type IN ('text', 'number', 'date')),
    unit       TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (item_id, field_key)
);

CREATE INDEX ON item_custom_fields(item_id);
