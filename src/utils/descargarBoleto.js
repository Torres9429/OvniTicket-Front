/**
 * Helper compartido para descargar un boleto como archivo de texto.
 *
 * Recibe el payload de `getOrderDetail(id)` (`{orden, tickets, evento}`)
 * y genera un archivo `boleto-orden-<id>.txt` con los datos.
 *
 * Se usa desde PaginaConfirmacion y PaginaMisOrdenes / PaginaMisBoletos
 * para garantizar consistencia entre las dos rutas.
 */
export function downloadTicketTxt({ orden, tickets = [], evento }, transactionId = null) {
  if (!orden) throw new Error('Orden requerida para generar el boleto.');

  const orderId = orden.id_orden ?? 'N/A';
  const total = Number(orden.total || 0);
  const status = orden.estatus || 'pagado';

  const content = [
    `=== BOLETO OVNITICKET ===`,
    `Orden: #${orderId}`,
    `Evento: ${evento?.nombre || 'N/A'}`,
    `Fecha: ${
      evento?.fecha_inicio
        ? new Date(evento.fecha_inicio).toLocaleString('es-MX')
        : 'N/A'
    }`,
    transactionId ? `Transaction ID: ${transactionId}` : null,
    ``,
    `--- Asientos ---`,
    ...tickets.map((t) => {
      const label = t.label || `Ticket #${t.id_ticket}`;
      const zone = t.zona || 'General';
      const price = Number(t.precio ?? 0);
      return `${label} | ${zone} | $${price.toLocaleString('es-MX')} MXN`;
    }),
    ``,
    `Total: $${total.toLocaleString('es-MX')} MXN`,
    `Estado: ${status}`,
    ``,
    `Presenta este boleto en la entrada.`,
  ]
    .filter(Boolean)
    .join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `boleto-orden-${orderId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
