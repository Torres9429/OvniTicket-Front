/**
 * Helper compartido para descargar un boleto como archivo de texto.
 *
 * Recibe el payload de `obtenerOrdenDetalle(id)` (`{orden, tickets, evento}`)
 * y genera un archivo `boleto-orden-<id>.txt` con los datos.
 *
 * Se usa desde PaginaConfirmacion y PaginaMisOrdenes / PaginaMisBoletos
 * para garantizar consistencia entre las dos rutas.
 */
export function descargarBoletoTxt({ orden, tickets = [], evento }, transactionId = null) {
  if (!orden) throw new Error('Orden requerida para generar el boleto.');

  const idOrden = orden.id_orden ?? 'N/A';
  const total = Number(orden.total || 0);
  const estatus = orden.estatus || 'pagado';

  const contenido = [
    `=== BOLETO OVNITICKET ===`,
    `Orden: #${idOrden}`,
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
      const etiqueta = t.label || `Ticket #${t.id_ticket}`;
      const zona = t.zona || 'General';
      const precio = Number(t.precio ?? 0);
      return `${etiqueta} | ${zona} | $${precio.toLocaleString('es-MX')} MXN`;
    }),
    ``,
    `Total: $${total.toLocaleString('es-MX')} MXN`,
    `Estado: ${estatus}`,
    ``,
    `Presenta este boleto en la entrada.`,
  ]
    .filter(Boolean)
    .join('\n');

  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `boleto-orden-${idOrden}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
