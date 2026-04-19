import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Card, Chip, Spinner, toast } from '@heroui/react';
import { getEvent } from '../services/eventos.api';
import { releaseSeats, getHoldStatus } from '../services/asientos.api';
import { purchase } from '../services/ordenes.api';
import { useAuth } from '../hooks/useAuth';

function formatTimeRemaining(ms) {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function PaginaCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  useAuth(); // ensure user is authenticated

  const {
    idEvento,
    asientos = [],
    idsGridCell = [],
    retenidoHasta: retenidoHastaNav, // ISO string from nav state
  } = location.state || {};

  // operationId: generated exactly once per checkout mount, stable across re-renders
  const operationIdRef = useRef(null);
  if (operationIdRef.current === null) {
    operationIdRef.current = crypto.randomUUID();
  }

  // retenidoHasta: use nav-state value directly; recovery path always redirects
  const retenidoHasta = retenidoHastaNav || null;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [seatsLost, setSeatsLost] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Countdown anchored to backend retenidoHasta
  const [msRestantes, setMsRestantes] = useState(() =>
    retenidoHastaNav ? Math.max(0, new Date(retenidoHastaNav) - Date.now()) : 0
  );

  // Hold-recovery on mount: handles page refresh or missing nav state
  useEffect(() => {
    if (!idEvento) {
      toast.error('La sesión de compra expiró. Por favor selecciona tus asientos nuevamente.');
      navigate('/');
      return;
    }

    if (!retenidoHastaNav || idsGridCell.length === 0) {
      // Try to recover the hold from the backend
      getHoldStatus(idEvento)
        .then((data) => {
          if (data.tiene_retencion && data.ids_grid_cell.length > 0) {
            // We have a hold but no seat labels/prices — send user back to selection
            toast.error(
              'Sesión de compra recuperada pero datos de asientos perdidos. Selecciona nuevamente.'
            );
            navigate(-1);
          } else {
            toast.error('No tienes asientos retenidos. Selecciona nuevamente.');
            navigate('/');
          }
        })
        .catch(() => {
          toast.error('No se pudo verificar el estado de tu reserva.');
          navigate('/');
        });
    }
  }, [idEvento]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown useEffect — re-anchors whenever retenidoHasta changes (e.g. after recovery)
  useEffect(() => {
    if (!retenidoHasta) return;

    const tick = () =>
      setMsRestantes(Math.max(0, new Date(retenidoHasta) - Date.now()));

    tick(); // run immediately
    const intervalo = setInterval(tick, 500);
    return () => clearInterval(intervalo);
  }, [retenidoHasta]);

  // Load event data
  useEffect(() => {
    if (!idEvento) return;
    getEvent(idEvento)
      .then(setEvent)
      .catch(() => toast.error('No se pudo cargar la información del evento.'))
      .finally(() => setLoading(false));
  }, [idEvento]);

  const totalPrice = asientos.reduce((sum, a) => sum + (Number(a.precio) || 0), 0);
  const timeExpired = msRestantes <= 0;

  const getCountdownColor = () => {
    if (msRestantes > 3 * 60 * 1000) return 'success';
    if (msRestantes > 60 * 1000) return 'warning';
    return 'danger';
  };
  const countdownColor = getCountdownColor();

  const handlePay = useCallback(async () => {
    if (timeExpired) {
      toast.error('El tiempo de retención de tus asientos ha expirado. Por favor selecciona nuevamente.');
      navigate(-1);
      return;
    }

    setPaymentError(null);
    setSeatsLost(false);
    setProcessing(true);

    try {
      const resultado = purchase(idEvento, idsGridCell, 'mock', operationIdRef.current);

      toast.success('Compra realizada exitosamente.');
      const orderId = resultado?.orden?.id_orden;
      navigate(`/confirmacion/${orderId}`, {
        state: {
          // Optional hint for instant paint; confirmation re-fetches from backend
          // as the authoritative source.
          orden: resultado.orden,
          tickets: resultado.tickets,
          transactionId: resultado.transaction_id,
          evento,
          asientos,
        },
      });
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 422 && data?.codigo === 'EVENT_PRICING_MISSING') {
        setPaymentError(
          data?.error ||
            'This event does not have prices configured. Please contact the organizer to complete the configuration.'
        );
      } else if (status === 409) {
        setSeatsLost(true);
        setPaymentError(
          data?.error ||
            'One or more of your seats are no longer available. Someone else took them.'
        );
      } else if (status === 402) {
        setPaymentError('The payment was rejected. Please try again.');
      } else {
        const message =
          data?.error || err?.message || 'An error occurred while processing the purchase.';
        setPaymentError(message);
      }
    } finally {
      setProcessing(false);
    }
  }, [idEvento, idsGridCell, evento, asientos, timeExpired, navigate]);

  const handleCancel = useCallback(async () => {
    try {
      await releaseSeats(idEvento);
    } catch {
      // Seats will expire by timeout on the server
    }
    navigate(-1);
  }, [idEvento, navigate]);

  const handleBackToSelection = useCallback(async () => {
    try {
      await releaseSeats(idEvento);
    } catch {
      // ignore
    }
    navigate(-1);
  }, [idEvento, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Resumen de compra</h1>
        <Chip
          color={countdownColor}
          variant="flat"
          size="sm"
          className="font-mono text-sm"
        >
          {timeExpired ? 'Expirado' : `Tiempo restante: ${formatTimeRemaining(msRestantes)}`}
        </Chip>
      </div>

      {timeExpired && (
        <Card className="p-4 mb-4 border-danger bg-danger-50">
          <p className="text-danger font-medium text-sm">
            El tiempo de retención de tus asientos ha expirado. Vuelve a seleccionarlos.
          </p>
          <Button
            size="sm"
            color="danger"
            variant="flat"
            className="mt-3"
            onPress={handleBackToSelection}
          >
            Seleccionar asientos nuevamente
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información del evento */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-3">Evento</h2>
          <p className="font-medium">{event?.nombre || 'Evento'}</p>
          {event?.descripcion && (
            <p className="text-sm text-default-500 mt-1 line-clamp-3">{event.descripcion}</p>
          )}
          {event?.fecha_inicio && (
            <p className="text-sm text-default-400 mt-2">
              {new Date(event.fecha_inicio).toLocaleString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          {event?.lugar && (
            <p className="text-sm text-default-400 mt-1">{event.lugar}</p>
          )}
        </Card>

        {/* Lista de asientos y desglose de precios */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-3">
            Asientos seleccionados ({asientos.length})
          </h2>
          <ul className="space-y-2 max-h-44 overflow-y-auto mb-3">
            {asientos.map((a) => (
              <li
                key={a.idCelda ?? a.id}
                className="flex justify-between text-sm"
              >
                <span className="font-medium">{a.label || `Asiento ${a.idCelda}`}</span>
                <span className="text-default-500 text-right">
                  <span className="block">{a.nombreZona || 'General'}</span>
                  {a.precio != null && (
                    <span className="text-default-700">${Number(a.precio).toLocaleString('es-MX')} MXN</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="border-t pt-3 space-y-1">
            <div className="flex justify-between text-sm text-default-500">
              <span>Subtotal ({asientos.length} asiento{asientos.length === 1 ? '' : 's'})</span>
              <span>${totalPrice.toLocaleString('es-MX')} MXN</span>
            </div>
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>${totalPrice.toLocaleString('es-MX')} MXN</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Sección de pago */}
      <Card className="p-5 mt-6">
        <h2 className="text-lg font-semibold mb-1">Pago (simulado)</h2>
        <p className="text-sm text-default-500 mb-4">
          Este es un entorno de pruebas. No se realizará ningún cargo real a tu cuenta.
          El método de pago utilizado es <span className="font-mono">mock</span>.
        </p>

        {paymentError && (
          <div className="rounded-lg bg-danger-50 border border-danger-200 p-3 mb-4">
            <p className="text-danger text-sm font-medium">{paymentError}</p>
            {seatsLost && (
              <Button
                size="sm"
                color="danger"
                variant="flat"
                className="mt-2"
                onPress={handleBackToSelection}
              >
                Volver a seleccionar asientos
              </Button>
            )}
          </div>
        )}

        <label className="flex items-start gap-2 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1 rounded"
          />
          <span className="text-sm text-default-600">
            Acepto los <span className="text-primary font-medium">terminos y condiciones</span> de compra
            y entiendo que esta transaccion es final una vez procesado el pago.
          </span>
        </label>

        <div className="flex gap-3 justify-end">
          <Button
            variant="flat"
            onPress={handleCancel}
            isDisabled={processing}
          >
            Cancelar
          </Button>
          <Button
            color="primary"
            onPress={handlePay}
            isLoading={processing}
            isDisabled={processing || timeExpired || seatsLost || !acceptTerms}
          >
            {processing
              ? 'Procesando pago...'
              : `Pagar $${totalPrice.toLocaleString('es-MX')} MXN`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
