import { useState, useEffect, useRef } from 'react';
import { Text, ActionIcon } from '@mantine/core';
import { IconSearch, IconBox, IconMapPin, IconTag, IconX } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { Item, Location, Label } from '../api/types';

interface SpotlightProps {
  onClose: () => void;
}

export function Spotlight({ onClose }: SpotlightProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | 'items' | 'locations' | 'labels'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const items     = queryClient.getQueryData<Item[]>(['items']) ?? [];
  const locations = queryClient.getQueryData<Location[]>(['locations']) ?? [];
  const labels    = queryClient.getQueryData<Label[]>(['labels']) ?? [];

  const ql = q.toLowerCase();
  const allItems = ql.length >= 2 ? items.filter(i => i.name.toLowerCase().includes(ql) || (i.asset_id ?? '').toLowerCase().includes(ql)).slice(0, 5) : [];
  const allLocs  = ql.length >= 2 ? locations.filter(l => l.name.toLowerCase().includes(ql)).slice(0, 3) : [];
  const allLabs  = ql.length >= 2 ? labels.filter(l => l.name.toLowerCase().includes(ql)).slice(0, 3) : [];

  const showItems = type === 'items' || type === 'all' ? allItems : [];
  const showLocs  = type === 'locations' || type === 'all' ? allLocs : [];
  const showLabs  = type === 'labels' || type === 'all' ? allLabs : [];
  const noResult  = q.length >= 2 && showItems.length + showLocs.length + showLabs.length === 0;

  return (
    <div className="spotlight-scrim" onClick={onClose}>
      <div className="spotlight-box" onClick={e => e.stopPropagation()}>
        <div className="spotlight-search">
          <IconSearch size={18} color="var(--dt-fg-3)"/>
          <input ref={inputRef} placeholder="Search items, locations, labels…" value={q} onChange={e => setQ(e.target.value)}/>
          <ActionIcon variant="subtle" color="gray" onClick={onClose} size="sm"><IconX size={14}/></ActionIcon>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--dt-divider)' }}>
          {(['all', 'items', 'locations', 'labels'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--dt-border)', background: type === t ? 'var(--dt-blue-6)' : 'var(--dt-bg)', color: type === t ? '#fff' : 'var(--dt-fg-2)', borderColor: type === t ? 'var(--dt-blue-6)' : 'var(--dt-border)', borderRadius: 4, font: 'inherit', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        <div className="spotlight-results">
          {q.length < 2 ? (
            <Text size="sm" c="dimmed" ta="center" p="xl">Type at least 2 characters to search</Text>
          ) : noResult ? (
            <Text size="sm" c="dimmed" ta="center" p="xl">No results found</Text>
          ) : (
            <>
              {showItems.length > 0 && (
                <>
                  <div className="spot-section">Items</div>
                  {showItems.map(i => (
                    <div key={i.id} className="spot-result" onClick={() => { onClose(); navigate({ to: '/items/$itemId', params: { itemId: i.id } }); }}>
                      <div className="row-thumb ph-1" style={{ width: 32, height: 32, borderRadius: 4, flexShrink: 0 }}>
                        <IconBox size={16} color="rgba(255,255,255,.7)"/>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <Text size="sm" fw={500} truncate>{i.name}</Text>
                        <Text size="xs" c="dimmed">{i.asset_id ?? '—'}</Text>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {showLocs.length > 0 && (
                <>
                  <div className="spot-section">Locations</div>
                  {showLocs.map(l => (
                    <div key={l.id} className="spot-result" onClick={() => { onClose(); navigate({ to: '/locations/$locationId', params: { locationId: l.id } }); }}>
                      <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--dt-gray-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconMapPin size={16} color="var(--dt-fg-3)"/>
                      </div>
                      <div><Text size="sm" fw={500}>{l.name}</Text><Text size="xs" c="dimmed">{l.item_count} items</Text></div>
                    </div>
                  ))}
                </>
              )}
              {showLabs.length > 0 && (
                <>
                  <div className="spot-section">Labels</div>
                  {showLabs.map(l => (
                    <div key={l.id} className="spot-result" onClick={() => { onClose(); navigate({ to: '/labels/$labelId', params: { labelId: l.id } }); }}>
                      <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--dt-gray-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconTag size={16} color="var(--dt-fg-3)"/>
                      </div>
                      <div><Text size="sm" fw={500}>{l.name}</Text><Text size="xs" c="dimmed">{l.item_count} items</Text></div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
