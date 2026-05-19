import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  Stage,
  Layer,
  Line,
  Circle,
  Text,
  Image as KonvaImage,
  Rect,
  Group as KonvaGroup,
} from 'react-konva';
import {
  Button,
  Group,
  ActionIcon,
  Tooltip,
  Modal,
  TextInput,
  ColorInput,
  Select,
  Stack,
} from '@mantine/core';
import { IconX, IconTrash, IconMapPin } from '@tabler/icons-react';
import useImage from 'use-image';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Line as KonvaLine } from 'konva/lib/shapes/Line';
import type { FloorPlanArea, FloorPlanShape, FloorPlanGeometry } from '../api/types';

// ---- types ----

type DrawMode = 'none' | 'zone-polygon' | 'shape-rect' | 'shape-polygon' | 'shape-circle';

interface SelectedShape {
  kind: 'zone' | 'shape';
  id: string;
}

interface SaveZoneModalState {
  open: boolean;
  coords: [number, number][];
  name: string;
  color: string;
}

interface SaveShapeModalState {
  open: boolean;
  coords: [number, number][];
  label: string;
  color: string;
  itemId: string | null;
}

interface EditingGeometry {
  id: string;
  kind: 'zone' | 'shape';
  coords: [number, number][];
}

export interface FloorPlanCanvasProps {
  imageUrl: string;
  zones: FloorPlanArea[];
  shapes: FloorPlanShape[];
  items?: { id: string; name: string }[];
  zonesVisible: boolean;
  shapesVisible: boolean;
  onCreateZone: (name: string, color: string, geometry: FloorPlanGeometry) => void;
  onUpdateZone: (id: string, geometry: FloorPlanGeometry) => void;
  onDeleteZone: (id: string) => void;
  onCreateShape: (
    label: string | null,
    color: string,
    itemId: string | null,
    geometry: FloorPlanGeometry
  ) => void;
  onUpdateShape: (id: string, geometry: FloorPlanGeometry) => void;
  onDeleteShape: (id: string) => void;
}

// ---- background image layer ----

function BackgroundImage({
  url,
  x,
  y,
  w,
  h,
}: {
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const [img] = useImage(url, 'anonymous');
  if (!img) return null;
  return <KonvaImage image={img} x={x} y={y} width={w} height={h} listening={false} />;
}

// ---- main component ----

export function FloorPlanCanvas({
  imageUrl,
  zones,
  shapes,
  items = [],
  zonesVisible,
  shapesVisible,
  onCreateZone,
  onUpdateZone,
  onDeleteZone,
  onCreateShape,
  onUpdateShape,
  onDeleteShape,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Stage dimensions = full container
  const [stageW, setStageW] = useState(800);
  const [stageH, setStageH] = useState(600);
  const [imgNaturalW, setImgNaturalW] = useState(800);
  const [imgNaturalH, setImgNaturalH] = useState(600);

  // Load natural image size
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImgNaturalW(img.naturalWidth || 800);
      setImgNaturalH(img.naturalHeight || 600);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      setStageW(el.clientWidth || 800);
      setStageH(el.clientHeight || 600);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // "Contain" fit: image fills stage without stretching
  const imgFit = useMemo(() => {
    const scaleX = stageW / imgNaturalW;
    const scaleY = stageH / imgNaturalH;
    const s = Math.min(scaleX, scaleY);
    const w = imgNaturalW * s;
    const h = imgNaturalH * s;
    return {
      x: (stageW - w) / 2,
      y: (stageH - h) / 2,
      w,
      h,
    };
  }, [stageW, stageH, imgNaturalW, imgNaturalH]);

  // Zoom / pan applied on top of the contain fit
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Convert screen pointer → normalized [0-1] image coords
  const toNorm = useCallback(
    (screenX: number, screenY: number): [number, number] => {
      const localX = (screenX - pos.x) / scale;
      const localY = (screenY - pos.y) / scale;
      const nx = (localX - imgFit.x) / imgFit.w;
      const ny = (localY - imgFit.y) / imgFit.h;
      return [Math.max(0, Math.min(1, nx)), Math.max(0, Math.min(1, ny))];
    },
    [pos, scale, imgFit]
  );

  // Convert normalized → stage-local pixel coords
  const toPx = useCallback(
    ([nx, ny]: [number, number]): [number, number] => [
      imgFit.x + nx * imgFit.w,
      imgFit.y + ny * imgFit.h,
    ],
    [imgFit]
  );

  const coordsToFlat = useCallback(
    (coords: [number, number][]): number[] => coords.flatMap((c) => toPx(c)),
    [toPx]
  );

  const centroidPx = useCallback(
    (coords: [number, number][]): [number, number] => {
      const cx = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      const cy = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      return toPx([cx, cy]);
    },
    [toPx]
  );

  // Draw state
  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [selected, setSelected] = useState<SelectedShape | null>(null);
  const [editing, setEditing] = useState<EditingGeometry | null>(null);
  const [rectStart, setRectStart] = useState<[number, number] | null>(null);
  const [rectCurrent, setRectCurrent] = useState<[number, number] | null>(null);
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);

  const [saveZone, setSaveZone] = useState<SaveZoneModalState>({
    open: false,
    coords: [],
    name: '',
    color: '#3b82f6',
  });
  const [saveShape, setSaveShape] = useState<SaveShapeModalState>({
    open: false,
    coords: [],
    label: '',
    color: '#f59e0b',
    itemId: null,
  });

  // Zoom
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const factor = e.evt.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newScale = Math.max(0.2, Math.min(10, scale * factor));
      const mousePointTo = { x: (pointer.x - pos.x) / scale, y: (pointer.y - pos.y) / scale };
      setScale(newScale);
      setPos({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [scale, pos]
  );

  const handleZoomIn = () => setScale((s) => Math.min(10, s * 1.25));
  const handleZoomOut = () => setScale((s) => Math.max(0.2, s / 1.25));
  const handleReset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  // Draw mode helpers
  const exitDraw = useCallback(() => {
    setDrawMode('none');
    setDrawPoints([]);
    setMousePos(null);
    setRectStart(null);
    setRectCurrent(null);
    setCircleCenter(null);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitDraw();
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && drawMode === 'none') {
        if (selected.kind === 'zone') onDeleteZone(selected.id);
        else onDeleteShape(selected.id);
        setSelected(null);
        setEditing(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [exitDraw, selected, drawMode, onDeleteZone, onDeleteShape]);

  // Stage click: place draw vertex OR deselect
  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      const ptr = stage.getPointerPosition();
      if (!ptr) return;
      const norm = toNorm(ptr.x, ptr.y);

      if (drawMode === 'zone-polygon' || drawMode === 'shape-polygon') {
        if (drawPoints.length >= 3) {
          const [fx, fy] = drawPoints[0];
          if (Math.abs(norm[0] - fx) < 0.02 && Math.abs(norm[1] - fy) < 0.02) {
            const coords = drawPoints;
            if (drawMode === 'zone-polygon')
              setSaveZone({ open: true, coords, name: '', color: '#3b82f6' });
            else setSaveShape({ open: true, coords, label: '', color: '#f59e0b', itemId: null });
            exitDraw();
            return;
          }
        }
        setDrawPoints((prev) => [...prev, norm]);
        return;
      }

      if (drawMode === 'shape-rect') {
        if (!rectStart) {
          setRectStart(norm);
        } else {
          const [x1, y1] = rectStart;
          const [x2, y2] = norm;
          const coords: [number, number][] = [
            [Math.min(x1, x2), Math.min(y1, y2)],
            [Math.max(x1, x2), Math.min(y1, y2)],
            [Math.max(x1, x2), Math.max(y1, y2)],
            [Math.min(x1, x2), Math.max(y1, y2)],
          ];
          setSaveShape({ open: true, coords, label: '', color: '#f59e0b', itemId: null });
          exitDraw();
        }
        return;
      }

      if (drawMode === 'shape-circle') {
        if (!circleCenter) {
          setCircleCenter(norm);
        } else {
          const [cx_px, cy_px] = toPx(circleCenter);
          const [mx_px, my_px] = toPx(norm);
          const rPx = Math.hypot(mx_px - cx_px, my_px - cy_px);
          if (rPx < 2) return;
          const N = 32;
          const coords: [number, number][] = Array.from({ length: N }, (_, i) => {
            const a = (i / N) * 2 * Math.PI;
            return [
              Math.max(0, Math.min(1, circleCenter[0] + (Math.cos(a) * rPx) / imgFit.w)),
              Math.max(0, Math.min(1, circleCenter[1] + (Math.sin(a) * rPx) / imgFit.h)),
            ] as [number, number];
          });
          setSaveShape({ open: true, coords, label: '', color: '#f59e0b', itemId: null });
          exitDraw();
        }
        return;
      }

      // deselect on background click
      if (e.target === stage || e.target.name() === 'bg-rect') {
        setSelected(null);
        setEditing(null);
      }
    },
    [drawMode, drawPoints, rectStart, circleCenter, toNorm, toPx, imgFit, exitDraw]
  );

  const handleStageMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (drawMode === 'none') return;
      const ptr = e.target.getStage()?.getPointerPosition();
      if (!ptr) return;
      const norm = toNorm(ptr.x, ptr.y);
      setMousePos(norm);
      if (drawMode === 'shape-rect' && rectStart) setRectCurrent(norm);
    },
    [drawMode, toNorm, rectStart]
  );

  const handleStageDblClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (drawMode !== 'zone-polygon' && drawMode !== 'shape-polygon') return;
      if (drawPoints.length < 3) return;
      e.evt.preventDefault();
      const coords = drawPoints;
      if (drawMode === 'zone-polygon')
        setSaveZone({ open: true, coords, name: '', color: '#3b82f6' });
      else setSaveShape({ open: true, coords, label: '', color: '#f59e0b', itemId: null });
      exitDraw();
    },
    [drawMode, drawPoints, exitDraw]
  );

  // Shape selection
  const selectZone = (zone: FloorPlanArea) => {
    if (drawMode !== 'none') return;
    setSelected({ kind: 'zone', id: zone.id });
    setEditing(
      zone.geometry ? { id: zone.id, kind: 'zone', coords: zone.geometry.coordinates } : null
    );
  };
  const selectShape = (shape: FloorPlanShape) => {
    if (drawMode !== 'none') return;
    setSelected({ kind: 'shape', id: shape.id });
    setEditing(
      shape.geometry ? { id: shape.id, kind: 'shape', coords: shape.geometry.coordinates } : null
    );
  };

  // Vertex drag: Circle position is in stage-local space
  const handleVertexDragMove = useCallback(
    (vertIdx: number, e: KonvaEventObject<DragEvent>) => {
      if (!editing) return;
      const node = e.target;
      const nx = Math.max(0, Math.min(1, (node.x() - imgFit.x) / imgFit.w));
      const ny = Math.max(0, Math.min(1, (node.y() - imgFit.y) / imgFit.h));
      setEditing((prev) => {
        if (!prev) return prev;
        const coords = prev.coords.map((c, i) =>
          i === vertIdx ? ([nx, ny] as [number, number]) : c
        );
        return { ...prev, coords };
      });
    },
    [editing, imgFit]
  );

  const handleVertexDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      if (!editing) return;
      const geom: FloorPlanGeometry = { type: 'Polygon', coordinates: editing.coords };
      if (editing.kind === 'zone') onUpdateZone(editing.id, geom);
      else onUpdateShape(editing.id, geom);
    },
    [editing, onUpdateZone, onUpdateShape]
  );

  // Whole-shape drag: node.x/y is the delta from where it started (original pos = 0,0)
  const handleShapeDragEnd = useCallback(
    (
      kind: 'zone' | 'shape',
      id: string,
      coords: [number, number][],
      e: KonvaEventObject<DragEvent>
    ) => {
      e.cancelBubble = true;
      const node = e.target;
      const dx = node.x() / imgFit.w;
      const dy = node.y() / imgFit.h;
      const newCoords = coords.map(
        ([x, y]) =>
          [Math.max(0, Math.min(1, x + dx)), Math.max(0, Math.min(1, y + dy))] as [number, number]
      );
      // Update points directly before resetting position to avoid a Konva redraw gap before React re-renders.
      (node as KonvaLine).points(coordsToFlat(newCoords));
      node.position({ x: 0, y: 0 });
      const geom: FloorPlanGeometry = { type: 'Polygon', coordinates: newCoords };
      if (kind === 'zone') onUpdateZone(id, geom);
      else onUpdateShape(id, geom);
      if (editing?.id === id) setEditing((prev) => (prev ? { ...prev, coords: newCoords } : prev));
    },
    [imgFit, coordsToFlat, editing, onUpdateZone, onUpdateShape]
  );

  const isSelectedEditing = (kind: 'zone' | 'shape', id: string) =>
    selected?.kind === kind && selected?.id === id;

  // Draw preview
  const renderDrawPreview = () => {
    if (drawMode === 'none' || drawPoints.length === 0) return null;
    const pts = [...drawPoints, ...(mousePos ? [mousePos] : [])];
    return (
      <Line
        points={coordsToFlat(pts)}
        stroke="#3b82f6"
        strokeWidth={2 / scale}
        dash={[6 / scale, 3 / scale]}
        listening={false}
      />
    );
  };

  const renderRectPreview = () => {
    if (drawMode !== 'shape-rect' || !rectStart || !rectCurrent) return null;
    const [x1, y1] = rectStart;
    const [x2, y2] = rectCurrent;
    const coords: [number, number][] = [
      [Math.min(x1, x2), Math.min(y1, y2)],
      [Math.max(x1, x2), Math.min(y1, y2)],
      [Math.max(x1, x2), Math.max(y1, y2)],
      [Math.min(x1, x2), Math.max(y1, y2)],
    ];
    return (
      <Line
        points={coordsToFlat(coords)}
        closed
        stroke="#f59e0b"
        strokeWidth={2 / scale}
        dash={[6 / scale, 3 / scale]}
        fill="rgba(245,158,11,0.15)"
        listening={false}
      />
    );
  };

  const renderCirclePreview = () => {
    if (drawMode !== 'shape-circle' || !circleCenter) return null;
    const [cx_px, cy_px] = toPx(circleCenter);
    let rPx = 0;
    if (mousePos) {
      const [mx_px, my_px] = toPx(mousePos);
      rPx = Math.hypot(mx_px - cx_px, my_px - cy_px);
    }
    return (
      <>
        <Circle x={cx_px} y={cy_px} radius={5 / scale} fill="#f59e0b" listening={false} />
        {rPx > 0 && (
          <Circle
            x={cx_px}
            y={cy_px}
            radius={rPx}
            stroke="#f59e0b"
            strokeWidth={2 / scale}
            dash={[6 / scale, 3 / scale]}
            fill="rgba(245,158,11,0.15)"
            listening={false}
          />
        )}
      </>
    );
  };

  const editCoords = editing?.coords ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      {/* Toolbar */}
      <Group gap="xs" wrap="wrap">
        {drawMode !== 'none' ? (
          <Button
            size="xs"
            variant="light"
            color="red"
            leftSection={<IconX size={14} />}
            onClick={exitDraw}
          >
            Cancel Draw
          </Button>
        ) : (
          <>
            <Tooltip label="Draw electrical zone polygon">
              <Button
                size="xs"
                variant="light"
                onClick={() => {
                  setDrawMode('zone-polygon');
                  setSelected(null);
                  setEditing(null);
                }}
              >
                + Zone
              </Button>
            </Tooltip>
            <Tooltip label="Draw layout rectangle">
              <Button
                size="xs"
                variant="light"
                color="yellow"
                onClick={() => {
                  setDrawMode('shape-rect');
                  setSelected(null);
                  setEditing(null);
                }}
              >
                + Rect
              </Button>
            </Tooltip>
            <Tooltip label="Draw layout polygon">
              <Button
                size="xs"
                variant="light"
                color="yellow"
                onClick={() => {
                  setDrawMode('shape-polygon');
                  setSelected(null);
                  setEditing(null);
                }}
              >
                + Shape
              </Button>
            </Tooltip>
            <Tooltip label="Draw layout circle">
              <Button
                size="xs"
                variant="light"
                color="yellow"
                onClick={() => {
                  setDrawMode('shape-circle');
                  setSelected(null);
                  setEditing(null);
                }}
              >
                + Circle
              </Button>
            </Tooltip>
          </>
        )}
        {selected && drawMode === 'none' && (
          <ActionIcon
            color="red"
            variant="light"
            size="sm"
            onClick={() => {
              if (selected.kind === 'zone') onDeleteZone(selected.id);
              else onDeleteShape(selected.id);
              setSelected(null);
              setEditing(null);
            }}
          >
            <IconTrash size={14} />
          </ActionIcon>
        )}

        <Group gap={4} ml="auto">
          <ActionIcon size="sm" variant="light" onClick={handleZoomOut} title="Zoom out">
            −
          </ActionIcon>
          <ActionIcon size="sm" variant="light" onClick={handleZoomIn} title="Zoom in">
            +
          </ActionIcon>
          <Button size="xs" variant="subtle" onClick={handleReset}>
            Reset View
          </Button>
        </Group>
      </Group>

      {drawMode !== 'none' && (
        <div style={{ fontSize: 12, color: '#888' }}>
          {drawMode === 'shape-rect'
            ? rectStart
              ? 'Click to place the second corner.'
              : 'Click to place the first corner.'
            : drawMode === 'shape-circle'
              ? circleCenter
                ? 'Click to set the radius.'
                : 'Click to place the center.'
              : `Click to place vertices. Click first vertex or double-click to close. ${drawPoints.length} placed.`}
        </div>
      )}

      {/* Canvas container — fills remaining height */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          cursor: drawMode !== 'none' ? 'crosshair' : 'default',
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#1a1a2e',
        }}
      >
        <Stage
          width={stageW}
          height={stageH}
          scaleX={scale}
          scaleY={scale}
          x={pos.x}
          y={pos.y}
          draggable={drawMode === 'none' && !selected}
          onDragEnd={(e) => {
            if (e.target === e.currentTarget) setPos({ x: e.target.x(), y: e.target.y() });
          }}
          onWheel={handleWheel}
          onClick={handleStageClick}
          onMouseMove={handleStageMouseMove}
          onDblClick={handleStageDblClick}
        >
          {/* Background image — scaled to contain */}
          <Layer listening={false}>
            <BackgroundImage url={imageUrl} x={imgFit.x} y={imgFit.y} w={imgFit.w} h={imgFit.h} />
          </Layer>

          {/* Invisible click-catcher for deselect */}
          <Layer>
            <Rect
              name="bg-rect"
              x={0}
              y={0}
              width={stageW}
              height={stageH}
              fill="transparent"
              listening
            />
          </Layer>

          {/* Electrical zones layer */}
          <Layer visible={zonesVisible}>
            {zones.map((zone) => {
              if (!zone.geometry) return null;
              const coords = isSelectedEditing('zone', zone.id)
                ? editCoords
                : zone.geometry.coordinates;
              const flat = coordsToFlat(coords);
              const [cx, cy] = centroidPx(coords);
              const isSelected = selected?.id === zone.id && selected?.kind === 'zone';
              return (
                <KonvaGroup key={zone.id}>
                  <Line
                    points={flat}
                    closed
                    fill={zone.color + '55'}
                    stroke={zone.color}
                    strokeWidth={isSelected ? 3 / scale : 2 / scale}
                    draggable={isSelected}
                    onDragEnd={(e) => handleShapeDragEnd('zone', zone.id, coords, e)}
                    onClick={() => selectZone(zone)}
                    onTap={() => selectZone(zone)}
                  />
                  <Text
                    x={cx - 50}
                    y={cy - 9}
                    width={100}
                    text={zone.name}
                    fontSize={Math.max(10, 14 / scale)}
                    fill="#fff"
                    align="center"
                    listening={false}
                    shadowColor="rgba(0,0,0,0.8)"
                    shadowBlur={4}
                    shadowEnabled
                  />
                  {isSelected &&
                    coords.map(([vx, vy], vi) => {
                      const [px, py] = toPx([vx, vy]);
                      return (
                        <Circle
                          key={vi}
                          x={px}
                          y={py}
                          radius={7 / scale}
                          fill="#fff"
                          stroke={zone.color}
                          strokeWidth={2 / scale}
                          draggable
                          onDragMove={(e) => handleVertexDragMove(vi, e)}
                          onDragEnd={handleVertexDragEnd}
                        />
                      );
                    })}
                </KonvaGroup>
              );
            })}
            {renderDrawPreview()}
          </Layer>

          {/* Home layout layer */}
          <Layer visible={shapesVisible}>
            {shapes.map((shape) => {
              if (!shape.geometry) return null;
              const coords = isSelectedEditing('shape', shape.id)
                ? editCoords
                : shape.geometry.coordinates;
              const flat = coordsToFlat(coords);
              const [cx, cy] = centroidPx(coords);
              const isSelected = selected?.id === shape.id && selected?.kind === 'shape';
              const labelText = shape.label ?? '';
              return (
                <KonvaGroup key={shape.id}>
                  <Line
                    points={flat}
                    closed
                    fill={shape.color + '66'}
                    stroke={shape.color}
                    strokeWidth={isSelected ? 3 / scale : 2 / scale}
                    draggable={isSelected}
                    onDragEnd={(e) => handleShapeDragEnd('shape', shape.id, coords, e)}
                    onClick={() => selectShape(shape)}
                    onTap={() => selectShape(shape)}
                  />
                  {labelText && (
                    <Text
                      x={cx - 60}
                      y={cy - 9}
                      width={120}
                      text={labelText}
                      fontSize={Math.max(10, 12 / scale)}
                      fill="#fff"
                      align="center"
                      listening={false}
                      shadowColor="rgba(0,0,0,0.8)"
                      shadowBlur={4}
                      shadowEnabled
                    />
                  )}
                  {isSelected &&
                    coords.map(([vx, vy], vi) => {
                      const [px, py] = toPx([vx, vy]);
                      return (
                        <Circle
                          key={vi}
                          x={px}
                          y={py}
                          radius={7 / scale}
                          fill="#fff"
                          stroke={shape.color}
                          strokeWidth={2 / scale}
                          draggable
                          onDragMove={(e) => handleVertexDragMove(vi, e)}
                          onDragEnd={handleVertexDragEnd}
                        />
                      );
                    })}
                </KonvaGroup>
              );
            })}
            {renderRectPreview()}
            {renderCirclePreview()}
            {drawMode === 'shape-polygon' && renderDrawPreview()}
          </Layer>
        </Stage>
      </div>

      {/* Save Zone Modal */}
      <Modal
        opened={saveZone.open}
        onClose={() => setSaveZone((s) => ({ ...s, open: false }))}
        title="New Electrical Zone"
        size="sm"
      >
        <Stack gap="sm">
          <TextInput
            label="Zone name"
            value={saveZone.name}
            onChange={(e) => setSaveZone((s) => ({ ...s, name: e.target.value }))}
            placeholder="Kitchen circuits"
            required
            autoFocus
          />
          <ColorInput
            label="Color"
            value={saveZone.color}
            onChange={(v) => setSaveZone((s) => ({ ...s, color: v }))}
            format="hex"
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setSaveZone((s) => ({ ...s, open: false }))}>
              Cancel
            </Button>
            <Button
              disabled={!saveZone.name.trim()}
              onClick={() => {
                onCreateZone(saveZone.name.trim(), saveZone.color.slice(0, 7), {
                  type: 'Polygon',
                  coordinates: saveZone.coords,
                });
                setSaveZone((s) => ({ ...s, open: false }));
              }}
            >
              Save Zone
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Save Shape Modal */}
      <Modal
        opened={saveShape.open}
        onClose={() => setSaveShape((s) => ({ ...s, open: false }))}
        title="New Layout Shape"
        size="sm"
      >
        <Stack gap="sm">
          <TextInput
            label="Label"
            value={saveShape.label}
            onChange={(e) => setSaveShape((s) => ({ ...s, label: e.target.value }))}
            placeholder="Couch, Desk, etc."
            autoFocus
          />
          <ColorInput
            label="Color"
            value={saveShape.color}
            onChange={(v) => setSaveShape((s) => ({ ...s, color: v }))}
            format="hex"
          />
          {items.length > 0 && (
            <Select
              label="Link to item (optional)"
              placeholder="Search items…"
              data={items.map((i) => ({ value: i.id, label: i.name }))}
              value={saveShape.itemId}
              onChange={(v) => setSaveShape((s) => ({ ...s, itemId: v }))}
              clearable
              searchable
              leftSection={<IconMapPin size={14} />}
            />
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setSaveShape((s) => ({ ...s, open: false }))}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onCreateShape(
                  saveShape.label.trim() || null,
                  saveShape.color.slice(0, 7),
                  saveShape.itemId,
                  { type: 'Polygon', coordinates: saveShape.coords }
                );
                setSaveShape((s) => ({ ...s, open: false }));
              }}
            >
              Save Shape
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
