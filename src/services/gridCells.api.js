import { apiClient } from './api';

/** Listar todas las celdas */
export const getGridCells = () => apiClient.get('/grid-cells/');

/** Obtener una celda por ID */
export const getGridCell = (id) => apiClient.get(`/grid-cells/${id}/`);

/** Crear celda */
export const createGridCell = (data) => apiClient.post('/grid-cells/', data);

/** Actualizar celda completa */
export const updateGridCell = (id, data) => apiClient.put(`/grid-cells/${id}/`, data);

/** Actualizar celda parcial */
export const patchGridCell = (id, data) => apiClient.patch(`/grid-cells/${id}/`, data);

/** Eliminar celda */
export const deleteGridCell = (id) => apiClient.delete(`/grid-cells/${id}/`);

/**
 * Sincronizar celdas de un layout (elimina existentes y crea nuevas en una sola petición).
 * @param {number} layoutId
 * @param {Array<{tipo: string, row: number, col: number, id_zona: number|null}>} cells
 */
export const syncGridCells = (layoutId, cells) =>
	apiClient.post('/grid-cells/sync/', { id_layout: layoutId, celdas: cells });

/** Obtener celdas por layout */
export const getGridCellsByLayout = (layoutId) => apiClient.get(`/grid-cells/por-layout/${layoutId}/`);
