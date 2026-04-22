import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Card, Chip, Spinner, toast } from '@heroui/react';
import { ArrowLeft, Calendar, Clock } from '@gravity-ui/icons';
import { getEvent } from '../services/eventos.api';
import {
  holdSeats,
  releaseSeats,
  getHoldStatus,
} from '../services/asientos.api';
import { MapaAsientos } from '../components/mapaAsientos';
import { useAuth } from '../hooks/useAuth';
import { isUser } from '../utils/rutasAutorizacion';

function formatTimeRemaining(ms) {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function PaginaSeleccionAsientos() {
  const { idEvento, idLayout } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const canSelectSeats = isAuthenticated && isUser(user?.role);

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [heldUntil, setHeldUntil] = useState(null);
  const [holding, setHolding] = useState(false);
  const [holdError, setHoldError] = useState(null);
  const [msRemaining, setMsRemaining] = useState(null);

  const firstRenderRef = useRef(true);
  const navigatingToCheckoutRef = useRef(false);
  const heldUntilRef = useRef(null);
  const lastHeldSignatureRef = useRef('');
  const lastSelectionSignatureRef = useRef('');

  useEffect(() => {
    heldUntilRef.current = heldUntil;
  }, [heldUntil]);

  useEffect(() => {
    async function load() {
      try {
        const ev = await getEvent(idEvento);
        setEvent(ev);
      } catch {
        toast.error('No se pudo cargar la información del evento.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [idEvento]);

  useEffect(() => {
    if (!canSelectSeats || !event?.id_evento) return;
    getHoldStatus(Number(event.id_evento))
      .then((data) => {
        if (data?.retenido_hasta) {
          setHeldUntil(data.retenido_hasta);
        }
      })
      .catch(() => {});
  }, [canSelectSeats, event?.id_evento]);

  useEffect(() => {
    if (!canSelectSeats || !event?.id_evento) return;

    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    const eventIdNum = Number(event.id_evento);

    if (selectedSeats.length === 0) {
      if (heldUntilRef.current) {
        releaseSeats(eventIdNum).catch(() => {});
      }
      setHeldUntil(null);
      lastHeldSignatureRef.current = '';
      setHoldError(null);
      return;
    }

    const idsGridCell = selectedSeats
      .map((a) => Number(a.cellId ?? a.idCelda))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    const selectionSignature = idsGridCell.join('|');

    if (selectionSignature && selectionSignature === lastHeldSignatureRef.current) {
      return;
    }

    setHolding(true);
    setHoldError(null);

    const timer = setTimeout(async () => {
      try {
        const response = await holdSeats(eventIdNum, idsGridCell);
        lastHeldSignatureRef.current = selectionSignature;
        setHeldUntil(response.retenido_hasta);
      } catch (err) {
        const message =
          err?.response?.data?.error || 'No se pudieron retener los asientos.';
        setHoldError(message);
        toast.error(message);
      } finally {
        setHolding(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      setHolding(false);
    };
  }, [selectedSeats, canSelectSeats, event?.id_evento]);

  const handleSelectionChange = useCallback((nextSeats) => {
    if (!canSelectSeats) {
      lastSelectionSignatureRef.current = '';
      setSelectedSeats([]);
      return;
    }

    const normalizedSeats = (nextSeats || []).map((seat) => ({
      ...seat,
      idCelda: seat.idCelda ?? seat.cellId,
      cellId: seat.cellId ?? seat.idCelda,
      precio: seat.precio ?? seat.price ?? 0,
      nombreZona: seat.nombreZona ?? seat.zoneName ?? 'General',
    }));

    const signature = normalizedSeats
      .map((a) => Number(a.cellId ?? a.idCelda))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)
      .join('|');

    if (signature === lastSelectionSignatureRef.current) return;
    lastSelectionSignatureRef.current = signature;
    setSelectedSeats(normalizedSeats);
  }, [canSelectSeats]);

  useEffect(() => {
    if (!heldUntil) {
      setMsRemaining(null);
      return;
    }

    const tick = () => {
      const ms = new Date(heldUntil) - Date.now();
      setMsRemaining(Math.max(0, ms));
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [heldUntil]);

  useEffect(() => {
    const eventIdNum = event?.id_evento ? Number(event.id_evento) : null;
    return () => {
      if (eventIdNum && !navigatingToCheckoutRef.current) {
        releaseSeats(eventIdNum).catch(() => {});
      }
    };
  }, [event?.id_evento]);

  const handleContinue = () => {
    if (selectedSeats.length === 0 || !heldUntil || !event) return;

    navigatingToCheckoutRef.current = true;
    navigate('/checkout', {
      state: {
        idEvento: Number(event.id_evento),
        idLayout: Number(idLayout),
        asientos: selectedSeats,
        idsGridCell: selectedSeats.map((a) => Number(a.cellId ?? a.idCelda)),
        retenidoHasta: heldUntil,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Evento no encontrado</h1>
        <Button as={Link} to="/" color="primary">
          Volver al inicio
        </Button>
      </div>
    );
  }

  const startDate = event.fecha_inicio
    ? new Date(event.fecha_inicio).toLocaleString('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : null;

  const endDate = event.fecha_fin
    ? new Date(event.fecha_fin).toLocaleString('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : null;

  const timeExpired = msRemaining !== null && msRemaining <= 0;
  const continueDisabled =
    !canSelectSeats || selectedSeats.length === 0 || !heldUntil || timeExpired || holding;

  const getCountdownColor = () => {
    if (msRemaining > 3 * 60 * 1000) return 'success';
    if (msRemaining > 60 * 1000) return 'warning';
    return 'danger';
  };

  const countdownColor = getCountdownColor();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Button
        variant="flat"
        onPress={() => navigate(-1)}
        className="mb-4"
        startContent={<ArrowLeft className="size-4" />}
      >
        Volver
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          {event.foto ? (
            <img
              src={event.foto}
              alt={event.nombre}
              className="w-full h-72 object-cover rounded-xl mb-4"
            />
          ) : (
            <div className="w-full h-72 bg-default-100 rounded-xl mb-4 flex items-center justify-center">
              <span className="text-default-400 text-lg">Sin imagen</span>
            </div>
          )}
          <h1 className="text-3xl font-bold">{event.nombre}</h1>
          {event.descripcion && (
            <p className="text-default-500 mt-2 text-base">{event.descripcion}</p>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-3">Detalles del evento</h2>
            <div className="space-y-4 text-sm">
              {startDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="size-4 mt-0.5 text-default-400 shrink-0" />
                  <div>
                    <span className="text-default-400 block text-xs">Inicio</span>
                    <span className="font-medium">{startDate}</span>
                  </div>
                </div>
              )}
              {endDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="size-4 mt-0.5 text-default-400 shrink-0" />
                  <div>
                    <span className="text-default-400 block text-xs">Fin</span>
                    <span className="font-medium">{endDate}</span>
                  </div>
                </div>
              )}
              {event.tiempo_espera > 0 && (
                <div className="flex items-start gap-2">
                  <Clock className="size-4 mt-0.5 text-default-400 shrink-0" />
                  <div>
                    <span className="text-default-400 block text-xs">Tiempo de reserva</span>
                    <span className="font-medium">{event.tiempo_espera} minutos</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-default-500 text-center mb-3">
              {!canSelectSeats
                ? 'Solo usuarios con rol USUARIO pueden seleccionar asientos.'
                : selectedSeats.length === 0
                ? 'Selecciona tus asientos en el mapa.'
                : `${selectedSeats.length} asiento${selectedSeats.length === 1 ? '' : 's'} seleccionado${selectedSeats.length === 1 ? '' : 's'}`}
            </p>

            {msRemaining !== null && (
              <div className="flex justify-center mb-3">
                <Chip
                  color={countdownColor}
                  variant="flat"
                  size="sm"
                  className="font-mono text-sm"
                >
                  {timeExpired ? 'Tiempo expirado' : `Tiempo: ${formatTimeRemaining(msRemaining)}`}
                </Chip>
              </div>
            )}

            {holdError && !holding && (
              <p className="text-xs text-danger text-center mb-2">{holdError}</p>
            )}

            <Button
              color="primary"
              size="lg"
              className="w-full"
              onPress={handleContinue}
              isDisabled={continueDisabled}
              isLoading={holding}
            >
              {holding
                ? 'Reservando...'
                : `Continuar${selectedSeats.length > 0 ? ` (${selectedSeats.length})` : ''}`}
            </Button>
          </Card>
        </div>
      </div>

      <div className="mt-2">
        <h2 className="text-xl font-bold mb-4">Mapa del recinto</h2>
        <Card className="p-4 overflow-hidden">
          {!canSelectSeats && (
            <div className="mb-3 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-700">
              Puedes ver la información de cada asiento al pasar el cursor. Solo cuentas con selección si inicias sesión con rol USUARIO.
            </div>
          )}
          <div className="flex items-center gap-4 mb-3 text-xs text-default-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#4a197f] inline-block" />
              {'Disponible'}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#f59e0b] inline-block" />
              {'En proceso'}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#94a3b8] inline-block" />
              {'Vendido'}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#2f3136] inline-block" />
              {'Escenario'}
            </div>
          </div>
          <MapaAsientos
            layoutId={Number(idLayout)}
            eventId={Number(event.id_evento)}
            onSelectionChange={handleSelectionChange}
            maxSelection={10}
            allowSelection={canSelectSeats}
          />
        </Card>
      </div>
    </div>
  );
}