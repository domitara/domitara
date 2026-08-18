import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { Button, Group, Stack, Text } from '@mantine/core';
import { itemDeepLink } from '../utils';
import type { Item } from '../api/types';

interface ItemLabelsPrintViewProps {
  items: Item[];
  getLocationName: (item: Item) => string | null;
  onPrint: () => void;
}

export function ItemLabelsPrintView({ items, getLocationName, onPrint }: ItemLabelsPrintViewProps) {
  const today = new Date().toLocaleDateString();
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      items.map(async (item) => {
        const dataUrl = await QRCode.toDataURL(itemDeepLink(item.id), { margin: 1, width: 96 });
        return [item.id, dataUrl] as const;
      })
    ).then((entries) => {
      if (!cancelled) setQrCodes(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const printContent = createPortal(
    <div className="print-portal" style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <Text fw={600} mb={2}>
        Item labels
      </Text>
      <Text size="xs" c="dimmed" mb="sm">
        Printed {today} · {items.length} label{items.length === 1 ? '' : 's'} · scan to open in the
        Domitara app
      </Text>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #999',
              borderRadius: 4,
              padding: 8,
              breakInside: 'avoid',
            }}
          >
            {qrCodes[item.id] && (
              <img src={qrCodes[item.id]} alt="" width={48} height={48} style={{ flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{item.name}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 14, letterSpacing: '.05em' }}>
                {item.asset_id ?? '—'}
              </div>
              {getLocationName(item) && (
                <div style={{ fontSize: 10, color: '#555' }}>{getLocationName(item)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {printContent}
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {items.length} item{items.length === 1 ? '' : 's'} will be printed, three labels per row.
          Each label's QR code opens the item directly in the Domitara Android app.
        </Text>
        <Group justify="flex-end">
          <Button onClick={onPrint} disabled={items.length === 0}>
            Open print dialog
          </Button>
        </Group>
      </Stack>
    </>
  );
}
