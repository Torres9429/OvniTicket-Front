import { useState, useEffect, useCallback } from 'react';
import { getLayout } from '../../services/layouts.api';
import { getGridCellsByLayout } from '../../services/gridCells.api';
import { getZones } from '../../services/zonas.api';
import { getAvailability } from '../../services/asientos.api';
import { getZoneEventPrices } from '../../services/precioZonaEvento.api';
import { CELL_TYPES, CELL_SPACING } from './constantes';

/**
 * Construye un mapa (row-col) → label de asiento a partir del snapshot layout_data.
 * Devuelve etiquetas relativas a la sección (e.g. "1", "2", "A1").
 */
function buildSeatLabelLookup(snapshotData) {
  const lookup = {};
  if (!snapshotData?.sections) return lookup;
  snapshotData.sections.forEach((section) => {
    const startRow = Math.max(0, Math.round((section.y || 0) / CELL_SPACING));
    const startCol = Math.max(0, Math.round((section.x || 0) / CELL_SPACING));
    (section.rows || []).forEach((row, rowIdx) => {
      const rowLabel = row.label || String.fromCodePoint(65 + rowIdx);
      (row.seats || []).forEach((seat, seatIdx) => {
        const key = `${startRow + rowIdx}-${startCol + seatIdx}`;
        const seatLabel = seat.label || String(seatIdx + 1);
        lookup[key] = { display: seatLabel, full: `${rowLabel}${seatLabel}` };
      });
    });
  });
  return lookup;
}

/**
 * Extrae secciones del snapshot layout_data y les asigna el color de zona correspondiente.
 */
function extractSectionsFromSnapshot(snapshotData) {
  if (!snapshotData?.sections) return [];
  const localZoneColorMap = {};
  (snapshotData.zones || []).forEach((z) => {
    if (z.id != null && z.color) localZoneColorMap[String(z.id)] = z.color;
  });
  return snapshotData.sections.map((section) => ({
    ...section,
    zoneColor:
      section.zoneId != null
        ? localZoneColorMap[String(section.zoneId)] || '#4a197f'
        : '#4a197f',
  }));
}

/**
 * Transforma datos crudos del backend en estructura de grid renderizable.
 *
 * @param {Object} layout           - { id_layout, grid_rows, grid_cols, ... }
 * @param {Array}  cells            - [{ id_grid_cells, tipo, row, col, id_zona, id_layout }]
 * @param {Array}  zones            - [{ id_zona, nombre, color }]
 * @param {Object} availability     - Map of id_grid_cell -> estado ('disponible'|'retenido'|'vendido')
 * @param {Array}  prices           - [{ id_precio_zona_evento, precio, id_zona, id_evento }]
 * @param {Object} seatLabelLookup  - Map de "row-col" → { display, full }
 * @returns {{ grid, zonesMap, rows, cols }}
 */
function transformData(layout, cells, zones, availability = {}, prices = [], seatLabelLookup = {}) {
  const zonesMap = {};
  zones.forEach((z) => {
    zonesMap[z.id_zona] = z;
  });

  const pricesMap = {};
  prices.forEach((p) => {
    pricesMap[p.id_zona] = p.precio;
  });

  const rows = layout.grid_rows;
  const cols = layout.grid_cols;

  // Crear grid vacío
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );

  // Llenar grid con celdas
  cells.forEach((cell) => {
    const { row, col } = cell;
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      const zone = zonesMap[cell.id_zona] || null;
      const isSeat = cell.tipo === CELL_TYPES.SEAT_ZONE;
      const cellId = `celda-${cell.id_grid_cells}`;

      // Map backend estado to display status
      const backendStatus = availability[cell.id_grid_cells];
      let status = 'libre';
      if (isSeat && backendStatus) {
        if (backendStatus === 'vendido') status = 'reservado';
        else if (backendStatus === 'retenido') status = 'retenido';
        else status = 'libre';
      }

      const labelData = isSeat ? seatLabelLookup[`${row}-${col}`] : null;
      const priceVal = zone ? pricesMap[cell.id_zona] ?? null : null;

      grid[row][col] = {
        id: cellId,
        // Campo real + alias para compatibilidad con PaginaDetalleEvento / PaginaCheckout
        cellId: cell.id_grid_cells,
        idCelda: cell.id_grid_cells,
        tipo: cell.tipo,
        row,
        col,
        zoneId: cell.id_zona,
        zoneName: zone?.nombre || null,
        nombreZona: zone?.nombre || null,
        zoneColor: zone?.color || null,
        price: priceVal,
        precio: priceVal,
        // label completo para el popup; displayLabel corto para el círculo
        label: labelData?.full ?? (isSeat ? `F${row + 1}-C${col + 1}` : null),
        displayLabel: labelData?.display ?? null,
        estatus: status,
      };
    }
  });

  return { grid, zonesMap, pricesMap, rows, cols };
}

/**
 * Hook para obtener y transformar los datos del mapa de asientos.
 *
 * @param {number} layoutId - ID del layout a renderizar
 * @param {number|null} eventId - ID del evento (para saber qué asientos están reservados)
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
      const [layoutRes, cellsRes, zonesRes] = await Promise.all([
        getLayout(layoutId),
        getGridCellsByLayout(layoutId),
        getZones(),
      ]);

      const layout = layoutRes;
      const cells = cellsRes;
      const layoutZones = (zonesRes || []).filter(
        (z) => z.id_layout === Number(layoutId)
      );

      let availability = {};
      let prices = [];

      if (eventId) {
        const [availRes, pricesRes] = await Promise.all([
          getAvailability(eventId).catch(() => []),
          getZoneEventPrices().catch(() => []),
        ]);
        // Build lookup: id_grid_cell -> estado
        (availRes || []).forEach((item) => {
          availability[item.id_grid_cell] = item.estado;
        });
        prices = (pricesRes || []).filter(
          (p) => p.id_evento === Number(eventId)
        );
      }

      // Extraer estructura de secciones y elementos del snapshot guardado
      const snapshotData = layout.layout_data || {};
      const seatLabelLookup = buildSeatLabelLookup(snapshotData);
      const sections = extractSectionsFromSnapshot(snapshotData);
      const elements = Array.isArray(snapshotData.elements) ? snapshotData.elements : [];

      const result = transformData(layout, cells, layoutZones, availability, prices, seatLabelLookup);
      setData({ ...result, sections, elements });
    } catch (err) {
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
