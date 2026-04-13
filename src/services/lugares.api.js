import { clienteApi } from './api';

/**
 * API de Lugares
 */

/** Listar lugares disponibles */
export const obtenerLugares = () => clienteApi.get('/lugares/');

/** Listar todos los lugares (incluye inactivos) */
export const obtenerTodosLosLugares = () => clienteApi.get('/lugares/all/');

/** Obtener un lugar por ID */
export const obtenerLugar = (id) => clienteApi.get(`/lugares/${id}/`);

/** Crear lugar */
export const crearLugar = (datos) => clienteApi.post('/lugares/', datos);

/** Actualizar lugar completo */
export const actualizarLugar = (id, datos) => clienteApi.put(`/lugares/${id}/`, datos);

/** Actualizar lugar parcial */
export const parcharLugar = (id, datos) => clienteApi.patch(`/lugares/${id}/`, datos);

/** Desactivar lugar */
export const desactivarLugar = (id) => clienteApi.patch(`/lugares/${id}/deactivate/`, {});

/** Reactivar lugar */
export const reactivarLugar = (id) => clienteApi.patch(`/lugares/${id}/reactivate/`, {});

/** Obtener lugares por dueño */
export const obtenerLugaresPorDueno = (id_dueno) => clienteApi.get(`/lugares/by-dueno/?id_dueno=${id_dueno}`);
