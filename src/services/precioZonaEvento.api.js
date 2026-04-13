import { apiClient } from './api';

/** Listar todos los precios zona-evento */
export const getZoneEventPrices = () => apiClient.get('/precio-zona-evento/');

/** Obtener un precio zona-evento por ID */
export const getZoneEventPrice = (id) => apiClient.get(`/precio-zona-evento/${id}/`);

/** Crear precio zona-evento */
export const createZoneEventPrice = (data) => apiClient.post('/precio-zona-evento/', data);

/** Actualizar precio zona-evento */
export const updateZoneEventPrice = (id, data) => apiClient.put(`/precio-zona-evento/${id}/`, data);

/** Eliminar precio zona-evento */
export const deleteZoneEventPrice = (id) => apiClient.delete(`/precio-zona-evento/${id}/`);
