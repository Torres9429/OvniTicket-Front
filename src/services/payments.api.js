import { apiClient } from './api';

/**
 * Crea una Stripe Checkout Session en el backend.
 * El backend devuelve la URL de Stripe a la que redirigir al usuario.
 *
 * @param {number}   idEvento
 * @param {Array<{row:number,col:number,zone_id?:number|null}>} asientosLayout
 * @param {string}   operationId  - clave de idempotencia (UUID)
 * @param {string}   successUrl   - URL de retorno tras pago exitoso
 * @param {string}   cancelUrl    - URL de retorno si el usuario cancela
 * @returns {{ session_id: string, checkout_url: string, monto: string, moneda: string, operation_id: string }}
 */
export const crearCheckoutSession = (idEvento, asientosLayout, operationId, successUrl, cancelUrl) =>
  apiClient
    .post('/pagos/crear-sesion/', {
      id_evento: idEvento,
      asientos_layout: asientosLayout,
      operation_id: operationId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    })
    .then((res) => ({
      ...res,
      checkout_url: res?.checkout_url || res?.session_url,
      session_id: res?.session_id,
    }));

/**
 * Obtiene la orden asociada a una sesión de Stripe.
 * 200 => { id_orden }
 * 202 => { status: 'pending' }
 */
export const getOrderBySession = (sessionId) =>
  apiClient.get(`/pagos/orden-por-sesion/?session_id=${encodeURIComponent(sessionId)}`);