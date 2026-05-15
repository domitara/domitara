-- Extend users with auth fields
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('admin', 'member'));

-- Remove the placeholder default so new inserts must supply password_hash
ALTER TABLE users ALTER COLUMN password_hash DROP DEFAULT;

-- Singleton row enforces one-time setup
CREATE TABLE system_settings (
    lock           BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (lock),
    setup_complete BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO system_settings DEFAULT VALUES;

-- Location tree
CREATE TABLE locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    parent_id   UUID REFERENCES locations(id) ON DELETE SET NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colored labels
CREATE TABLE labels (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    color      TEXT NOT NULL DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventory items
CREATE TABLE items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL,
    description    TEXT,
    location_id    UUID REFERENCES locations(id) ON DELETE SET NULL,
    status         TEXT NOT NULL DEFAULT 'owned' CHECK (status IN ('owned', 'loaned', 'missing')),
    manufacturer   TEXT,
    model          TEXT,
    serial         TEXT,
    purchase_price NUMERIC(12, 2),
    purchased_at   DATE,
    warranty       TEXT,
    insured        BOOLEAN NOT NULL DEFAULT FALSE,
    notes          TEXT,
    asset_id       TEXT UNIQUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Item ↔ label junction
CREATE TABLE item_labels (
    item_id  UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, label_id)
);

-- Per-item maintenance log
CREATE TABLE maintenance_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id      UUID REFERENCES items(id) ON DELETE SET NULL,
    title        TEXT NOT NULL,
    notes        TEXT,
    cost         NUMERIC(12, 2),
    performed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
