import { apiClient } from './api';

/** Listar todos los asientos */
export const getSeats = () => apiClient.get('/asientos/');

/** Obtener un asiento por ID */
export const getSeat = (id) => apiClient.get(`/asientos/${id}/`);

/** Crear asiento */
export const createSeat = (data) => apiClient.post('/asientos/', data);

/** Actualizar asiento */
export const updateSeat = (id, data) => apiClient.put(`/asientos/${id}/`, data);

/** Eliminar asiento */
export const deleteSeat = (id) => apiClient.delete(`/asientos/${id}/`);

/** Obtener disponibilidad de asientos por evento */
export const getAvailability = (eventId) =>
  apiClient.get(`/asientos/disponibilidad/${eventId}/`);

/** Retener asientos seleccionados */
export const holdSeats = (eventId, gridCellIds) =>
  apiClient.post('/asientos/retener/', { id_evento: eventId, ids_grid_cell: gridCellIds });

/** Liberar asientos retenidos por el usuario */
export const releaseSeats = (eventId) =>
  apiClient.post('/asientos/liberar/', { id_evento: eventId });

/** Confirmar compra de asientos retenidos */
export const confirmPurchase = (eventId, gridCellIds) =>
  apiClient.post('/asientos/confirmar/', { id_evento: eventId, ids_grid_cell: gridCellIds });

/** Obtener el hold actual del usuario para un evento */
export const getHoldStatus = (eventId) =>
  apiClient.get(`/asientos/hold-status/${eventId}/`);
