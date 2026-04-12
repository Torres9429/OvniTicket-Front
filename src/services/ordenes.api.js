import { clienteApi } from './api';

/** Listar todas las órdenes */
export const obtenerOrdenes = () => clienteApi.get('/ordenes/');

/** Obtener una orden por ID */
export const obtenerOrden = (id) => clienteApi.get(`/ordenes/${id}/`);

/** Crear orden */
export const crearOrden = (datos) => clienteApi.post('/ordenes/', datos);

/** Actualizar orden completa */
export const actualizarOrden = (id, datos) => clienteApi.put(`/ordenes/${id}/`, datos);

/** Actualizar orden parcial */
export const parcharOrden = (id, datos) => clienteApi.patch(`/ordenes/${id}/`, datos);

/** Eliminar orden */
export const eliminarOrden = (id) => clienteApi.delete(`/ordenes/${id}/`);

/** Obtener órdenes por evento */
export const obtenerOrdenesPorEvento = (idEvento) => clienteApi.get(`/ordenes/por-evento/${idEvento}/`);

/** Obtener órdenes por usuario */
export const obtenerOrdenesPorUsuario = (idUsuario) => clienteApi.get(`/ordenes/por-usuario/${idUsuario}/`);
