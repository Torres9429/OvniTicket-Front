import jsPDF from 'jspdf';
import QRCode from 'qrcode';

// Brand colors (OvniTicket purple palette)
const C = {
  purpleDark:  [74, 25, 127],   // #4a197f
  purple:      [124, 58, 237],  // #7c3aed
  purpleLight: [237, 233, 254], // #ede9fe
  white:       [255, 255, 255],
  black:       [17, 24, 39],
  gray:        [107, 114, 128],
  grayLight:   [243, 244, 246],
  grayBorder:  [229, 231, 235],
  green:       [22, 163, 74],
};

async function loadImageAsBase64(url) {
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((res) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result);
      reader.onerror = () => res(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function generateQR(data) {
  try {
    return await QRCode.toDataURL(String(data), {
      width: 120,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch {
    return null;
  }
}

function setFill(pdf, rgb) { pdf.setFillColor(rgb[0], rgb[1], rgb[2]); }
function setDraw(pdf, rgb) { pdf.setDrawColor(rgb[0], rgb[1], rgb[2]); }
function setTxt(pdf, rgb)  { pdf.setTextColor(rgb[0], rgb[1], rgb[2]); }

export async function downloadTicketPdf({ orden, tickets = [], evento }, transactionId = null) {
  if (!orden) throw new Error('Orden requerida para generar el boleto.');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210;
  const PH = 297;
  const M  = 14;   // margin
  const CW = PW - M * 2;  // content width

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const text = (str, x, y, opts = {}) => pdf.text(str, x, y, opts);

  // ═══════════════════════════════════════════════════════════════════════
  // HEADER BAND
  // ═══════════════════════════════════════════════════════════════════════
  setFill(pdf, C.purpleDark);
  pdf.rect(0, 0, PW, 36, 'F');

  // Star decoration dots
  setFill(pdf, C.purple);
  [[6, 8], [12, 6], [9, 14], [198, 9], [204, 5], [201, 16]].forEach(([x, y]) =>
    pdf.circle(x, y, 0.8, 'F')
  );
  setFill(pdf, C.purpleLight);
  [[5, 24], [14, 28], [195, 25], [205, 30]].forEach(([x, y]) =>
    pdf.circle(x, y, 0.5, 'F')
  );

  // Brand name
  setTxt(pdf, C.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  text('OvniTicket', M, 16);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  setTxt(pdf, [196, 181, 253]); // purple-200
  text('Tu boleto digital', M, 23);

  // Order info (right side)
  setTxt(pdf, C.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  text(`Orden #${orden.id_orden ?? 'N/A'}`, PW - M, 14, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  setTxt(pdf, [196, 181, 253]);
  const fecha = orden.fecha_creacion
    ? new Date(orden.fecha_creacion).toLocaleDateString('es-MX', { dateStyle: 'long' })
    : new Date().toLocaleDateString('es-MX', { dateStyle: 'long' });
  text(fecha, PW - M, 21, { align: 'right' });

  if (transactionId) {
    pdf.setFontSize(7);
    text(`TX: ${transactionId}`, PW - M, 28, { align: 'right' });
  }

  let y = 44;

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT IMAGE
  // ═══════════════════════════════════════════════════════════════════════
  if (evento?.foto) {
    const imgData = await loadImageAsBase64(evento.foto);
    if (imgData) {
      const imgH = 52;
      pdf.addImage(imgData, 'JPEG', M, y, CW, imgH, '', 'MEDIUM');

      // Dark gradient overlay at bottom of image (cosmetic)
      setFill(pdf, [255, 255, 255]);
      pdf.setGState(new pdf.GState({ opacity: 0 }));
      pdf.rect(M, y + imgH - 8, CW, 8, 'F');
      pdf.setGState(new pdf.GState({ opacity: 1 }));

      y += imgH + 5;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT INFO
  // ═══════════════════════════════════════════════════════════════════════
  setTxt(pdf, C.black);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  const eventName = evento?.nombre || 'Evento';
  const nameLines = pdf.splitTextToSize(eventName, CW);
  pdf.text(nameLines, M, y);
  y += nameLines.length * 7 + 1;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  if (evento?.fecha_inicio) {
    setTxt(pdf, C.purple);
    text('📅', M, y);
    setTxt(pdf, C.gray);
    const fechaEvento = new Date(evento.fecha_inicio).toLocaleString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    text(fechaEvento, M + 5, y);
    y += 6;
  }

  if (evento?.lugar) {
    setTxt(pdf, C.purple);
    text('📍', M, y);
    setTxt(pdf, C.gray);
    text(evento.lugar, M + 5, y);
    y += 6;
  }

  y += 3;

  // Purple rule line
  setDraw(pdf, C.purpleDark);
  pdf.setLineWidth(0.4);
  pdf.line(M, y, PW - M, y);
  y += 7;

  // ═══════════════════════════════════════════════════════════════════════
  // TICKETS SECTION HEADER
  // ═══════════════════════════════════════════════════════════════════════
  setTxt(pdf, C.black);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  text(`Boletos (${tickets.length})`, M, y);
  y += 7;

  // ═══════════════════════════════════════════════════════════════════════
  // TICKET CARDS
  // ═══════════════════════════════════════════════════════════════════════
  const CARD_H = 38;
  const QR_SIZE = 32;

  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];

    if (y + CARD_H + 6 > PH - 28) {
      pdf.addPage();
      y = 18;
    }

    const label = t.label || `Ticket #${t.id_ticket}`;
    const zone  = t.zona || 'General';
    const price = Number(t.precio ?? 0);

    // Card background
    setFill(pdf, C.grayLight);
    setDraw(pdf, C.grayBorder);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(M, y, CW, CARD_H, 2.5, 2.5, 'FD');

    // Left accent bar (purple)
    setFill(pdf, C.purpleDark);
    pdf.roundedRect(M, y, 3.5, CARD_H, 1.5, 1.5, 'F');
    pdf.rect(M + 1.5, y, 2, CARD_H, 'F'); // fill left side of rounded corners

    // Ticket number badge
    setFill(pdf, C.purpleLight);
    pdf.roundedRect(M + 7, y + 4, 18, 6, 1.5, 1.5, 'F');
    setTxt(pdf, C.purpleDark);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    text(`BOLETO ${i + 1}`, M + 16, y + 8.2, { align: 'center' });

    // Label (seat)
    setTxt(pdf, C.black);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    text(label, M + 7, y + 18);

    // Zone
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    setTxt(pdf, C.gray);
    text(`Zona: ${zone}`, M + 7, y + 25);

    // Price
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    setTxt(pdf, C.purple);
    text(`$${price.toLocaleString('es-MX')} MXN`, M + 7, y + 33);

    // Dashed separator before QR
    setDraw(pdf, C.grayBorder);
    pdf.setLineWidth(0.2);
    pdf.setLineDashPattern([1.5, 1.5], 0);
    pdf.line(PW - M - QR_SIZE - 8, y + 4, PW - M - QR_SIZE - 8, y + CARD_H - 4);
    pdf.setLineDashPattern([], 0);

    // QR code
    const qrPayload = JSON.stringify({ id: t.id_ticket, orden: orden.id_orden });
    const qrImg = await generateQR(qrPayload);
    if (qrImg) {
      pdf.addImage(qrImg, 'PNG', PW - M - QR_SIZE - 3, y + (CARD_H - QR_SIZE) / 2, QR_SIZE, QR_SIZE);
    }

    y += CARD_H + 5;
  }

  y += 3;

  // ═══════════════════════════════════════════════════════════════════════
  // TOTAL CARD
  // ═══════════════════════════════════════════════════════════════════════
  if (y + 18 > PH - 28) {
    pdf.addPage();
    y = 18;
  }

  setFill(pdf, C.purpleDark);
  pdf.roundedRect(M, y, CW, 16, 2.5, 2.5, 'F');

  setTxt(pdf, [196, 181, 253]); // purple-200
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  text('Total pagado:', M + 6, y + 10.5);

  setTxt(pdf, C.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  text(`$${Number(orden.total || 0).toLocaleString('es-MX')} MXN`, PW - M - 5, y + 10.5, { align: 'right' });

  // Status badge
  setFill(pdf, C.green);
  pdf.roundedRect(M + 50, y + 4, 20, 8, 2, 2, 'F');
  setTxt(pdf, C.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  text('PAGADO', M + 60, y + 9.2, { align: 'center' });

  y += 22;

  // ═══════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════
  const footerY = PH - 18;
  setDraw(pdf, C.grayBorder);
  pdf.setLineWidth(0.3);
  pdf.line(M, footerY - 4, PW - M, footerY - 4);

  setTxt(pdf, C.gray);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  text('Presenta este boleto en la entrada. El código QR es personal e intransferible.', PW / 2, footerY, { align: 'center' });
  text('OvniTicket © 2026', PW / 2, footerY + 5, { align: 'center' });

  // ─── Save ────────────────────────────────────────────────────────────────
  pdf.save(`boleto-orden-${orden.id_orden ?? 'N/A'}.pdf`);
}
