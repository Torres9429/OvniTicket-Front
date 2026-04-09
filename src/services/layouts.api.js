import { clienteApi } from './api';

/** Listar layouts disponibles */
export const obtenerLayouts = () => clienteApi.get('/layouts/');

/** Listar todos los layouts (incluye inactivos) */
export const obtenerTodosLosLayouts = () => clienteApi.get('/layouts/all/');

/** Obtener un layout por ID */
export const obtenerLayout = (id) => clienteApi.get(`/layouts/${id}/`);

/** Crear layout */
export const crearLayout = (datos) => clienteApi.post('/layouts/', datos);

/** Actualizar layout completo */
export const actualizarLayout = (id, datos) => clienteApi.put(`/layouts/${id}/`, datos);

/** Actualizar layout parcial */
export const parcharLayout = (id, datos) => clienteApi.patch(`/layouts/${id}/`, datos);

/** Desactivar layout */
export const desactivarLayout = (id) => clienteApi.patch(`/layouts/${id}/deactivate/`, {});

/** Reactivar layout */
export const reactivarLayout = (id) => clienteApi.patch(`/layouts/${id}/reactivate/`, {});
