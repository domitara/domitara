import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { Home } from '../api/types';

export const spotlightOpenAtom = atom(false);

// Persisted across sessions. Holds the UUID of the currently active home.
export const activeHomeIdAtom = atomWithStorage<string | null>('domitara_activeHomeId', null);

// In-memory cache of homes fetched for the current user.
export const homesAtom = atom<Home[]>([]);
