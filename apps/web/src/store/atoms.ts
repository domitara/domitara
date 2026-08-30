import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { Home } from '../api/types';

export const spotlightOpenAtom = atom(false);

// Persisted across sessions. Holds the UUID of the currently active home.
export const activeHomeIdAtom = atomWithStorage<string | null>('domitara_activeHomeId', null);

// Persisted across sessions. Minimum item-card width (px) for every `.item-card-grid`.
// Drives the `--item-card-min` CSS variable; larger = fewer, bigger cards per row.
export const ITEM_GRID_SIZE_MIN = 120;
export const ITEM_GRID_SIZE_MAX = 320;
export const ITEM_GRID_SIZE_DEFAULT = 160;
export const itemGridSizeAtom = atomWithStorage<number>(
  'domitara_itemGridSize',
  ITEM_GRID_SIZE_DEFAULT
);

// In-memory cache of homes fetched for the current user.
export const homesAtom = atom<Home[]>([]);
