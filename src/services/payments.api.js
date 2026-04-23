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
  apiClient.post('/payments/checkout-session/', {
    id_evento: idEvento,
    asientos_layout: asientosLayout,
    operation_id: operationId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
