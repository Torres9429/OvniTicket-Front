import { useState, useEffect, useCallback } from 'react';
import { getLayout } from '../../services/layouts.api';
import { getGridCellsByLayout } from '../../services/gridCells.api';
import { getZones } from '../../services/zonas.api';
import { getAvailability } from '../../services/asientos.api';
import { getZoneEventPrices } from '../../services/precioZonaEvento.api';
import { CELL_TYPES } from './constantes';

/**
 * Transforma datos crudos del backend en estructura de grid renderizable.
 *
 * @param {Object} layout         - { id_layout, grid_rows, grid_cols, ... }
 * @param {Array}  cells          - [{ id_grid_cells, tipo, row, col, id_zona, id_layout }]
 * @param {Array}  zones          - [{ id_zona, nombre, color }]
 * @param {Object} availability   - Map of id_grid_cell -> estado ('disponible'|'retenido'|'vendido')
 * @param {Array}  prices         - [{ id_precio_zona_evento, precio, id_zona, id_evento }]
 * @returns {{ grid, zonesMap, rows, cols }}
 */
function transformData(layout, cells, zones, availability = {}, prices = []) {
  const layoutData = layout?.layout ?? layout;
  const layoutCells = Array.isArray(cells?.celdas) ? cells.celdas : cells;
  const layoutZonesInput = Array.isArray(zones?.zonas) ? zones.zonas : zones;

  const zonesMap = {};
  (layoutZonesInput || []).forEach((z) => {
    zonesMap[z.id_zona] = z;
  });

  const pricesMap = {};
  (Array.isArray(prices?.resultados) ? prices.resultados : prices || []).forEach((p) => {
    pricesMap[p.id_zona] = p.precio;
  });

  const rows = layoutData.grid_rows;
  const cols = layoutData.grid_cols;

  // Crear grid vacío
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );

  // Llenar grid con celdas
  (layoutCells || []).forEach((cell) => {
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
        // else keep default 'libre'
      }

      grid[row][col] = {
        id: cellId,
        cellId: cell.id_grid_cells,
        idCelda: cell.id_grid_cells,
        tipo: cell.tipo,
        row,
        col,
        zoneId: cell.id_zona,
        zoneName: zone?.nombre || null,
        zoneColor: zone?.color || null,
        price: zone ? pricesMap[cell.id_zona] || null : null,
        label: isSeat ? `F${row + 1}-C${col + 1}` : null,
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

      const layout = layoutRes?.layout ?? layoutRes;
      const cells = cellsRes?.celdas ?? cellsRes ?? [];
      const zonesList = zonesRes?.zonas ?? zonesRes ?? [];
      const layoutZones = (zonesList || []).filter(
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
        (availRes?.disponibilidad || availRes || []).forEach((item) => {
          availability[item.id_grid_cell] = item.estado;
        });
        prices = (pricesRes?.precios || pricesRes || []).filter(
          (p) => p.id_evento === Number(eventId)
        );
      }

      const result = transformData(layout, cells, layoutZones, availability, prices);
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