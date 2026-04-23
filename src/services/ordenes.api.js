import { apiClient } from './api';

/** Listar todas las órdenes */
export const getOrders = () => apiClient.get('/ordenes/');

/** Obtener una orden por ID */
export const getOrder = (id) => apiClient.get(`/ordenes/${id}/`);

/** Obtener detalle completo de orden (orden + tickets + evento) — autoridad
 *  para la pantalla de confirmación. */
export const getOrderDetail = (id) =>
  apiClient.get(`/ordenes/${id}/detalle/`);

/** Crear orden */
export const createOrder = (data) => apiClient.post('/ordenes/', data);

/** Actualizar orden completa */
export const updateOrder = (id, data) => apiClient.put(`/ordenes/${id}/`, data);

/** Actualizar orden parcial */
export const patchOrder = (id, data) => apiClient.patch(`/ordenes/${id}/`, data);

/** Eliminar orden */
export const deleteOrder = (id) => apiClient.delete(`/ordenes/${id}/`);

/** Obtener órdenes por evento */
export const getOrdersByEvent = (eventId) => apiClient.get(`/ordenes/por-evento/${eventId}/`);

/** Obtener órdenes por usuario */
export const getOrdersByUser = (userId) => apiClient.get(`/ordenes/por-usuario/${userId}/`);

/** Dashboard de ventas del organizador (agregados + eventos + órdenes recientes) */
export const getMySales = () => apiClient.get('/ordenes/mis-ventas/');

/**
 * Compra atómica: crea la orden, confirma los asientos y procesa el pago
 * en una sola llamada al backend.
 *
 * @param {number} eventId
 * @param {Array<{row:number,col:number,zone_id?:number|null}>} asientosLayout
 * @param {string} paymentMethod - 'mock' en el entorno de pruebas
 * @param {string|null} operationId - clave de idempotencia opcional (UUID)
 * @returns {{ orden: object, tickets: object[], transaction_id: string }}
 */
export const purchase = async (eventId, asientosLayout, paymentMethod = 'mock', operationId = null) =>
  await apiClient.post('/ordenes/comprar/', {
    id_evento: eventId,
    asientos_layout: asientosLayout,
    metodo_pago: paymentMethod,
    ...(operationId ? { operation_id: operationId } : {}),
  });
