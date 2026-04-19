import { apiClient } from './api';

/** Listar todos los tickets */
export const getTickets = () => apiClient.get('/tickets/');

/** Obtener un ticket por ID */
export const getTicket = (id) => apiClient.get(`/tickets/${id}/`);

/** Crear ticket */
export const createTicket = (data) => apiClient.post('/tickets/', data);

/** Actualizar ticket completo */
export const updateTicket = (id, data) => apiClient.put(`/tickets/${id}/`, data);

/** Actualizar ticket parcial */
export const patchTicket = (id, data) => apiClient.patch(`/tickets/${id}/`, data);

/** Eliminar ticket */
export const deleteTicket = (id) => apiClient.delete(`/tickets/${id}/`);

/** Obtener tickets por orden */
export const getTicketsByOrder = (orderId) => apiClient.get(`/tickets/por-orden/${orderId}/`);

/** Obtener tickets por evento */
export const getTicketsByEvent = (eventId) => apiClient.get(`/tickets/por-evento/${eventId}/`);
