import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Stage, Layer, Rect, Text, Group } from './react-konva';
import Asiento from './Asiento';
import CeldaEscenario from './CeldaEscenario';
import PopupAsiento from './PopupAsiento';
import useMapData from './useMapData';
import {
  CELL_SIZE,
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

// Padding alrededor de cada sección y altura para el nombre
const SECT_PAD = 8;
const SECT_LABEL_H = 20;

/**
 * Componente principal del mapa de asientos.
 *
 * Acepta props en español o inglés para compatibilidad con distintas páginas:
 *   idLayout / layoutId, idEvento / eventId,
 *   onSeleccionCambia / onSelectionChange, maxSeleccion / maxSelection
 */
const MapaAsientos = ({
  // Props en inglés
  layoutId: layoutIdProp,
  eventId: eventIdProp = null,
  onSelectionChange: onSelectionChangeProp,
  maxSelection: maxSelectionProp = 0,
  // Aliases en español
  idLayout,
  idEvento = null,
  onSeleccionCambia,
  maxSeleccion = 0,
}) => {
  const layoutId = layoutIdProp ?? idLayout;
  const eventId = eventIdProp ?? idEvento;
  const onSelectionChange = onSelectionChangeProp ?? onSeleccionCambia;
  const maxSelection = maxSelectionProp || maxSeleccion || 0;

  const { data, loading, error } = useMapData(layoutId, eventId);

  const containerRef = useRef(null);
  const stageRef = useRef(null);

  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [fittedScale, setFittedScale] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [popup, setPopup] = useState({ data: null, position: null });
  const lastSelectionPayloadRef = useRef('');

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

  // Calcular escala para ajustar al contenedor
  useEffect(() => {
    if (!data) return;
    const gridW = getGridWidth(data.cols);
    const gridH = getGridHeight(data.rows);
    const scaleX = size.width / gridW;
    const scaleY = size.height / gridH;
    const newScale = Math.min(scaleX, scaleY, 1.5);
    queueMicrotask(() => {
      setScale(newScale);
      setFittedScale(newScale);
    });
  }, [data, size]);

  // Build a lookup map for fast seat data access
  const cellsById = useMemo(() => {
    if (!data) return {};
    const map = {};
    for (let r = 0; r < data.rows; r++) {
      for (let c = 0; c < data.cols; c++) {
        const cell = data.grid[r]?.[c];
        if (cell) map[cell.id] = cell;
      }
    }
    return map;
  }, [data]);

  // Notificar cambios de selección — enviar objetos completos con datos del asiento
  useEffect(() => {
    if (!onSelectionChange) return;
    const selectionSignature = selectedIds.join('|');
    if (lastSelectionPayloadRef.current === selectionSignature) return;
    lastSelectionPayloadRef.current = selectionSignature;

    const fullSeats = selectedIds
      .map((id) => cellsById[id])
      .filter(Boolean);
    onSelectionChange(fullSeats);
  }, [selectedIds, onSelectionChange, cellsById]);

  const toggleScale = useCallback(() => {
    setScale((prev) => (prev === 1 ? fittedScale : 1));
  }, [fittedScale]);

  const handleHover = useCallback((seatData, position) => {
    setPopup({ data: seatData, position });
  }, []);

  const handleSelect = useCallback(
    (id) => {
      setSelectedIds((prev) => {
        if (maxSelection > 0 && prev.length >= maxSelection) return prev;
        return [...prev, id];
      });
    },
    [maxSelection]
  );

  const handleDeselect = useCallback((id) => {
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  }, []);

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

  const { grid, rows, cols, zonesMap, pricesMap, sections = [], elements: _elements = [] } = data;
  const virtualWidth = getGridWidth(cols);
  const virtualHeight = getGridHeight(rows);
  const stageGroups = groupStages(grid, rows, cols);

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
          height: '70vh',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          draggable
          dragBoundFunc={(pos) => {
            const maxX = size.width / 2;
            const maxY = size.height / 2;
            return {
              x: Math.min(maxX, Math.max(pos.x, -virtualWidth * scale + maxX)),
              y: Math.min(maxY, Math.max(pos.y, -virtualHeight * scale + maxY)),
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
              width={virtualWidth}
              height={virtualHeight}
              fill={COLORS.GRID_BACKGROUND}
              cornerRadius={8}
            />

            {/* Fondos de secciones (estilo editor) */}
            {sections.map((section) => {
              const numRows = section.numRows || section.rows?.length || 1;
              const seatsPerRow = section.seatsPerRow || section.rows?.[0]?.seats?.length || 1;
              const startRow = Math.max(0, Math.round((section.y || 0) / CELL_SPACING));
              const startCol = Math.max(0, Math.round((section.x || 0) / CELL_SPACING));
              const half = CELL_SIZE / 2;
              const bgX = GRID_PADDING + startCol * CELL_SPACING - half - SECT_PAD;
              const bgY = GRID_PADDING + startRow * CELL_SPACING - half - SECT_PAD - SECT_LABEL_H;
              const bgW = (seatsPerRow - 1) * CELL_SPACING + CELL_SIZE + SECT_PAD * 2;
              const bgH = (numRows - 1) * CELL_SPACING + CELL_SIZE + SECT_PAD * 2 + SECT_LABEL_H;
              const zoneColor = section.zoneColor || COLORS.SEAT_FREE;
              return (
                <Group key={`sect-${section.id}`} listening={false}>
                  <Rect
                    x={bgX}
                    y={bgY}
                    width={bgW}
                    height={bgH}
                    cornerRadius={12}
                    fill={zoneColor}
                    opacity={0.12}
                    stroke={zoneColor}
                    strokeWidth={1}
                  />
                  <Text
                    x={bgX}
                    y={bgY + 4}
                    width={bgW}
                    text={section.nombre || ''}
                    fontSize={11}
                    fontStyle="bold"
                    fill="#0f172a"
                    align="center"
                    listening={false}
                  />
                </Group>
              );
            })}

            {/* Escenarios agrupados */}
            {stageGroups.map((group, idx) => {
              const blockWidth = (group.colEnd - group.colStart + 1) * CELL_SPACING;
              return (
                <CeldaEscenario
                  key={`stage-${idx}`}
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
                if (!cell || cell.tipo !== CELL_TYPES.SEAT_ZONE) return null;
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
                  />
                );
              })
            )}

            {/* Etiquetas de número de asiento (encima de los círculos) */}
            {grid.flatMap((row, r) =>
              row.map((cell, c) => {
                if (!cell || cell.tipo !== CELL_TYPES.SEAT_ZONE || !cell.displayLabel) return null;
                const cx = GRID_PADDING + c * CELL_SPACING;
                const cy = GRID_PADDING + r * CELL_SPACING;
                return (
                  <Text
                    key={`lbl-${cell.id}`}
                    x={cx - CELL_SIZE / 2}
                    y={cy - 5}
                    width={CELL_SIZE}
                    text={String(cell.displayLabel)}
                    fontSize={9}
                    fill="#ffffff"
                    align="center"
                    listening={false}
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
            {selectedIds.length} asiento{selectedIds.length !== 1 ? 's' : ''} seleccionado{selectedIds.length !== 1 ? 's' : ''}
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

export default MapaAsientos;

MapaAsientos.propTypes = {
  // Props en inglés
  layoutId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  eventId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelectionChange: PropTypes.func,
  maxSelection: PropTypes.number,
  // Aliases en español
  idLayout: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  idEvento: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSeleccionCambia: PropTypes.func,
  maxSeleccion: PropTypes.number,
};

MapaAsientos.defaultProps = {
  layoutId: undefined,
  eventId: null,
  onSelectionChange: undefined,
  maxSelection: 0,
  idLayout: undefined,
  idEvento: null,
  onSeleccionCambia: undefined,
  maxSeleccion: 0,
};
