import { clienteApi } from './api';

/** Listar todos los tickets */
export const obtenerTickets = () => clienteApi.get('/tickets/');

/** Obtener un ticket por ID */
export const obtenerTicket = (id) => clienteApi.get(`/tickets/${id}/`);

/** Crear ticket */
export const crearTicket = (datos) => clienteApi.post('/tickets/', datos);

/** Actualizar ticket completo */
export const actualizarTicket = (id, datos) => clienteApi.put(`/tickets/${id}/`, datos);

/** Actualizar ticket parcial */
export const parcharTicket = (id, datos) => clienteApi.patch(`/tickets/${id}/`, datos);

/** Eliminar ticket */
export const eliminarTicket = (id) => clienteApi.delete(`/tickets/${id}/`);

/** Obtener tickets por orden */
export const obtenerTicketsPorOrden = (idOrden) => clienteApi.get(`/tickets/por-orden/${idOrden}/`);

/** Obtener tickets por evento */
export const obtenerTicketsPorEvento = (idEvento) => clienteApi.get(`/tickets/por-evento/${idEvento}/`);
