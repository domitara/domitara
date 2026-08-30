import { useAtom } from 'jotai';
import { Slider, Tooltip } from '@mantine/core';
import { IconLayoutGrid } from '@tabler/icons-react';
import { itemGridSizeAtom, ITEM_GRID_SIZE_MIN, ITEM_GRID_SIZE_MAX } from '../store/atoms';

/**
 * Compact control that adjusts the `--item-card-min` CSS variable (via
 * `itemGridSizeAtom`), resizing every `.item-card-grid` on the page. Slide right
 * for fewer, larger cards; left for more, smaller cards.
 */
export function ItemGridSizeSlider() {
  const [size, setSize] = useAtom(itemGridSizeAtom);

  return (
    <Tooltip label="Grid size" withArrow>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 150 }}>
        <IconLayoutGrid size={16} style={{ flexShrink: 0, color: 'var(--dt-fg-3)' }} />
        <Slider
          aria-label="Grid size"
          flex={1}
          size="sm"
          min={ITEM_GRID_SIZE_MIN}
          max={ITEM_GRID_SIZE_MAX}
          step={20}
          value={size}
          onChange={setSize}
          label={(v) => `${v}px`}
        />
      </div>
    </Tooltip>
  );
}
