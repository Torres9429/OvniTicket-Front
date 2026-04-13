import { apiClient } from './api';

/** Listar todas las zonas */
export const getZones = () => apiClient.get('/zonas/');

/** Obtener una zona por ID */
export const getZone = (id) => apiClient.get(`/zonas/${id}/`);

/** Crear zona */
export const createZone = (data) => apiClient.post('/zonas/', data);

/** Actualizar zona */
export const updateZone = (id, data) => apiClient.put(`/zonas/${id}/`, data);

/** Eliminar zona */
export const deleteZone = (id) => apiClient.delete(`/zonas/${id}/`);
