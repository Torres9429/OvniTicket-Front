import { useState, useEffect, useCallback } from 'react';
import { obtenerLayout } from '../../services/layouts.api';
import { obtenerGridCellsPorLayout } from '../../services/gridCells.api';
import { obtenerZonas } from '../../services/zonas.api';
import { obtenerDisponibilidad } from '../../services/asientos.api';
import { obtenerPreciosZonaEvento } from '../../services/precioZonaEvento.api';
import { TIPOS_CELDA } from './constantes';

/**
 * Transforma datos crudos del backend en estructura de grid renderizable.
 *
 * @param {Object} layout         - { id_layout, grid_rows, grid_cols, ... }
 * @param {Array}  celdas         - [{ id_grid_cells, tipo, row, col, id_zona, id_layout }]
 * @param {Array}  zonas          - [{ id_zona, nombre, color }]
 * @param {Object} disponibilidad - Map of id_grid_cell -> estado ('disponible'|'retenido'|'vendido')
 * @param {Array}  precios        - [{ id_precio_zona_evento, precio, id_zona, id_evento }]
 * @returns {{ grid, zonasMap, rows, cols }}
 */
function transformarDatos(layout, celdas, zonas, disponibilidad = {}, precios = []) {
  const zonasMap = {};
  zonas.forEach((z) => {
    zonasMap[z.id_zona] = z;
  });

  const preciosMap = {};
  precios.forEach((p) => {
    preciosMap[p.id_zona] = p.precio;
  });

  const rows = layout.grid_rows;
  const cols = layout.grid_cols;

  // Crear grid vacío
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );

  // Llenar grid con celdas
  celdas.forEach((celda) => {
    const { row, col } = celda;
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      const zona = zonasMap[celda.id_zona] || null;
      const esAsiento = celda.tipo === TIPOS_CELDA.ZONA_ASIENTOS;
      const idCelda = `celda-${celda.id_grid_cells}`;

      // Map backend estado to display estatus
      const estadoBackend = disponibilidad[celda.id_grid_cells];
      let estatus = 'libre';
      if (esAsiento && estadoBackend) {
        if (estadoBackend === 'vendido') estatus = 'reservado';
        else if (estadoBackend === 'retenido') estatus = 'retenido';
        else estatus = 'libre';
      }

      grid[row][col] = {
        id: idCelda,
        idCelda: celda.id_grid_cells,
        tipo: celda.tipo,
        row,
        col,
        idZona: celda.id_zona,
        nombreZona: zona?.nombre || null,
        colorZona: zona?.color || null,
        precio: zona ? preciosMap[celda.id_zona] || null : null,
        label: esAsiento ? `F${row + 1}-C${col + 1}` : null,
        estatus,
      };
    }
  });

  return { grid, zonasMap, preciosMap, rows, cols };
}

/**
 * Hook para obtener y transformar los datos del mapa de asientos.
 *
 * @param {number} idLayout - ID del layout a renderizar
 * @param {number|null} idEvento - ID del evento (para saber qué asientos están reservados)
 */
export default function useDatosMapa(idLayout, idEvento = null) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargarDatos = useCallback(async () => {
    if (!idLayout) return;
    setCargando(true);
    setError(null);

    try {
      const [layoutRes, celdasRes, zonasRes] = await Promise.all([
        obtenerLayout(idLayout),
        obtenerGridCellsPorLayout(idLayout),
        obtenerZonas(),
      ]);

      const layout = layoutRes;
      const celdas = celdasRes;
      const zonasLayout = (zonasRes || []).filter(
        (z) => z.id_layout === Number(idLayout)
      );

      let disponibilidad = {};
      let precios = [];

      if (idEvento) {
        const [dispRes, preciosRes] = await Promise.all([
          obtenerDisponibilidad(idEvento).catch(() => []),
          obtenerPreciosZonaEvento().catch(() => []),
        ]);
        // Build lookup: id_grid_cell -> estado
        (dispRes || []).forEach((item) => {
          disponibilidad[item.id_grid_cell] = item.estado;
        });
        precios = (preciosRes || []).filter(
          (p) => p.id_evento === Number(idEvento)
        );
      }

      const resultado = transformarDatos(layout, celdas, zonasLayout, disponibilidad, precios);
      setDatos(resultado);
    } catch (err) {
      console.error('Error cargando datos del mapa:', err);
      setError(err.message || 'Error al cargar el mapa');
    } finally {
      setCargando(false);
    }
  }, [idLayout, idEvento]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return { datos, cargando, error, recargar: cargarDatos };
}
