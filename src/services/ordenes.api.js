import { clienteApi } from './api';

/** Listar todas las órdenes */
export const obtenerOrdenes = () => clienteApi.get('/ordenes/');

/** Obtener una orden por ID */
export const obtenerOrden = (id) => clienteApi.get(`/ordenes/${id}/`);

/** Obtener detalle completo de orden (orden + tickets + evento) — autoridad
 *  para la pantalla de confirmación. */
export const obtenerOrdenDetalle = (id) =>
  clienteApi.get(`/ordenes/${id}/detalle/`);

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

/** Dashboard de ventas del organizador (agregados + eventos + órdenes recientes) */
export const obtenerMisVentas = () => clienteApi.get('/ordenes/mis-ventas/');

/**
 * Compra atómica: crea la orden, confirma los asientos y procesa el pago
 * en una sola llamada al backend.
 *
 * @param {number} idEvento
 * @param {number[]} idsGridCell
 * @param {string} metodoPago - 'mock' en el entorno de pruebas
 * @param {string|null} operationId - clave de idempotencia opcional (UUID)
 * @returns {{ orden: object, tickets: object[], transaction_id: string }}
 */
export const comprar = (idEvento, idsGridCell, metodoPago = 'mock', operationId = null) =>
  clienteApi.post('/ordenes/comprar/', {
    id_evento: idEvento,
    ids_grid_cell: idsGridCell,
    metodo_pago: metodoPago,
    ...(operationId ? { operation_id: operationId } : {}),
  });
