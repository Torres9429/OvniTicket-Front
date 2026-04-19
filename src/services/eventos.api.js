import { apiClient } from './api';

/**
 * CRUD de Eventos — usa cifrado automático via apiClient
 */

/** Listar eventos disponibles */
export const getEvents = () => apiClient.get('/eventos/');

/** Listar todos los eventos (incluye inactivos) */
export const getAllEvents = () => apiClient.get('/eventos/all/');

/** Obtener un evento por ID */
export const getEvent = (id) => apiClient.get(`/eventos/${id}/`);

/** Crear evento */
export const createEvent = (data) => apiClient.post('/eventos/', data);

/** Actualizar evento completo */
export const updateEvent = (id, data) => apiClient.put(`/eventos/${id}/`, data);

/** Actualizar evento parcial */
export const patchEvent = (id, data) => apiClient.patch(`/eventos/${id}/`, data);

/** Desactivar evento */
export const deactivateEvent = (id) => apiClient.patch(`/eventos/${id}/deactivate/`, {});

/** Reactivar evento */
export const reactivateEvent = (id) => apiClient.patch(`/eventos/${id}/reactivate/`, {});

/** Obtener eventos por usuario (organizador - eventos de sus lugares) */
export const getEventsByUser = (id_usuario) => apiClient.get(`/eventos/by-usuario/?id_usuario=${id_usuario}`);
