import { clienteApi } from './api';

/** Listar todos los precios zona-evento */
export const obtenerPreciosZonaEvento = () => clienteApi.get('/precio-zona-evento/');

/** Obtener un precio zona-evento por ID */
export const obtenerPrecioZonaEvento = (id) => clienteApi.get(`/precio-zona-evento/${id}/`);

/** Crear precio zona-evento */
export const crearPrecioZonaEvento = (datos) => clienteApi.post('/precio-zona-evento/', datos);

/** Actualizar precio zona-evento */
export const actualizarPrecioZonaEvento = (id, datos) => clienteApi.put(`/precio-zona-evento/${id}/`, datos);

/** Eliminar precio zona-evento */
export const eliminarPrecioZonaEvento = (id) => clienteApi.delete(`/precio-zona-evento/${id}/`);
