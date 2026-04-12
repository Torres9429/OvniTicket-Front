import { clienteApi } from './api';

/** Listar todos los asientos */
export const obtenerAsientos = () => clienteApi.get('/asientos/');

/** Obtener un asiento por ID */
export const obtenerAsiento = (id) => clienteApi.get(`/asientos/${id}/`);

/** Crear asiento */
export const crearAsiento = (datos) => clienteApi.post('/asientos/', datos);

/** Actualizar asiento */
export const actualizarAsiento = (id, datos) => clienteApi.put(`/asientos/${id}/`, datos);

/** Eliminar asiento */
export const eliminarAsiento = (id) => clienteApi.delete(`/asientos/${id}/`);

/** Obtener disponibilidad de asientos por evento */
export const obtenerDisponibilidad = (idEvento) =>
  clienteApi.get(`/asientos/disponibilidad/${idEvento}/`);

/** Retener asientos seleccionados */
export const retenerAsientos = (idEvento, idsGridCell) =>
  clienteApi.post('/asientos/retener/', { id_evento: idEvento, ids_grid_cell: idsGridCell });

/** Liberar asientos retenidos por el usuario */
export const liberarAsientos = (idEvento) =>
  clienteApi.post('/asientos/liberar/', { id_evento: idEvento });

/** Confirmar compra de asientos retenidos */
export const confirmarCompra = (idEvento, idsGridCell) =>
  clienteApi.post('/asientos/confirmar/', { id_evento: idEvento, ids_grid_cell: idsGridCell });

/** Obtener el hold actual del usuario para un evento */
export const obtenerEstadoHold = (idEvento) =>
  clienteApi.get(`/asientos/hold-status/${idEvento}/`);
