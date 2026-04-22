import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Stage, Layer, Rect, Text, Group } from './react-konva';
import PopupAsiento from './PopupAsiento';
import useMapData from './useMapData';
import StageElement from '../editorLayout/StageElement';
import SectionShape from '../editorLayout/SectionShape';
import {
  CELL_SPACING,
  GRID_PADDING,
  CELL_TYPES,
  COLORS,
  getGridWidth,
  getGridHeight,
} from './constantes';

/**
 * Agrupa celdas de escenario contiguas en la misma fila para renderizar un solo bloque.
 */
function groupStages(grid, rows, cols) {
  const groups = [];
  for (let r = 0; r < rows; r++) {
    let startCol = null;
    for (let c = 0; c <= cols; c++) {
      const cell = c < cols ? grid[r][c] : null;
      const isStage = cell?.tipo === CELL_TYPES.STAGE;

      if (isStage && startCol === null) {
        startCol = c;
      } else if (!isStage && startCol !== null) {
        groups.push({ row: r, colStart: startCol, colEnd: c - 1 });
        startCol = null;
      }
    }
  }
  return groups;
}

/**
 * Componente principal del mapa de asientos.
 *
 * @param {Object} props
 * @param {number} props.layoutId - ID del layout
 * @param {number|null} props.eventId - ID del evento (para ver disponibilidad)
 * @param {Function} props.onSelectionChange - Callback con array de IDs seleccionados
 * @param {number} props.maxSelection - Máximo de asientos seleccionables (0 = sin límite)
 */
const MapaAsientos = ({
  layoutId,
  eventId = null,
  onSelectionChange,
  maxSelection = 0,
  allowSelection = true,
}) => {
  const { data, loading, error } = useMapData(layoutId, eventId);

  const containerRef = useRef(null);
  const stageRef = useRef(null);

  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [fittedScale, setFittedScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [popup, setPopup] = useState({ data: null, position: null });
  const lastSelectionPayloadRef = useRef('');

  // Set de claves propias del usuario para búsqueda O(1)
  const ownHeldKeysSet = useMemo(
    () => new Set(ownHeldSeatKeys.filter(Boolean)),
    [ownHeldSeatKeys]
  );

  // Calcular tamaño disponible
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setSize({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Agregar wheel listener con passive: false para permitir preventDefault
  useEffect(() => {
    if (!containerRef.current) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const scaleBy = 1.1;
      const direction = e.deltaY > 0 ? -1 : 1;
      const newScale = Math.max(0.3, Math.min(3, scale * Math.pow(scaleBy, direction)));
      setScale(newScale);
    };
    containerRef.current.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      containerRef.current?.removeEventListener('wheel', handleWheel);
    };
  }, [scale]);

  // Calcular escala y posición basándose en virtualWidth/virtualHeight
  useEffect(() => {
    if (!data || size.width === 0 || size.height === 0) return;

    // Calcular contenido real para centrado
    let maxRight = 0;
    let maxBottom = 0;

    (data.elements || []).forEach((el) => {
      maxRight = Math.max(maxRight, (el.x || 0) + (el.width || 0));
      maxBottom = Math.max(maxBottom, (el.y || 0) + (el.height || 0));
    });

    (data.sections || []).forEach((sec) => {
      const SECTION_PADDING = 14;
      const SEAT_SIZE = 16;
      const SECTION_HEADER_OFFSET = 18;
      const SEAT_LABEL_HEIGHT = 16;
      const CELL_SPACING = 48;

      const seatCoordinates = (sec.rows || []).flatMap((row, rowIndex) =>
        (row.seats || []).map((seat, seatIndex) => ({
          x: seat.x !== undefined ? seat.x : seatIndex * CELL_SPACING,
          y: seat.y !== undefined ? seat.y : rowIndex * CELL_SPACING,
        }))
      );

      const maxSeatX = seatCoordinates.length > 0
        ? Math.max(...seatCoordinates.map((seat) => seat.x))
        : 0;
      const maxSeatY = seatCoordinates.length > 0
        ? Math.max(...seatCoordinates.map((seat) => seat.y))
        : 0;

      const secWidth = SECTION_PADDING * 2 + Math.max(SEAT_SIZE, maxSeatX + SEAT_SIZE);
      const secHeight = SECTION_PADDING * 2 + SECTION_HEADER_OFFSET + Math.max(SEAT_SIZE, maxSeatY + SEAT_SIZE) + SEAT_LABEL_HEIGHT;

      maxRight = Math.max(maxRight, (sec.x || 0) + secWidth);
      maxBottom = Math.max(maxBottom, (sec.y || 0) + secHeight);
    });

    // Calcular dimensiones del contenido con márgenes
    const MARGIN_X = 60;
    const MARGIN_Y = 60;
    const contentWidth = maxRight > 0 ? maxRight + MARGIN_X : getGridWidth(data.cols) + MARGIN_X;
    const contentHeight = maxBottom > 0 ? maxBottom + MARGIN_Y : getGridHeight(data.rows) + MARGIN_Y;

    // Calcular offsets para centrar - permitir negativo para pan
    const offsetX = (size.width - contentWidth) / 2;
    const offsetY = (size.height - contentHeight) / 2;

    queueMicrotask(() => {
      setScale(1.0);
      setFittedScale(1.0);
      // Centrar: si es positivo centra, si es negativo permite ver el contenido desde el centro
      setStagePos({ x: offsetX, y: offsetY });
    });
  }, [data, size]);

  // Pre-seleccionar asientos propios del usuario cuando los datos carguen
  useEffect(() => {
    if (!data || !ownHeldKeysSet.size) return;
    const matchingIds = [];
    data.sections.forEach(section =>
      section.rows.forEach(row =>
        row.seats.forEach(seat => {
          if (seat.seatKey && ownHeldKeysSet.has(seat.seatKey)) {
            matchingIds.push(seat.id);
          }
        })
      )
    );
    if (matchingIds.length > 0) {
      setSelectedIds(matchingIds);
    }
  }, [data, ownHeldKeysSet]);

  const renderSections = useMemo(() => {
    if (!data?.sections) return [];
    return data.sections.map((section) => ({
      ...section,
      rows: (section.rows || []).map((row) => ({
        ...row,
        seats: (row.seats || []).map((seat) => {
          // Si el asiento es retención propia, marcarlo como 'seleccionado' visualmente
          // pero sobrescribir status a 'libre' para que sea interactivo (no bloqueado)
          const isOwnHeld = seat.status === 'retenido' && ownHeldKeysSet.has(seat.seatKey);
          return {
            ...seat,
            selected: selectedIds.includes(seat.id),
            status: isOwnHeld ? 'libre' : seat.status,
          };
        }),
      })),
      x: Number(section.x || 0),
      y: Number(section.y || 0),
    }));
  }, [data, selectedIds, ownHeldKeysSet]);

  const seatsById = useMemo(() => {
    const map = {};
    (data?.sections || []).forEach((section) => {
      (section.rows || []).forEach((row) => {
        (row.seats || []).forEach((seat) => {
          map[seat.id] = seat;
        });
      });
    });
    return map;
  }, [data]);

  // Notificar cambios de selección — enviar objetos completos con datos del asiento
  useEffect(() => {
    if (!onSelectionChange) return;
    const selectionSignature = selectedIds.join('|');
    if (lastSelectionPayloadRef.current === selectionSignature) return;
    lastSelectionPayloadRef.current = selectionSignature;

    const fullSeats = selectedIds
      .map((id) => seatsById[id])
      .filter(Boolean);
    onSelectionChange(fullSeats);
  }, [selectedIds, onSelectionChange, seatsById]);

  const toggleScale = useCallback(() => {
    setScale((prev) => (prev === 1 ? fittedScale : 1));
  }, [fittedScale]);

  const handleHover = useCallback((seatData, position) => {
    setPopup({ data: seatData, position });
  }, []);

  const handleSelect = useCallback(
    (seat) => {
      setSelectedIds((prev) => {
        if (!allowSelection) return prev;
        if (maxSelection > 0 && prev.length >= maxSelection) return prev;
        return [...prev, seat.id];
      });
    },
    [allowSelection, maxSelection]
  );

  const handleDeselect = useCallback((seatId) => {
    setSelectedIds((prev) => prev.filter((i) => i !== seatId));
  }, []);

  useEffect(() => {
    if (!allowSelection) {
      setSelectedIds([]);
    }
  }, [allowSelection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-default-500">Cargando mapa...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-danger">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const { grid, rows, cols, zonesMap, pricesMap, elements = [], sections = [], usesSnapshotLayout = false } = data;

  // El grid debe ocupar al menos el tamaño del Stage, pero expanderse si el contenido es mayor
  // Será calculado basado en contenido real
  let virtualWidth, virtualHeight;
  let maxRight = 0;
  let maxBottom = 0;

  // Ajustar si hay elementos o secciones que se extienden más allá del Stage
  if (elements.length > 0 || sections.length > 0) {
    elements.forEach((el) => {
      maxRight = Math.max(maxRight, (el.x || 0) + (el.width || 0));
      maxBottom = Math.max(maxBottom, (el.y || 0) + (el.height || 0));
    });

    sections.forEach((sec) => {
      // Constantes de SectionShape para cálculos precisos
      const SECTION_PADDING = 14;
      const SEAT_SIZE = 16;
      const SECTION_HEADER_OFFSET = 18;
      const SEAT_LABEL_HEIGHT = 16;
      const CELL_SPACING = 48;

      const rows = sec.rows || [];

      // Calcular las coordenadas reales de los asientos
      const seatCoordinates = rows.flatMap((row, rowIndex) =>
        (row.seats || []).map((seat, seatIndex) => ({
          x: seat.x !== undefined ? seat.x : seatIndex * CELL_SPACING,
          y: seat.y !== undefined ? seat.y : rowIndex * CELL_SPACING,
        }))
      );

      const maxSeatX = seatCoordinates.length > 0
        ? Math.max(...seatCoordinates.map((seat) => seat.x))
        : 0;
      const maxSeatY = seatCoordinates.length > 0
        ? Math.max(...seatCoordinates.map((seat) => seat.y))
        : 0;

      // Cálculo igual que en SectionShape.jsx
      const secWidth = SECTION_PADDING * 2 + Math.max(SEAT_SIZE, maxSeatX + SEAT_SIZE);
      const secHeight = SECTION_PADDING * 2 + SECTION_HEADER_OFFSET + Math.max(SEAT_SIZE, maxSeatY + SEAT_SIZE) + SEAT_LABEL_HEIGHT;

      maxRight = Math.max(maxRight, (sec.x || 0) + secWidth);
      maxBottom = Math.max(maxBottom, (sec.y || 0) + secHeight);
    });

  }

  // Calcular virtual dimensions basado exactamente en el contenido
  const MARGIN_X = 60;
  const MARGIN_Y = 60;

  virtualWidth = maxRight > 0 ? maxRight + MARGIN_X : getGridWidth(cols) + MARGIN_X;
  virtualHeight = maxBottom > 0 ? maxBottom + MARGIN_Y : getGridHeight(rows) + MARGIN_Y;

  const stageGroups = elements.length === 0 ? groupStages(grid, rows, cols) : [];
  const showGridGuides = !usesSnapshotLayout;

  // Leyenda de zonas únicas
  const uniqueZones = Object.values(zonesMap);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Leyenda de zonas */}
      {uniqueZones.length > 0 && (
        <div className="flex flex-wrap gap-4 px-4">
          {uniqueZones.map((zone) => (
            <div key={zone.id_zona} className="flex items-center gap-2 text-sm">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: zone.color || COLORS.SEAT_FREE }}
              />
              <span>{zone.nombre}</span>
              {pricesMap[zone.id_zona] != null && (
                <span className="text-default-400">
                  (${pricesMap[zone.id_zona]})
                </span>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: COLORS.SEAT_RESERVED }}
            />
            <span>Reservado</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: COLORS.SEAT_SELECTED }}
            />
            <span>Seleccionado</span>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: '700px',
          backgroundColor: '#f1f5f9',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          cursor: 'grab',
        }}
      >
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          x={stagePos.x}
          y={stagePos.y}
          draggable
          onMouseDown={() => {
            if (stageRef.current?.container()) {
              stageRef.current.container().style.cursor = 'grabbing';
            }
          }}
          onMouseUp={() => {
            if (stageRef.current?.container()) {
              stageRef.current.container().style.cursor = 'grab';
            }
          }}
          dragBoundFunc={(pos) => {
            const scaledWidth = virtualWidth * scale;
            const scaledHeight = virtualHeight * scale;

            // Permitir pan dentro de límites razonables
            const maxPanX = Math.max(stagePos.x, (size.width - scaledWidth) / 2);
            const minPanX = Math.min(stagePos.x, (size.width - scaledWidth) / 2);
            const maxPanY = Math.max(stagePos.y, (size.height - scaledHeight) / 2);
            const minPanY = Math.min(stagePos.y, (size.height - scaledHeight) / 2);

            return {
              x: Math.max(minPanX, Math.min(maxPanX, pos.x)),
              y: Math.max(minPanY, Math.min(maxPanY, pos.y)),
            };
          }}
          onDblClick={toggleScale}
          onDblTap={toggleScale}
          scaleX={scale}
          scaleY={scale}
        >
          <Layer>
            {/* Fondo del grid */}
            <Rect
              x={30}
              y={30}
              width={Math.max(0, virtualWidth - 60)}
              height={Math.max(0, virtualHeight - 60)}
              fill={COLORS.GRID_BACKGROUND}
              cornerRadius={8}
            />

            {/* Labels filas (izquierda) */}
            {showGridGuides && Array.from({ length: rows }, (_, r) => (
              <Text
                key={`row-${r}`}
                text={`${r + 1}`}
                x={GRID_PADDING / 4}
                y={GRID_PADDING + r * CELL_SPACING - 6}
                fontSize={12}
                fill="#a0aec0"
                width={GRID_PADDING / 2}
                align="center"
              />
            ))}

            {/* Labels columnas (arriba) */}
            {showGridGuides && Array.from({ length: cols }, (_, c) => (
              <Text
                key={`col-${c}`}
                text={`${c + 1}`}
                x={GRID_PADDING + c * CELL_SPACING - CELL_SPACING / 2}
                y={GRID_PADDING / 4}
                fontSize={12}
                fill="#a0aec0"
                width={CELL_SPACING}
                align="center"
              />
            ))}

            {/* Elementos del layout (escenario/pasillos) renderizados con tamaño real */}
            {elements.map((element) => (
              <StageElement
                key={`layout-element-${element.id}`}
                element={element}
                isSelected={false}
                draggable={false}
                onSelect={() => {}}
                onDragEnd={() => {}}
                nodeRef={() => {}}
              />
            ))}

            {/* Sections exactas del layout */}
            {renderSections.map((section) => (
              <SectionShape
                key={`section-${section.id}`}
                section={section}
                zoneColor={section.zoneColor || COLORS.SEAT_FREE}
                isSelected={false}
                draggable={false}
                onSelect={() => {}}
                onDoubleClick={() => {}}
                onDragEnd={() => {}}
                onTransformEnd={() => {}}
                nodeRef={() => {}}
                onSeatSelect={handleSelect}
                onSeatHover={handleHover}
                onSeatDeselect={handleDeselect}
              />
            ))}

            {/* Fallback legado: escenarios agrupados por grid */}
            {stageGroups.map((group) => {
              const blockWidth = (group.colEnd - group.colStart + 1) * CELL_SPACING;
              return (
                <CeldaEscenario
                  key={`stage-${group.row}-${group.colStart}-${group.colEnd}`}
                  x={GRID_PADDING + group.colStart * CELL_SPACING - CELL_SPACING / 2}
                  y={GRID_PADDING + group.row * CELL_SPACING - CELL_SPACING / 2}
                  width={blockWidth}
                  height={CELL_SPACING}
                />
              );
            })}

            {/* Asientos (ZONA DE ASIENTOS) */}
            {grid.flatMap((row, r) =>
              row.map((cell, c) => {
                if (cell?.tipo !== CELL_TYPES.SEAT_ZONE) return null;
                return (
                  <Asiento
                    key={cell.id}
                    x={GRID_PADDING + c * CELL_SPACING}
                    y={GRID_PADDING + r * CELL_SPACING}
                    data={cell}
                    zoneColor={cell.zoneColor}
                    isSelected={selectedIds.includes(cell.id)}
                    onHover={handleHover}
                    onSelect={handleSelect}
                    onDeselect={handleDeselect}
                    canSelect={allowSelection}
                  />
                );
              })
            )}
          </Layer>
        </Stage>

        {/* Popup HTML */}
        {popup.data && (
          <PopupAsiento
            position={popup.position}
            data={popup.data}
            zoneName={popup.data.zoneName}
            price={popup.data.price}
            onClose={() => setPopup({ data: null, position: null })}
          />
        )}
      </div>

      {/* Info selección */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-primary-50 rounded-xl">
          <span className="text-primary font-medium">
            {selectedIds.length} asiento{selectedIds.length === 1 ? '' : 's'} seleccionado{selectedIds.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => setSelectedIds([])}
            className="text-sm text-danger hover:underline"
          >
            Limpiar selección
          </button>
        </div>
      )}
    </div>
  );
};

MapaAsientos.propTypes = {
  layoutId: PropTypes.number.isRequired,
  eventId: PropTypes.number,
  onSelectionChange: PropTypes.func.isRequired,
  maxSelection: PropTypes.number,
  allowSelection: PropTypes.bool,
  ownHeldSeatKeys: PropTypes.arrayOf(PropTypes.string),
};

export default MapaAsientos;