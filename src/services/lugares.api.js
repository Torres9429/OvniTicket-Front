import { apiClient } from './api';

/**
 * API de Lugares
 */

/** Listar lugares disponibles */
export const getVenues = () => apiClient.get('/lugares/');

/** Listar todos los lugares (incluye inactivos) */
export const getAllVenues = () => apiClient.get('/lugares/all/');

/** Obtener un lugar por ID */
export const getVenue = (id) => apiClient.get(`/lugares/${id}/`);

/** Crear lugar */
export const createVenue = (data) => apiClient.post('/lugares/', data);

/** Actualizar lugar completo */
export const updateVenue = (id, data) => apiClient.put(`/lugares/${id}/`, data);

/** Actualizar lugar parcial */
export const patchVenue = (id, data) => apiClient.patch(`/lugares/${id}/`, data);

/** Desactivar lugar */
export const deactivateVenue = (id) => apiClient.patch(`/lugares/${id}/deactivate/`, {});

/** Reactivar lugar */
export const reactivateVenue = (id) => apiClient.patch(`/lugares/${id}/reactivate/`, {});

/** Obtener lugares por dueño */
export const getVenuesByOwner = (id_dueno) => apiClient.get(`/lugares/by-dueno/?id_dueno=${id_dueno}`);
