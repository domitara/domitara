-- Drop exact duplicate accent assignments (same everything) so the unique index can be built.
DELETE FROM location_paint a
USING location_paint b
WHERE a.surface = 'accent' AND b.surface = 'accent'
  AND a.location_id = b.location_id
  AND a.paint_color_id = b.paint_color_id
  AND COALESCE(a.surface_note, '') = COALESCE(b.surface_note, '')
  AND a.painted_on IS NOT DISTINCT FROM b.painted_on
  AND a.coats IS NOT DISTINCT FROM b.coats
  AND COALESCE(a.notes, '') = COALESCE(b.notes, '')
  AND (a.created_at, a.id) > (b.created_at, b.id);

-- The same color can't be listed twice as an accent with the same note at one location.
CREATE UNIQUE INDEX location_paint_accent_uniq
    ON location_paint (location_id, paint_color_id, COALESCE(surface_note, ''))
    WHERE surface = 'accent';
