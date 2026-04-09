import { clienteApi } from './api';

/** Listar todos los asientos */
export const obtenerAsientos = () => clienteApi.get('/asientos/');

/** Obtener un asiento por ID */
export const obtenerAsiento = (id) => clienteApi.get(`/asientos/${id}/`);

/** Crear asiento */
export const crearAsiento = (datos) => clienteApi.post('/asientos/', datos);

/** Actualizar asiento */
export const actualizarAsiento = (id, datos) => clienteApi.put(`/asientos/${id}/`, datos);

/** Eliminar asiento */
export const eliminarAsiento = (id) => clienteApi.delete(`/asientos/${id}/`);
