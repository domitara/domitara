CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system_settings (
    lock           BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (lock),
    setup_complete BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO system_settings DEFAULT VALUES;

CREATE TABLE homes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    address_street   TEXT,
    address_city     TEXT,
    address_state    TEXT,
    address_zip      TEXT,
    address_country  TEXT,
    property_type    TEXT CHECK (property_type IN ('house','condo','apartment','townhouse','mobile','land')),
    year_built       INT,
    sqft             NUMERIC(10,2),
    notes            TEXT,
    purchase_price   NUMERIC(12,2),
    purchased_at     TIMESTAMPTZ,
    estimated_value  NUMERIC(12,2),
    mortgage_lender  TEXT,
    mortgage_notes   TEXT,
    hoa_name         TEXT,
    hoa_contact      TEXT,
    hoa_monthly_dues NUMERIC(10,2),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE home_members (
    home_id    UUID   NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT   NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (home_id, user_id)
);

CREATE TABLE home_photos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    filename     TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_path    TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE home_documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id       UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    filename      TEXT NOT NULL,
    content_type  TEXT NOT NULL,
    file_path     TEXT NOT NULL,
    size          BIGINT NOT NULL DEFAULT 0,
    document_type TEXT CHECK (document_type IN ('deed','insurance','inspection','survey','hoa','warranty','permit','tax','floor_plan','other')),
    floor_level   INT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    parent_id   UUID REFERENCES locations(id) ON DELETE SET NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE labels (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id    UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (home_id, name)
);

CREATE TABLE items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id        UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
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
    asset_id       TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (home_id, asset_id)
);

CREATE TABLE item_labels (
    item_id  UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, label_id)
);

CREATE TABLE maintenance_schedules (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id           UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    item_id           UUID REFERENCES items(id) ON DELETE SET NULL,
    title             TEXT NOT NULL,
    notes             TEXT,
    frequency_value   INT NOT NULL CHECK (frequency_value > 0),
    frequency_unit    TEXT NOT NULL CHECK (frequency_unit IN ('days', 'weeks', 'months', 'years')),
    last_performed_at DATE,
    next_due_at       DATE NOT NULL,
    created_by        BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE maintenance_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id      UUID REFERENCES homes(id) ON DELETE SET NULL,
    item_id      UUID REFERENCES items(id) ON DELETE SET NULL,
    schedule_id  UUID REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
    title        TEXT NOT NULL,
    notes        TEXT,
    cost         NUMERIC(12, 2),
    performed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (home_id IS NOT NULL OR item_id IS NOT NULL)
);

CREATE TABLE item_photos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id      UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    filename     TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_path    TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE item_documents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id      UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    filename     TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_path    TEXT NOT NULL,
    size         BIGINT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reminders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key           TEXT NOT NULL,
    title         TEXT NOT NULL,
    body          TEXT NOT NULL,
    tone          TEXT NOT NULL DEFAULT 'info' CHECK (tone IN ('info', 'warn', 'danger')),
    dismissed_at  TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, key)
);

CREATE TABLE floor_plan_areas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    document_id UUID REFERENCES home_documents(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    color       TEXT NOT NULL DEFAULT '#3b82f6',
    geometry    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE floor_plan_shapes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    document_id UUID REFERENCES home_documents(id) ON DELETE SET NULL,
    item_id     UUID REFERENCES items(id) ON DELETE SET NULL,
    label       TEXT,
    color       TEXT NOT NULL DEFAULT '#f59e0b',
    geometry    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE electrical_panels (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id           UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    total_amps        INT  NOT NULL DEFAULT 200 CHECK (total_amps > 0),
    total_slots       INT  NOT NULL DEFAULT 40  CHECK (total_slots > 0),
    location_note     TEXT,
    parent_panel_id   UUID REFERENCES electrical_panels(id) ON DELETE RESTRICT,
    fed_by_breaker_id UUID,
    sort_order        INT  NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE electrical_breakers (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id           UUID NOT NULL REFERENCES electrical_panels(id) ON DELETE CASCADE,
    slot               INT  NOT NULL,
    label              TEXT CHECK (char_length(label) <= 40),
    amps               INT  CHECK (amps IN (15,20,30,40,50,60,70,80,90,100,110,120,125,150,200)),
    breaker_type       TEXT NOT NULL DEFAULT 'standard'
                            CHECK (breaker_type IN ('standard','double_pole','tandem','blank','main')),
    is_gfci            BOOLEAN NOT NULL DEFAULT FALSE,
    is_afci            BOOLEAN NOT NULL DEFAULT FALSE,
    notes              TEXT,
    floor_plan_area_id UUID REFERENCES floor_plan_areas(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (panel_id, slot)
);

ALTER TABLE electrical_panels
    ADD CONSTRAINT electrical_panels_fed_by_breaker_id_fkey
    FOREIGN KEY (fed_by_breaker_id) REFERENCES electrical_breakers(id) ON DELETE SET NULL;

CREATE INDEX ON home_members(user_id);
CREATE INDEX ON home_photos(home_id);
CREATE INDEX ON home_documents(home_id);
CREATE INDEX ON locations(home_id);
CREATE INDEX ON locations(parent_id);
CREATE INDEX ON items(home_id);
CREATE INDEX ON items(location_id);
CREATE INDEX ON item_labels(label_id);
CREATE INDEX ON item_photos(item_id);
CREATE INDEX ON item_documents(item_id);
CREATE INDEX ON maintenance_schedules(home_id, next_due_at);
CREATE INDEX ON maintenance_schedules(item_id);
CREATE INDEX ON maintenance_logs(home_id);
CREATE INDEX ON maintenance_logs(item_id);
CREATE INDEX ON maintenance_logs(schedule_id);
CREATE INDEX ON floor_plan_areas(home_id);
CREATE INDEX ON floor_plan_areas(document_id);
CREATE INDEX ON floor_plan_shapes(home_id);
CREATE INDEX ON floor_plan_shapes(document_id);
CREATE INDEX ON floor_plan_shapes(item_id);
CREATE INDEX ON electrical_panels(home_id);
CREATE INDEX ON electrical_panels(parent_panel_id);
CREATE INDEX ON electrical_panels(fed_by_breaker_id);
CREATE INDEX ON electrical_breakers(floor_plan_area_id);
