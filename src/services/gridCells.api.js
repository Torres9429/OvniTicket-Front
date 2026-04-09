import { clienteApi } from './api';

/** Listar todas las celdas */
export const obtenerGridCells = () => clienteApi.get('/grid-cells/');

/** Obtener una celda por ID */
export const obtenerGridCell = (id) => clienteApi.get(`/grid-cells/${id}/`);

/** Crear celda */
export const crearGridCell = (datos) => clienteApi.post('/grid-cells/', datos);

/** Actualizar celda completa */
export const actualizarGridCell = (id, datos) => clienteApi.put(`/grid-cells/${id}/`, datos);

/** Actualizar celda parcial */
export const parcharGridCell = (id, datos) => clienteApi.patch(`/grid-cells/${id}/`, datos);

/** Eliminar celda */
export const eliminarGridCell = (id) => clienteApi.delete(`/grid-cells/${id}/`);

/** Obtener celdas por layout */
export const obtenerGridCellsPorLayout = (idLayout) => clienteApi.get(`/grid-cells/por-layout/${idLayout}/`);
