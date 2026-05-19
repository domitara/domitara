import { Svg, Rect, Text as SvgText, G } from 'react-native-svg';
import type { ElectricalPanel, ElectricalBreaker, FloorPlanArea, SlotGeometry } from '@domitara/panel-core';
import { computeSlots } from '@domitara/panel-core';

const SLOT_H = 52;
const SLOT_GAP = 4;
const PANEL_PAD = 12;
const MAIN_H = 64;

const PANEL_BG = '#1c1c1e';
const SLOT_BG = '#2c2c2e';
const SLOT_BORDER = '#3a3a3c';
const BLANK_BG = '#222224';
const MAIN_BG = '#18181a';
const AMBER_BG = '#78350f';
const TEXT_PRIMARY = '#f5f5f5';
const TEXT_DIM = '#8e8e93';

function areaColor(areaId: string | null | undefined, areas: FloorPlanArea[]): string | null {
  if (!areaId) return null;
  return areas.find((a) => a.id === areaId)?.color ?? null;
}

function truncate(text: string | null | undefined, maxChars: number): string {
  if (!text) return '';
  return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
}

interface PanelSVGProps {
  panel: ElectricalPanel;
  breakers: ElectricalBreaker[];
  areas: FloorPlanArea[];
  onSlotPress: (slot: SlotGeometry) => void;
  width: number;
}

export function PanelSVG({ panel, breakers, areas, onSlotPress, width }: PanelSVGProps) {
  const slots = computeSlots(panel, breakers);

  const mainSlot = slots.find((s) => s.state === 'main');
  const regularSlots = slots.filter((s) => s.state !== 'main');
  const maxRow = regularSlots.reduce((m, s) => Math.max(m, s.row + s.rowSpan - 1), 1);
  const mainHeight = mainSlot ? MAIN_H + SLOT_GAP : 0;
  const gridHeight = maxRow * (SLOT_H + SLOT_GAP);
  const svgHeight = PANEL_PAD * 2 + mainHeight + gridHeight;

  const gridY = PANEL_PAD + mainHeight;
  const colW = (width - PANEL_PAD * 2 - SLOT_GAP) / 2;

  function slotX(col: SlotGeometry['col']): number {
    if (col === 'left') return PANEL_PAD;
    if (col === 'right') return PANEL_PAD + colW + SLOT_GAP;
    return PANEL_PAD;
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

  return (
    <Svg width={width} height={svgHeight}>
      <Rect x={0} y={0} width={width} height={svgHeight} rx={10} fill={PANEL_BG} />

      {slots.map((slot) => {
        const x = slotX(slot.col);
        const y = slotY(slot);
        const w = slotWidth(slot.col);
        const h = slotHeight(slot);
        const color = areaColor(slot.breaker?.floor_plan_area_id, areas);
        const isMain = slot.state === 'main';
        const isBlank = slot.state === 'blank';

        const bg = isMain ? MAIN_BG : isBlank ? BLANK_BG : slot.isUnlabeled ? AMBER_BG : SLOT_BG;
        const borderColor = isMain ? '#555' : slot.isUnlabeled ? '#b45309' : color ?? SLOT_BORDER;

        return (
          <G
            key={slot.slot}
            onPress={() => onSlotPress(slot)}
          >
            <Rect
              x={x} y={y} width={w} height={h} rx={5}
              fill={bg} stroke={borderColor} strokeWidth={color && !isMain ? 2 : 1}
            />

            {color && !isMain && (
              <Rect x={x} y={y + 2} width={4} height={h - 4} rx={2} fill={color} />
            )}

            {/* Slot number */}
            <SvgText
              x={x + 8 + (color ? 6 : 0)} y={y + 15}
              fontSize={9} fill={TEXT_DIM} fontFamily="System"
            >
              {isMain ? '' : `${slot.slot}${slot.breaker?.breaker_type === 'double_pole' ? `–${slot.slot + 2}` : ''}`}
            </SvgText>

            {/* Label */}
            <SvgText
              x={x + 8 + (color ? 6 : 0)}
              y={isMain ? y + h / 2 + 5 : y + h / 2 + 4}
              fontSize={isMain ? 13 : 10}
              fontWeight={isMain ? 'bold' : 'normal'}
              fill={isBlank ? TEXT_DIM : slot.isUnlabeled ? '#b45309' : TEXT_PRIMARY}
              fontFamily="System"
            >
              {isMain
                ? truncate(slot.breaker?.label ?? 'Main', 20)
                : isBlank ? '' : slot.isUnlabeled ? '?' : truncate(slot.breaker?.label, 14)}
            </SvgText>

            {/* Amps */}
            {slot.breaker?.amps && !isMain && (
              <SvgText
                x={x + w - 6} y={y + h - 7}
                fontSize={8} fill={TEXT_DIM} textAnchor="end" fontFamily="System"
              >
                {slot.breaker.amps}A
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}
