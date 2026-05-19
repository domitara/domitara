import { describe, it, expect } from 'vitest';
import type { Location } from './api/types';
import { getLocationChain, getDescendants, formatCurrency, formatDate, formatBytes } from './utils';

function loc(id: string, parent_id: string | null = null): Location {
  return {
    id,
    name: `Loc ${id}`,
    parent_id,
    description: null,
    item_count: 0,
    created_at: '',
    updated_at: '',
  };
}

describe('getLocationChain', () => {
  it('returns empty array for unknown id', () => {
    expect(getLocationChain([], 'x')).toEqual([]);
  });

  it('returns single item for root location', () => {
    const a = loc('a');
    expect(getLocationChain([a], 'a')).toEqual([a]);
  });

  it('returns full chain from root to leaf', () => {
    const a = loc('a');
    const b = loc('b', 'a');
    const c = loc('c', 'b');
    expect(getLocationChain([a, b, c], 'c')).toEqual([a, b, c]);
  });
});

describe('getDescendants', () => {
  it('always includes the root id', () => {
    expect(getDescendants([], 'a').has('a')).toBe(true);
  });

  it('includes direct children', () => {
    const result = getDescendants([loc('b', 'a')], 'a');
    expect(result.has('b')).toBe(true);
  });

  it('includes nested descendants', () => {
    const result = getDescendants([loc('b', 'a'), loc('c', 'b')], 'a');
    expect(result.has('c')).toBe(true);
  });

  it('excludes unrelated locations', () => {
    const result = getDescendants([loc('b', 'a'), loc('x')], 'a');
    expect(result.has('x')).toBe(false);
  });
});

describe('formatCurrency', () => {
  it('returns dash for null', () => expect(formatCurrency(null)).toBe('—'));
  it('returns dash for undefined', () => expect(formatCurrency(undefined)).toBe('—'));
  it('formats zero', () => expect(formatCurrency(0)).toBe('$0.00'));
  it('formats a positive value', () => expect(formatCurrency(1234.5)).toBe('$1234.50'));
  it('formats a negative value', () => expect(formatCurrency(-9.99)).toBe('$-9.99'));
});

describe('formatDate', () => {
  it('returns dash for empty string', () => expect(formatDate('')).toBe('—'));
  it('returns dash for null', () => expect(formatDate(null)).toBe('—'));
  it('returns dash for undefined', () => expect(formatDate(undefined)).toBe('—'));
  it('includes the year for a valid date', () => {
    expect(formatDate('2024-06-15')).toMatch(/2024/);
  });
});

describe('formatBytes', () => {
  it('handles zero', () => expect(formatBytes(0)).toBe('0 B'));
  it('formats bytes', () => expect(formatBytes(512)).toBe('512 B'));
  it('formats kilobytes', () => expect(formatBytes(1024)).toBe('1.0 KB'));
  it('formats megabytes', () => expect(formatBytes(1024 * 1024)).toBe('1.0 MB'));
  it('formats gigabytes', () => expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB'));
});
