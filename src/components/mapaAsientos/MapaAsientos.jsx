import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Stage, Layer, Text } from './react-konva';
import PopupAsiento from './PopupAsiento';
import Asiento from './Asiento';
import CeldaEscenario from './CeldaEscenario';
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
 * Busca el primer grupo de 2-3 asientos consecutivos disponibles en un array de asientos.
 * Devuelve un Set de IDs o un Set vacío si no hay grupo válido.
 */
function findGroupInRow(seats) {
  let run = [];
  for (let i = 0; i <= seats.length; i++) {
    const seat = i < seats.length ? seats[i] : null;
    const available = seat && seat.status === 'libre';
    if (available) {
      run.push(seat);
      if (run.length === 3) return new Set(run.map((s) => s.id));
    } else {
      if (run.length >= 2) return new Set(run.slice(0, 3).map((s) => s.id));
      run = [];
    }
  }
  return new Set();
}

/**
 * Busca el primer grupo de 2-3 celdas de asiento consecutivas disponibles en
 * una fila del grid legado. Celdas que no sean SEAT_ZONE rompen la continuidad.
 */
function findGroupInGridRow(gridRow) {
  let run = [];
  for (let i = 0; i <= gridRow.length; i++) {
    const cell = i < gridRow.length ? gridRow[i] : null;
    const isSeat = cell?.tipo === CELL_TYPES.SEAT_ZONE;
    const available = isSeat && cell.estatus !== 'reservado' && cell.estatus !== 'retenido';
    if (available) {
      run.push(cell);
      if (run.length === 3) return new Set(run.map((c) => c.id));
    } else {
      if (run.length >= 2) return new Set(run.slice(0, 3).map((c) => c.id));
      run = [];
    }
  }
  return new Set();
}

/**
 * Recorre el layout (secciones modernas o grid legado) y devuelve un Set con
 * los IDs de los 2-3 asientos disponibles más cercanos al escenario que formen
 * un bloque continuo. Devuelve Set vacío si no encuentra ninguno.
 */
function findRecommendedSeats(data) {
  if (!data) return new Set();

  // Layout moderno con secciones
  if (data.sections?.length) {
    const stageEls = (data.elements || []).filter((e) => e.type === 'stage');
    const stageYCenter = stageEls.length
      ? stageEls.reduce((sum, e) => sum + (e.y || 0) + (e.height || 0) / 2, 0) / stageEls.length
      : -Infinity;

    const sorted = [...data.sections].sort((a, b) => {
      const distA = Math.abs((a.y || 0) - stageYCenter);
      const distB = Math.abs((b.y || 0) - stageYCenter);
      return distA - distB;
    });

    for (const section of sorted) {
      const rows = section.rows || [];
      // Si el escenario está encima (Y menor), la fila 0 es la más cercana.
      // Si está debajo, invertir el orden.
      const stageAbove = stageYCenter <= (section.y || 0);
      const indices = rows.map((_, i) => i);
      if (!stageAbove) indices.reverse();

      for (const idx of indices) {
        const group = findGroupInRow(rows[idx]?.seats || []);
        if (group.size > 0) return group;
      }
    }
    return new Set();
  }

  // Layout legado con grid
  if (data.grid?.length) {
    const { grid, rows } = data;
    const stageRows = new Set();
    grid.forEach((row, r) =>
      row.forEach((cell) => { if (cell?.tipo === CELL_TYPES.STAGE) stageRows.add(r); })
    );
    const stageAvgRow = stageRows.size
      ? [...stageRows].reduce((a, b) => a + b, 0) / stageRows.size
      : -Infinity;

    const rowIndices = Array.from({ length: rows }, (_, i) => i).sort(
      (a, b) => Math.abs(a - stageAvgRow) - Math.abs(b - stageAvgRow)
    );

    for (const r of rowIndices) {
      const group = findGroupInGridRow(grid[r]);
      if (group.size > 0) return group;
    }
    return new Set();
  }

  return new Set();
}

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

function getStageBounds(
  viewportWidth,
  viewportHeight,
  contentMinX,
  contentMinY,
  contentMaxX,
  contentMaxY,
  currentScale
) {
  const scaledMinX = contentMinX * currentScale;
  const scaledMinY = contentMinY * currentScale;
  const scaledMaxX = contentMaxX * currentScale;
  const scaledMaxY = contentMaxY * currentScale;

  // Límites duros al borde del contenedor (sin holgura extra):
  // - Si el contenido es más grande, se puede panear hasta tocar ambos bordes.
  // - Si es más pequeño, se puede mover de borde a borde dentro del viewport.
  const edgeLeftX = -scaledMinX;
  const edgeRightX = viewportWidth - scaledMaxX;
  const edgeTopY = -scaledMinY;
  const edgeBottomY = viewportHeight - scaledMaxY;

  return {
    minX: Math.min(edgeLeftX, edgeRightX),
    maxX: Math.max(edgeLeftX, edgeRightX),
    minY: Math.min(edgeTopY, edgeBottomY),
    maxY: Math.max(edgeTopY, edgeBottomY),
  };
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
  ownHeldSeatKeys = [],
  initialAvailability = null,
}) => {
  const { data, loading, error } = useMapData(layoutId, eventId, initialAvailability);

  const containerRef = useRef(null);
  const stageRef = useRef(null);

  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [fittedScale, setFittedScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const [popup, setPopup] = useState({ data: null, position: null });
  const lastSelectionPayloadRef = useRef('');

  // Set de claves propias del usuario para búsqueda O(1)
  const ownHeldKeysSet = useMemo(
    () => new Set(ownHeldSeatKeys.filter(Boolean)),
    [ownHeldSeatKeys]
  );

  // Dimensiones reales del contenido (sin márgenes extra). Se reusa en el
  // effect de centrado, en el Stage y en dragBoundFunc para mantener una única
  // fuente de verdad y evitar desfases visuales.
  const contentDims = useMemo(() => {
    if (!data) {
      return {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        contentWidth: 0,
        contentHeight: 0,
      };
    }

    let minLeft = Infinity;
    let minTop = Infinity;
    let maxRight = -Infinity;
    let maxBottom = -Infinity;

    (data.elements || []).forEach((el) => {
      const x = Number(el.x || 0);
      const y = Number(el.y || 0);
      const width = Number(el.width || 0);
      const height = Number(el.height || 0);
      minLeft = Math.min(minLeft, x);
      minTop = Math.min(minTop, y);
      maxRight = Math.max(maxRight, x + width);
      maxBottom = Math.max(maxBottom, y + height);
    });

    (data.sections || []).forEach((sec) => {
      // Debe coincidir con SectionShape.jsx para que el bounding box calculado
      // aquí refleje exactamente lo que se pinta en el Stage.
      const SECTION_PADDING = 14;
      const SEAT_SIZE = 16;
      const SECTION_HEADER_OFFSET = 18;
      const SEAT_LABEL_HEIGHT = 16;

      const rows = sec.rows || [];

      // Misma heurística que SectionShape: si ningún asiento trae coordenadas
      // reales, los indexamos por fila con CELL_SPACING (no por índice de seat).
      const shouldUseIndexedRowY = !rows.some((row, rowIndex) =>
        (row.seats || []).some((seat) => {
          const seatY = Number.isFinite(Number(seat.y))
            ? Number(seat.y)
            : rowIndex * CELL_SPACING;
          return Math.abs(seatY - rowIndex * CELL_SPACING) > 1;
        })
      );

      const seatCoords = rows.flatMap((row, rowIndex) =>
        (row.seats || []).map((seat, seatIndex) => {
          const seatXNum = Number(seat.x);
          const seatYNum = Number(seat.y);
          const x = Number.isFinite(seatXNum)
            ? seatXNum
            : seatIndex * CELL_SPACING;
          const y = shouldUseIndexedRowY
            ? rowIndex * CELL_SPACING
            : (Number.isFinite(seatYNum) ? seatYNum : rowIndex * CELL_SPACING);
          return { x, y };
        })
      );

      const maxSeatX = seatCoords.length
        ? Math.max(...seatCoords.map((s) => s.x))
        : 0;
      const maxSeatY = seatCoords.length
        ? Math.max(...seatCoords.map((s) => s.y))
        : 0;

      const secWidth =
        SECTION_PADDING * 2 + Math.max(SEAT_SIZE, maxSeatX + SEAT_SIZE);
      const secHeight =
        SECTION_PADDING * 2 +
        SECTION_HEADER_OFFSET +
        Math.max(SEAT_SIZE, maxSeatY + SEAT_SIZE) +
        SEAT_LABEL_HEIGHT;

      const secX = Number(sec.x || 0);
      const secY = Number(sec.y || 0);
      minLeft = Math.min(minLeft, secX);
      minTop = Math.min(minTop, secY);
      maxRight = Math.max(maxRight, secX + secWidth);
      maxBottom = Math.max(maxBottom, secY + secHeight);
    });

    const fallbackWidth = getGridWidth(data.cols);
    const fallbackHeight = getGridHeight(data.rows);

    // Márgenes compactos: prioridad a ocupar mejor ancho visible sin cortar
    // etiquetas laterales.
    const EDGE_MARGIN_X = 8;
    const EDGE_MARGIN_Y = 12;

    const hasExplicitBounds = Number.isFinite(minLeft)
      && Number.isFinite(minTop)
      && Number.isFinite(maxRight)
      && Number.isFinite(maxBottom)
      && maxRight > minLeft
      && maxBottom > minTop;

    const rawMinX = hasExplicitBounds ? minLeft : 0;
    const rawMinY = hasExplicitBounds ? minTop : 0;
    const rawMaxX = hasExplicitBounds ? maxRight : fallbackWidth;
    const rawMaxY = hasExplicitBounds ? maxBottom : fallbackHeight;

    const minX = rawMinX - EDGE_MARGIN_X;
    const minY = rawMinY - EDGE_MARGIN_Y;
    const maxX = rawMaxX + EDGE_MARGIN_X;
    const maxY = rawMaxY + EDGE_MARGIN_Y;

    return {
      minX,
      minY,
      maxX,
      maxY,
      contentWidth: maxX - minX,
      contentHeight: maxY - minY,
    };
  }, [data]);

  const {
    minX: contentMinX,
    minY: contentMinY,
    maxX: contentMaxX,
    maxY: contentMaxY,
  } = contentDims;

  // Tamaño del viewport del mapa = rect del contenedor canvas.
  // IMPORTANTE: no usar deps [] — en el primer render suele estar `loading`
  // y este div no existe; al terminar la carga el ref aparece pero el effect
  // ya corrió y nunca observa → el Stage se queda en el default 800×600.
  useEffect(() => {
    if (loading || error) return;
    const el = containerRef.current;
    if (!el) return;

    const applyRect = (width, height) => {
      if (width > 0 && height > 0) {
        setSize({ width, height });
      }
    };

    const observer = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) applyRect(cr.width, cr.height);
    });
    observer.observe(el);

    // Primera medición síncrona (ResizeObserver puede retrasar el callback)
    const rect = el.getBoundingClientRect();
    applyRect(rect.width, rect.height);

    // Un frame extra: el padre flex a veces aún no ha repartido altura en el
    // mismo commit en que aparece `data`.
    const raf = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      applyRect(r.width, r.height);
    });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [loading, error, data]);

  // Agregar wheel listener con passive: false para permitir preventDefault
  useEffect(() => {
    if (loading || error || !data) return;
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const scaleBy = 1.1;
      const direction = e.deltaY > 0 ? -1 : 1;
      setScale((prevScale) => {
        const newScale = Math.max(0.3, Math.min(3, prevScale * Math.pow(scaleBy, direction)));
        setStagePos((prevPos) => {
          const viewportCenterX = size.width / 2;
          const viewportCenterY = size.height / 2;
          const ratio = newScale / prevScale;

          // Mantener estable el punto visual del centro al hacer zoom.
          const rawX = viewportCenterX - (viewportCenterX - prevPos.x) * ratio;
          const rawY = viewportCenterY - (viewportCenterY - prevPos.y) * ratio;

          const bounds = getStageBounds(
            size.width,
            size.height,
            contentMinX,
            contentMinY,
            contentMaxX,
            contentMaxY,
            newScale
          );

          return {
            x: Math.max(bounds.minX, Math.min(bounds.maxX, rawX)),
            y: Math.max(bounds.minY, Math.min(bounds.maxY, rawY)),
          };
        });
        return newScale;
      });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [
    loading,
    error,
    data,
    size.width,
    size.height,
    contentMinX,
    contentMinY,
    contentMaxX,
    contentMaxY,
  ]);

  // Garantiza que cambios de viewport/layout no dejen el stage fuera de bounds.
  useEffect(() => {
    if (!data || size.width === 0 || size.height === 0) return;
    const bounds = getStageBounds(
      size.width,
      size.height,
      contentMinX,
      contentMinY,
      contentMaxX,
      contentMaxY,
      scale
    );
    setStagePos((prev) => {
      const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, prev.x));
      const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, prev.y));
      if (clampedX === prev.x && clampedY === prev.y) return prev;
      return { x: clampedX, y: clampedY };
    });
  }, [
    data,
    size.width,
    size.height,
    scale,
    contentMinX,
    contentMinY,
    contentMaxX,
    contentMaxY,
  ]);

  // Calcular escala de ajuste y posición inicial centrada.
  // Si el contenido es más grande que el viewport, fitScale lo reduce para que
  // entre completo — así no quedan secciones cortadas al entrar a la página.
  useEffect(() => {
    if (!data || size.width === 0 || size.height === 0) return;
    const { minX, minY, maxX, maxY, contentWidth, contentHeight } = contentDims;
    if (contentWidth === 0 || contentHeight === 0) return;

    // Tope de 1.6 para que contenidos pequeños crezcan y llenen el viewport,
    // evitando vacío excesivo al entrar a la página.
    const fitScale = Math.min(
      size.width / contentWidth,
      size.height / contentHeight,
      1.6
    );

    const centeredX = (size.width - contentWidth * fitScale) / 2 - minX * fitScale;
    const centeredY = (size.height - contentHeight * fitScale) / 2 - minY * fitScale;
    const bounds = getStageBounds(
      size.width,
      size.height,
      minX,
      minY,
      maxX,
      maxY,
      fitScale
    );
    const offsetX = Math.max(bounds.minX, Math.min(bounds.maxX, centeredX));
    const offsetY = Math.max(bounds.minY, Math.min(bounds.maxY, centeredY));

    queueMicrotask(() => {
      setScale(fitScale);
      setFittedScale(fitScale);
      setStagePos({ x: offsetX, y: offsetY });
    });
  }, [data, size, contentDims]);

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
            highlighted: highlightedIds.has(seat.id),
            status: isOwnHeld ? 'libre' : seat.status,
          };
        }),
      })),
      x: Number(section.x || 0),
      y: Number(section.y || 0),
    }));
  }, [data, selectedIds, highlightedIds, ownHeldKeysSet]);

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

  const handleRecommend = useCallback(() => {
    const result = findRecommendedSeats(data);
    setHighlightedIds(result);
  }, [data]);

  const clearHighlight = useCallback(() => setHighlightedIds(new Set()), []);

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

  // El layout moderno (sections + elements) ya pinta sus asientos dentro de
  // <SectionShape>. El grid legado sólo debe renderizarse cuando no existe
  // layout moderno; de lo contrario aparecerían asientos duplicados (un
  // círculo extra enfrente de cada asiento real).
  const useLegacyGrid = sections.length === 0;
  const stageGroups = elements.length === 0 && useLegacyGrid
    ? groupStages(grid, rows, cols)
    : [];
  const showGridGuides = !usesSnapshotLayout && useLegacyGrid;

  // Leyenda de zonas únicas
  const uniqueZones = Object.values(zonesMap);

  return (
    <div className="flex flex-col gap-4 w-full h-full min-h-0">
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
          {highlightedIds.size > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: COLORS.SEAT_HIGHLIGHTED }}
              />
              <span>Recomendados</span>
            </div>
          )}
        </div>
      )}

      {/* Canvas — el fondo único del mapa se pinta aquí (en el DOM). El Stage
          va encima transparente, así el "tablero" ocupa siempre el 100% del
          viewport y los elementos (escenario/secciones) flotan sobre él. */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          minHeight: 0,
          backgroundColor: COLORS.GRID_BACKGROUND,
          borderRadius: '12px',
          overflow: 'hidden',
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
          onDragEnd={(e) => {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }}
          dragBoundFunc={(pos) => {
            const bounds = getStageBounds(
              size.width,
              size.height,
              contentMinX,
              contentMinY,
              contentMaxX,
              contentMaxY,
              scale
            );

            return {
              x: Math.max(bounds.minX, Math.min(bounds.maxX, pos.x)),
              y: Math.max(bounds.minY, Math.min(bounds.maxY, pos.y)),
            };
          }}
          onDblClick={toggleScale}
          onDblTap={toggleScale}
          scaleX={scale}
          scaleY={scale}
        >
          <Layer>
            {/* Sin Rect de fondo: el "tablero" lo pinta el div contenedor a
                nivel DOM, así siempre ocupa 100% del Card y no se ve como un
                recuadro chico dentro de un recuadro grande. */}

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

            {/* Asientos del grid legado — sólo cuando NO hay sections, para
                evitar duplicar los asientos que ya pinta <SectionShape>. */}
            {useLegacyGrid && grid.flatMap((row, r) =>
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
                    isHighlighted={highlightedIds.has(cell.id)}
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

        <div
          style={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            zIndex: 5,
            pointerEvents: 'none',
            background: 'rgba(15, 23, 42, 0.78)',
            color: '#f8fafc',
            fontSize: 12,
            padding: '8px 10px',
            borderRadius: 10,
            letterSpacing: '0.01em',
          }}
        >
          Arrastra para mover · Rueda para zoom
        </div>

          {allowSelection && (
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button
                onClick={handleRecommend}
                className="bg-accent text-white px-4 py-2 rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer text-sm font-medium"
              >
                Recomendar asientos
              </button>
              {highlightedIds.size > 0 && (
                <button
                  onClick={clearHighlight}
                  className="bg-white text-slate-700 border border-slate-300 px-3 py-2 rounded-lg shadow-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 cursor-pointer text-sm font-medium"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}

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
  initialAvailability: PropTypes.array,
};

export default MapaAsientos;