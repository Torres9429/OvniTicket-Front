import { clienteApi } from './api';

/** Listar todas las zonas */
export const obtenerZonas = () => clienteApi.get('/zonas/');

/** Obtener una zona por ID */
export const obtenerZona = (id) => clienteApi.get(`/zonas/${id}/`);

/** Crear zona */
export const crearZona = (datos) => clienteApi.post('/zonas/', datos);

/** Actualizar zona */
export const actualizarZona = (id, datos) => clienteApi.put(`/zonas/${id}/`, datos);

/** Eliminar zona */
export const eliminarZona = (id) => clienteApi.delete(`/zonas/${id}/`);
