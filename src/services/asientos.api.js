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

/** Retener asientos seleccionados del layout */
export const holdSeats = (eventId, asientosLayout = []) =>
  apiClient.post('/asientos/retener/', {
    id_evento: eventId,
    asientos_layout: asientosLayout,
  });

/** Liberar asientos retenidos por el usuario */
export const releaseSeats = (eventId) =>
  apiClient.post('/asientos/liberar/', { id_evento: eventId });

/** Confirmar compra de asientos retenidos */
export const confirmPurchase = (eventId, asientosLayout = []) =>
  apiClient.post('/asientos/confirmar/', {
    id_evento: eventId,
    asientos_layout: asientosLayout,
  });

/** Obtener el hold actual del usuario para un evento */
export const getHoldStatus = (eventId) =>
  apiClient.get(`/asientos/hold-status/${eventId}/`);