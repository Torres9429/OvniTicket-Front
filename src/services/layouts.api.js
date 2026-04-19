import { apiClient } from './api';

/** Listar layouts disponibles */
export const getLayouts = () => apiClient.get('/layouts/');

/** Listar todos los layouts (incluye inactivos) */
export const getAllLayouts = () => apiClient.get('/layouts/all/');

/** Obtener un layout por ID */
export const getLayout = (id) => apiClient.get(`/layouts/${id}/`);

/** Obtener todos los layouts de un lugar */
export const getLayoutsByVenue = (venueId) =>
	apiClient.get('/layouts/por_lugar/', { params: { id_lugar: venueId } });

/** Obtener el layout de la ultima version del lugar */
export const getLatestLayoutVersion = (venueId) =>
	apiClient.get('/layout/ultima_version_id/', {
		params: { id_lugar: venueId },
	});

/** Crear layout */
export const createLayout = (data) => apiClient.post('/layouts/', data);

/** Actualizar layout completo */
export const updateLayout = (id, data) => apiClient.put(`/layouts/${id}/`, data);

/** Actualizar layout parcial */
export const patchLayout = (id, data) => apiClient.patch(`/layouts/${id}/`, data);

/** Desactivar layout */
export const deactivateLayout = (id) => apiClient.patch(`/layouts/${id}/deactivate/`, {});

/** Reactivar layout */
export const reactivateLayout = (id) => apiClient.patch(`/layouts/${id}/reactivate/`, {});

/** Guardar snapshot del layout */
export const saveLayoutSnapshot = (id, data = {}) =>
	apiClient.patch(`/layouts/${id}/save_snapshot/`, data);
