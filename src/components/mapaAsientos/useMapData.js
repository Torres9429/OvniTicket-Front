import { useState, useEffect, useCallback } from 'react';
import { getLayout } from '../../services/layouts.api';
import { getZones } from '../../services/zonas.api';
import { getAvailability } from '../../services/asientos.api';
import { getZoneEventPrices } from '../../services/precioZonaEvento.api';
import { CELL_SPACING, CELL_TYPES } from './constantes';

function buildLayoutSeatKey(row, col, zoneId) {
  const zone = zoneId == null ? 0 : Number(zoneId);
  return `${Number(row)}:${Number(col)}:${zone}`;
}

function parseNumberLike(value, fallback = 0) {
  if (value == null) return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeElementType(rawType) {
  const t = String(rawType || '').trim().toLowerCase();
  if (t === 'aisle' || t === 'pasillo') return 'aisle';
  return 'stage';
}

function toDisplaySeatStatus(backendStatus) {
  if (backendStatus === 'vendido') return 'reservado';
  if (backendStatus === 'retenido') return 'retenido';
  return 'libre';
}

function enrichSnapshotZones(snapshotZones = [], backendZones = []) {
  const backendByName = new Map(
    (backendZones || [])
      .filter((z) => z?.nombre)
      .map((z) => [String(z.nombre).trim().toLowerCase(), z])
  );

  return (snapshotZones || []).map((zone) => {
    const backendId = zone?.idBackend ?? zone?.id_zona ?? null;
    if (backendId != null) {
      return { ...zone, idBackend: Number(backendId) };
    }

    const byName = zone?.nombre
      ? backendByName.get(String(zone.nombre).trim().toLowerCase())
      : null;

    if (byName?.id_zona != null) {
      return {
        ...zone,
        idBackend: Number(byName.id_zona),
        id_zona: Number(byName.id_zona),
      };
    }

    return zone;
  });
}

function buildZoneLookups(zonesInput = []) {
  const zonesByAnyId = new Map();
  const zonesByName = new Map();

  (zonesInput || []).forEach((zone) => {
    const backendId = zone?.idBackend ?? zone?.id_zona ?? null;
    const localId = zone?.id ?? null;
    const name = zone?.nombre ? String(zone.nombre).trim().toLowerCase() : null;

    if (localId != null) {
      zonesByAnyId.set(String(localId), zone);
    }
    if (backendId != null) {
      zonesByAnyId.set(String(backendId), zone);
    }
    if (name) {
      zonesByName.set(name, zone);  // Fallback: buscar por nombre
    }
  });

  return { zonesByAnyId, zonesByName };
}

function toGridIndex(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed / CELL_SPACING));
}

function buildSeatCellsFromLayoutData(
  layoutData,
  zonesInput,
  availabilityBySeatKey,
  pricesMap,
) {
  const generatedCells = [];
  const { zonesByAnyId } = buildZoneLookups(zonesInput);

  (layoutData?.sections || []).forEach((section, sectionIdx) => {
    const sectionRows = Array.isArray(section?.rows) ? section.rows : [];
    const sectionBaseRow = toGridIndex(section?.y, 0);
    const sectionBaseCol = toGridIndex(section?.x, 0);
    const zone = zonesByAnyId.get(String(section?.zoneId ?? '')) || null;
    const backendZoneId = zone?.idBackend ?? zone?.id_zona ?? zone?.id ?? null;

    sectionRows.forEach((row, rowIdx) => {
      const seats = Array.isArray(row?.seats) ? row.seats : [];
      seats.forEach((seat, seatIdx) => {
        // Importante: grid_cells se sincroniza por índice de fila/asiento, no por seat.x/seat.y.
        // Usar índices evita desalineación entre render visual y coordenadas de compra/retención.
        const rowOffset = rowIdx;
        const colOffset = seatIdx;
        const rowIndex = sectionBaseRow + rowOffset;
        const colIndex = sectionBaseCol + colOffset;

        // Formato compacto de label: "A-1"
        const rowLabel = row?.label || String(rowIdx + 1);
        const seatLabel = seat?.label || String(seatIdx + 1);

        generatedCells.push({
          id: `seat-${section?.id || sectionIdx}-${row?.id || rowIdx}-${seat?.id || seatIdx}`,
          cellId: null,
          idCelda: null,
          tipo: CELL_TYPES.SEAT_ZONE,
          row: rowIndex,
          col: colIndex,
          zoneId: backendZoneId,
          zoneName: zone?.nombre || null,
          zoneColor: zone?.color || null,
          price: backendZoneId != null ? pricesMap[backendZoneId] ?? null : null,
          label: `${rowLabel}-${seatLabel}`,  // Compacto: "A-1"
          estatus:
            availabilityBySeatKey[
              buildLayoutSeatKey(rowIndex, colIndex, backendZoneId)
            ] || 'libre',
        });
      });
    });
  });

  return generatedCells;
}

function buildRenderableSectionsFromLayoutData(
  layoutData,
  zonesInput,
  availabilityBySeatKey,
  pricesMap = {},
) {
  const { zonesByAnyId, zonesByName } = buildZoneLookups(zonesInput);

  return (layoutData?.sections || []).map((section, sectionIdx) => {
    const sectionRows = Array.isArray(section?.rows) ? section.rows : [];
    const sectionBaseRow = toGridIndex(section?.y, 0);
    const sectionBaseCol = toGridIndex(section?.x, 0);

    // Buscar zona por ID, sino por nombre (fallback)
    let zone = zonesByAnyId.get(String(section?.zoneId ?? '')) || null;
    if (!zone && section?.nombre) {
      zone = zonesByName.get(String(section.nombre).trim().toLowerCase()) || null;
    }

    const backendZoneId = zone?.idBackend ?? zone?.id_zona ?? zone?.id ?? null;

    const rows = sectionRows.map((row, rowIdx) => ({
      ...row,
      seats: (row?.seats || []).map((seat, seatIdx) => {
        // Mantener paridad con layoutToGridSnapshot del editor.
        const rowOffset = rowIdx;
        const colOffset = seatIdx;
        const rowIndex = sectionBaseRow + rowOffset;
        const colIndex = sectionBaseCol + colOffset;
        const seatKey = buildLayoutSeatKey(rowIndex, colIndex, backendZoneId);

        // Formato compacto de label: "A-1"
        const rowLabel = row?.label || String(rowIdx + 1);
        const seatLabel = seat?.label || String(seatIdx + 1);
        const zoneName = zone?.nombre || section?.zoneName || null;
        const zoneColor = zone?.color || section?.zoneColor || null;
        const price = pricesMap[backendZoneId] ?? null;

        return {
          ...seat,
          id: seat?.id || `seat-${section?.id || sectionIdx}-${rowIdx}-${seatIdx}`,
          row: rowIndex,
          col: colIndex,
          zoneId: backendZoneId,
          zoneName,  // Nombre de la zona
          zoneColor,  // Color de la zona
          price,  // Precio de la zona
          label: `${rowLabel}-${seatLabel}`,  // Compacto: "A-1"
          seatKey,  // Identificador único para pre-selección tras recarga
          rowLabel,  // Para mostrar "A1" en el mapa
          status: availabilityBySeatKey[seatKey] || 'libre',
        };
      }),
    }));

    return {
      ...section,
      id: section?.id || `section-${sectionIdx}`,
      nombre: section?.nombre || `Sección ${sectionIdx + 1}`,
      zoneId: backendZoneId ?? section?.zoneId ?? null,
      zoneColor: zone?.color || section?.zoneColor || null,
      rows,
      numRows: rows.length,
      seatsPerRow: rows[0]?.seats?.length || 0,
    };
  });
}

function buildElementCellsFromLayoutData(layoutData) {
  const generatedCells = [];

  (layoutData?.elements || []).forEach((element, elementIdx) => {
    const tipo = element?.type === 'aisle' ? CELL_TYPES.AISLE : CELL_TYPES.STAGE;
    const baseRow = toGridIndex(element?.y, 0);
    const baseCol = toGridIndex(element?.x, 0);
    const rowCount = Math.max(1, Math.round((Number(element?.height) || CELL_SPACING) / CELL_SPACING));
    const colCount = Math.max(1, Math.round((Number(element?.width) || CELL_SPACING) / CELL_SPACING));

    for (let r = 0; r < rowCount; r += 1) {
      for (let c = 0; c < colCount; c += 1) {
        generatedCells.push({
          id: `element-${element?.id || elementIdx}-${r}-${c}`,
          cellId: null,
          idCelda: null,
          tipo,
          row: baseRow + r,
          col: baseCol + c,
          zoneId: null,
          zoneName: null,
          zoneColor: null,
          price: null,
          label: null,
          estatus: 'libre',
        });
      }
    }
  });

  return generatedCells;
}

function buildRenderableElementsFromLayoutData(layoutData) {
  return (layoutData?.elements || []).map((element, idx) => ({
    id: element?.id || `el-${idx}`,
    type: normalizeElementType(element?.type || element?.tipo),
    x: parseNumberLike(element?.x ?? element?.left, 0),
    y: parseNumberLike(element?.y ?? element?.top, 0),
    width: (() => {
      const raw = parseNumberLike(element?.width ?? element?.w ?? element?.size?.width, 0);
      if (normalizeElementType(element?.type || element?.tipo) === 'aisle') {
        return Math.max(36, raw || 36);
      }
      if (raw <= CELL_SPACING * 1.5) return 260;
      return Math.max(1, raw || 260);
    })(),
    height: (() => {
      const raw = parseNumberLike(element?.height ?? element?.h ?? element?.size?.height, 0);
      if (normalizeElementType(element?.type || element?.tipo) === 'aisle') {
        return Math.max(220, raw || 220);
      }
      if (raw <= CELL_SPACING * 1.5) return 64;
      return Math.max(1, raw || 64);
    })(),
    rotation: parseNumberLike(element?.rotation ?? element?.angle, 0),
  }));
}

function buildGridFromCells(cells = [], baseRows = 0, baseCols = 0) {
  const maxRow = cells.reduce((acc, cell) => Math.max(acc, cell.row), -1);
  const maxCol = cells.reduce((acc, cell) => Math.max(acc, cell.col), -1);
  const rows = Math.max(Number(baseRows) || 0, maxRow + 1, 1);
  const cols = Math.max(Number(baseCols) || 0, maxCol + 1, 1);

  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
  cells.forEach((cell) => {
    if (cell.row >= 0 && cell.row < rows && cell.col >= 0 && cell.col < cols) {
      grid[cell.row][cell.col] = cell;
    }
  });

  return { grid, rows, cols };
}

/**
 * Transforma datos crudos del backend en estructura de grid renderizable.
 *
 * @param {Object} layout         - { id_layout, grid_rows, grid_cols, ... }
 * @param {Array}  zones          - [{ id_zona, nombre, color }]
 * @param {Array}  prices         - [{ id_precio_zona_evento, precio, id_zona, id_evento }]
 * @returns {{ grid, zonesMap, rows, cols, elements, sections }}
 */
function transformData(layout, zones, availabilityBySeatKey = {}, prices = []) {
  const layoutData = layout?.layout ?? layout;
  const layoutSnapshot = layoutData?.layout_data || null;
  const layoutZonesInput = Array.isArray(zones?.zonas) ? zones.zonas : zones;
  const snapshotZones = enrichSnapshotZones(
    layoutSnapshot?.zones || [],
    layoutZonesInput,
  );

  const zonesMap = {};
  (layoutZonesInput || []).forEach((z) => {
    const key = z.id_zona ?? z.idBackend ?? z.id;
    if (key != null) {
      zonesMap[key] = z;
    }
  });

  const pricesMap = {};
  (prices || []).forEach((p) => {
    pricesMap[Number(p.id_zona)] = Number(p.precio);
  });


  // Nuevo flujo: renderizar desde JSON del editor guardado en layout_data.
  if (layoutSnapshot && Array.isArray(layoutSnapshot.sections) && Array.isArray(layoutSnapshot.elements)) {
    const elements = buildRenderableElementsFromLayoutData(layoutSnapshot);
    const sections = buildRenderableSectionsFromLayoutData(
      layoutSnapshot,
      snapshotZones.length > 0 ? snapshotZones : layoutZonesInput,
      availabilityBySeatKey,
      pricesMap,
    );
    const seatCells = buildSeatCellsFromLayoutData(
      layoutSnapshot,
      snapshotZones.length > 0 ? snapshotZones : layoutZonesInput,
      availabilityBySeatKey,
      pricesMap,
    );
    const elementCells = buildElementCellsFromLayoutData(layoutSnapshot);
    const { grid, rows, cols } = buildGridFromCells(
      [...elementCells, ...seatCells],
      layoutData?.grid_rows,
      layoutData?.grid_cols,
    );
    return {
      grid,
      zonesMap,
      pricesMap,
      rows,
      cols,
      elements,
      sections,
      usesSnapshotLayout: true,
      canvasWidth: parseNumberLike(layoutSnapshot?.canvasWidth, null),
      canvasHeight: parseNumberLike(layoutSnapshot?.canvasHeight, null),
    };
  }

  const rows = layoutData.grid_rows;
  const cols = layoutData.grid_cols;

  // Crear grid vacío
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );

  // Fallback mínimo cuando no hay snapshot válido.
  return {
    grid,
    zonesMap,
    pricesMap,
    rows,
    cols,
    elements: [],
    sections: [],
    usesSnapshotLayout: false,
    canvasWidth: null,
    canvasHeight: null,
  };
}

/**
 * Hook para obtener y transformar los datos del mapa de asientos.
 *
 * @param {number} layoutId - ID del layout a renderizar
 * @param {number|null} eventId - ID del evento (para precios por zona del evento)
 */
export default function useMapData(layoutId, eventId = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!layoutId) return;
    setLoading(true);
    setError(null);

    try {
      const [layoutRes, zonesRes] = await Promise.all([
        getLayout(layoutId),
        getZones(),
      ]);

      const layout = layoutRes?.layout ?? layoutRes;
      const zonesList = zonesRes?.zonas ?? zonesRes ?? [];
      const layoutZones = (zonesList || []).filter(
        (z) => z.id_layout === Number(layoutId)
      );

      let prices = [];
      let availabilityBySeatKey = {};

      if (eventId) {
        const [availabilityRes, pricesRes] = await Promise.all([
          getAvailability(eventId).catch(() => []),
          getZoneEventPrices().catch(() => []),
        ]);
        (availabilityRes?.disponibilidad || availabilityRes || []).forEach((item) => {
          const key = item?.seat_key || buildLayoutSeatKey(item?.row, item?.col, item?.zone_id);
          if (item?.estado && key) {
            availabilityBySeatKey[key] = toDisplaySeatStatus(item.estado);
          }
        });
        // Filtrar precios por evento: pricesRes es un array directo del API
        const allPrices = Array.isArray(pricesRes) ? pricesRes : (pricesRes?.resultados || []);
        prices = allPrices.filter(
          (p) => Number(p.id_evento) === Number(eventId)
        );
      }

      const result = transformData(layout, layoutZones, availabilityBySeatKey, prices);
      setData(result);
    } catch (err) {
      console.error('Error cargando datos del mapa:', err);
      setError(err.message || 'Error al cargar el mapa');
    } finally {
      setLoading(false);
    }
  }, [layoutId, eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, reload: loadData };
}