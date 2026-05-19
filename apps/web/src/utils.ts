import type { Location } from './api/types';

export function getLocationChain(locations: Location[], locId: string): Location[] {
  const chain: Location[] = [];
  let cur: Location | undefined = locations.find((l) => l.id === locId);
  while (cur) {
    chain.unshift(cur);
    cur = cur.parent_id ? locations.find((l) => l.id === cur!.parent_id) : undefined;
  }
  return chain;
}

export function getDescendants(locations: Location[], rootId: string): Set<string> {
  const result = new Set<string>();
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    result.add(id);
    for (const l of locations) {
      if (l.parent_id === id) queue.push(l.id);
    }
  }
  return result;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return '$' + value.toFixed(2);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
