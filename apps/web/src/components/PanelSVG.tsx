import type {
  ElectricalPanel,
  ElectricalBreaker,
  FloorPlanArea,
  SlotGeometry,
} from '@domitara/panel-core';
import { computeSlots } from '@domitara/panel-core';

// Layout constants
const SLOT_H = 52;
const SLOT_GAP = 4;
const PANEL_PAD = 16;
const MAIN_H = 64;
const LABEL_FONT = 11;
const SLOT_FONT = 10;
const BADGE_FONT = 9;

const PANEL_BG = '#1c1c1e';
const SLOT_BG = '#2c2c2e';
const SLOT_BORDER = '#3a3a3c';
const BLANK_BG = '#222224';
const MAIN_BG = '#18181a';
const AMBER = '#b45309';
const AMBER_BG = '#78350f22';
const TEXT_PRIMARY = '#f5f5f5';
const TEXT_DIM = '#8e8e93';

interface PanelSVGProps {
  panel: ElectricalPanel;
  breakers: ElectricalBreaker[];
  areas: FloorPlanArea[];
  onSlotClick: (slot: SlotGeometry) => void;
  width?: number;
}

function areaColor(areaId: string | null | undefined, areas: FloorPlanArea[]): string | null {
  if (!areaId) return null;
  return areas.find((a) => a.id === areaId)?.color ?? null;
}

function truncate(text: string | null | undefined, maxChars: number): string {
  if (!text) return '';
  return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
}

export function PanelSVG({ panel, breakers, areas, onSlotClick, width = 380 }: PanelSVGProps) {
  const slots = computeSlots(panel, breakers as Parameters<typeof computeSlots>[1]);

  // Calculate SVG height
  const mainSlot = slots.find((s) => s.state === 'main');
  const regularSlots = slots.filter((s) => s.state !== 'main');
  const maxRow = regularSlots.reduce((m, s) => Math.max(m, s.row + s.rowSpan - 1), 1);
  const mainHeight = mainSlot ? MAIN_H + SLOT_GAP : 0;
  const gridHeight = maxRow * (SLOT_H + SLOT_GAP);
  const svgHeight = PANEL_PAD * 2 + mainHeight + gridHeight + 28; // 28 for legend

  // Grid starts after padding + main breaker
  const gridY = PANEL_PAD + mainHeight;
  const colW = (width - PANEL_PAD * 2 - SLOT_GAP) / 2;

  function slotX(col: SlotGeometry['col']): number {
    if (col === 'left') return PANEL_PAD;
    if (col === 'right') return PANEL_PAD + colW + SLOT_GAP;
    return PANEL_PAD; // 'full'
  }

  function slotY(slot: SlotGeometry): number {
    if (slot.state === 'main') return PANEL_PAD;
    return gridY + (slot.row - (mainSlot ? 2 : 1)) * (SLOT_H + SLOT_GAP);
  }

  function slotWidth(col: SlotGeometry['col']): number {
    return col === 'full' ? width - PANEL_PAD * 2 : colW;
  }

  function slotHeight(slot: SlotGeometry): number {
    if (slot.state === 'main') return MAIN_H;
    return slot.rowSpan * SLOT_H + (slot.rowSpan - 1) * SLOT_GAP;
  }

  // Unique areas present in this panel for the legend
  const presentAreas = areas.filter((a) => breakers.some((b) => b.floor_plan_area_id === a.id));

  return (
    <svg
      width={width}
      height={svgHeight}
      style={{ display: 'block', borderRadius: 10, cursor: 'default', userSelect: 'none' }}
    >
      {/* Panel background */}
      <rect x={0} y={0} width={width} height={svgHeight} rx={10} fill={PANEL_BG} />

      {slots.map((slot) => {
        const x = slotX(slot.col);
        const y = slotY(slot);
        const w = slotWidth(slot.col);
        const h = slotHeight(slot);
        const color = areaColor(slot.breaker?.floor_plan_area_id, areas);
        const isMain = slot.state === 'main';
        const isBlank = slot.state === 'blank';
        const isDoublePole = slot.breaker?.breaker_type === 'double_pole';

        const bg = isMain ? MAIN_BG : isBlank ? BLANK_BG : slot.isUnlabeled ? AMBER_BG : SLOT_BG;
        const borderColor = isMain ? '#555' : slot.isUnlabeled ? AMBER : (color ?? SLOT_BORDER);

        return (
          <g key={slot.slot} onClick={() => onSlotClick(slot)} style={{ cursor: 'pointer' }}>
            {/* Slot background */}
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={5}
              fill={bg}
              stroke={borderColor}
              strokeWidth={color && !isMain ? 2 : 1}
            />

            {/* Area color accent strip on left edge */}
            {color && !isMain && (
              <rect x={x} y={y + 2} width={4} height={h - 4} rx={2} fill={color} />
            )}

            {/* Double-pole connector bar */}
            {isDoublePole && (
              <rect
                x={x + w / 2 - 8}
                y={y + h / 2 - 3}
                width={16}
                height={6}
                rx={3}
                fill={color ?? '#555'}
              />
            )}

            {/* Slot number */}
            <text
              x={x + 10 + (color ? 6 : 0)}
              y={y + 15}
              fontSize={SLOT_FONT}
              fill={TEXT_DIM}
              fontFamily="system-ui, sans-serif"
            >
              {isMain ? '' : String(slot.slot)}
              {isDoublePole ? `–${slot.slot + 2}` : ''}
            </text>

            {/* Label */}
            <text
              x={x + 10 + (color ? 6 : 0)}
              y={isMain ? y + h / 2 + 6 : y + h / 2 + 5}
              fontSize={isMain ? 13 : LABEL_FONT}
              fontWeight={isMain ? '600' : '500'}
              fill={isBlank ? TEXT_DIM : slot.isUnlabeled ? AMBER : TEXT_PRIMARY}
              fontFamily="system-ui, sans-serif"
            >
              {isMain
                ? truncate(slot.breaker?.label ?? 'Main', 22)
                : isBlank
                  ? ''
                  : slot.isUnlabeled
                    ? '?'
                    : truncate(slot.breaker?.label, 18)}
            </text>

            {/* Amps badge */}
            {slot.breaker?.amps && !isMain && (
              <text
                x={x + w - 8}
                y={y + h - 8}
                fontSize={BADGE_FONT}
                fill={TEXT_DIM}
                textAnchor="end"
                fontFamily="system-ui, sans-serif"
              >
                {slot.breaker.amps}A
              </text>
            )}

            {/* GFCI/AFCI badges */}
            {slot.breaker?.is_gfci && !isMain && (
              <text
                x={x + w - 8}
                y={y + 14}
                fontSize={BADGE_FONT}
                fill="#60a5fa"
                textAnchor="end"
                fontFamily="system-ui, sans-serif"
              >
                GFCI
              </text>
            )}
            {slot.breaker?.is_afci && !isMain && (
              <text
                x={x + w - (slot.breaker.is_gfci ? 34 : 8)}
                y={y + 14}
                fontSize={BADGE_FONT}
                fill="#a78bfa"
                textAnchor="end"
                fontFamily="system-ui, sans-serif"
              >
                AFCI
              </text>
            )}
          </g>
        );
      })}

      {/* Legend */}
      {presentAreas.length > 0 && (
        <>
          {presentAreas.map((area, i) => (
            <g key={area.id}>
              <rect
                x={PANEL_PAD + i * 90}
                y={svgHeight - 22}
                width={10}
                height={10}
                rx={2}
                fill={area.color}
              />
              <text
                x={PANEL_PAD + i * 90 + 14}
                y={svgHeight - 13}
                fontSize={9}
                fill={TEXT_DIM}
                fontFamily="system-ui, sans-serif"
              >
                {truncate(area.name, 10)}
              </text>
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
