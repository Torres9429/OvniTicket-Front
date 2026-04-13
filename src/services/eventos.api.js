import { clienteApi } from './api';

/**
 * CRUD de Eventos — usa cifrado automático via clienteApi
 */

/** Listar eventos disponibles */
export const obtenerEventos = () => clienteApi.get('/eventos/');

/** Listar todos los eventos (incluye inactivos) */
export const obtenerTodosLosEventos = () => clienteApi.get('/eventos/all/');

/** Obtener un evento por ID */
export const obtenerEvento = (id) => clienteApi.get(`/eventos/${id}/`);

/** Crear evento */
export const crearEvento = (datos) => clienteApi.post('/eventos/', datos);

/** Actualizar evento completo */
export const actualizarEvento = (id, datos) => clienteApi.put(`/eventos/${id}/`, datos);

/** Actualizar evento parcial */
export const parcharEvento = (id, datos) => clienteApi.patch(`/eventos/${id}/`, datos);

/** Desactivar evento */
export const desactivarEvento = (id) => clienteApi.patch(`/eventos/${id}/deactivate/`, {});

/** Reactivar evento */
export const reactivarEvento = (id) => clienteApi.patch(`/eventos/${id}/reactivate/`, {});

/** Obtener eventos por usuario (organizador - eventos de sus lugares) */
export const obtenerEventosPorUsuario = (id_usuario) => clienteApi.get(`/eventos/by-usuario/?id_usuario=${id_usuario}`);
