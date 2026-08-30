CREATE TABLE paint_colors (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id    UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#e7e5e4',
    brand      TEXT,
    color_code TEXT,
    sheen      TEXT,
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT paint_colors_home_id_name_key UNIQUE (home_id, name)
);
CREATE INDEX paint_colors_home_id_idx ON paint_colors(home_id);

CREATE TABLE location_paint (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id    UUID NOT NULL REFERENCES locations(id)    ON DELETE CASCADE,
    paint_color_id UUID NOT NULL REFERENCES paint_colors(id) ON DELETE RESTRICT,
    surface        TEXT NOT NULL CHECK (surface IN ('walls', 'ceiling', 'trim', 'doors', 'accent')),
    surface_note   TEXT,
    painted_on     DATE,
    coats          INT CHECK (coats IS NULL OR coats > 0),
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One assignment per non-accent surface per location; multiple accent rows allowed.
CREATE UNIQUE INDEX location_paint_loc_surface_uniq
    ON location_paint (location_id, surface) WHERE surface <> 'accent';
CREATE INDEX location_paint_location_id_idx ON location_paint(location_id);
CREATE INDEX location_paint_paint_color_id_idx ON location_paint(paint_color_id);
