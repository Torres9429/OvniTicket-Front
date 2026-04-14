import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Card, Chip, Spinner, toast } from '@heroui/react';
import { ArrowLeft, MapPin, Calendar, Clock } from '@gravity-ui/icons';
import { getEvent } from '../services/eventos.api';
import { getVenue } from '../services/lugares.api';
import {
  getAvailability,
  holdSeats,
  releaseSeats,
  getHoldStatus,
} from '../services/asientos.api';
import { MapaAsientos } from '../components/mapaAsientos';
import { useAuth } from '../hooks/useAuth';

function formatTimeRemaining(ms) {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function PaginaDetalleEvento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [venue, setVenue] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── Selection + hold state (inline checkout entrypoint) ───
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [heldUntil, setHeldUntil] = useState(null); // ISO string or null
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

  // Load event + venue + availability
  useEffect(() => {
    async function load() {
      try {
        const ev = await getEvent(id);
        setEvent(ev);

        const [vn, avail] = await Promise.all([
          ev?.id_lugar ? getVenue(ev.id_lugar).catch(() => null) : null,
          ev?.id_evento ? getAvailability(ev.id_evento).catch(() => []) : [],
        ]);
        setVenue(vn);
        setAvailability(avail || []);
      } catch {
        // event not found
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // On mount (authenticated only): check if user already has an active hold
  useEffect(() => {
    if (!isAuthenticated || !event?.id_evento) return;
    getHoldStatus(Number(event.id_evento))
      .then((data) => {
        if (data?.retenido_hasta) {
          setHeldUntil(data.retenido_hasta);
        }
      })
      .catch(() => {
        // Non-fatal — user just won't see a pre-existing timer
      });
  }, [isAuthenticated, event?.id_evento]);

  // Debounced hold effect — fires whenever asientosSeleccionados changes
  useEffect(() => {
    if (!isAuthenticated || !event?.id_evento) return;

    // Skip the first render where selection is empty by default
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    const eventIdNum = Number(event.id_evento);

    if (selectedSeats.length === 0) {
      // User deselected everything — release hold only if there is one active
      if (heldUntilRef.current) {
        releaseSeats(eventIdNum).catch(() => {});
      }
      setHeldUntil(null);
      lastHeldSignatureRef.current = '';
      setHoldError(null);
      return;
    }

    const idsGridCell = selectedSeats
      .map((a) => Number(a.idCelda))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    const selectionSignature = idsGridCell.join('|');

    // Avoid resending hold if selection didn't change.
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
  }, [selectedSeats, isAuthenticated, event?.id_evento]);

  const handleSelectionChange = useCallback((nextSeats) => {
    const signature = (nextSeats || [])
      .map((a) => Number(a.idCelda))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)
      .join('|');

    if (signature === lastSelectionSignatureRef.current) return;
    lastSelectionSignatureRef.current = signature;
    setSelectedSeats(nextSeats || []);
  }, []);

  // Countdown interval — anchored to backend heldUntil
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

  // Unmount cleanup — release hold unless navigating to checkout
  useEffect(() => {
    const eventIdNum = event?.id_evento ? Number(event.id_evento) : null;
    return () => {
      if (eventIdNum && !navigatingToCheckoutRef.current) {
        releaseSeats(eventIdNum).catch(() => {});
      }
    };
  }, [event?.id_evento]);

  const handleContinue = () => {
    if (selectedSeats.length === 0 || !heldUntil) return;
    navigatingToCheckoutRef.current = true;
    navigate('/checkout', {
      state: {
        idEvento: Number(event.id_evento),
        idLayout: Number(event.id_version),
        asientos: selectedSeats,
        idsGridCell: selectedSeats.map((a) => a.idCelda),
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
        <h1 className="text-2xl font-bold mb-4">Event not found</h1>
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

  // Seat availability summary
  const totalSeats = availability ? availability.length : 0;
  const available = availability
    ? availability.filter((d) => d.estado === 'disponible').length
    : 0;
  const held = availability
    ? availability.filter((d) => d.estado === 'retenido').length
    : 0;
  const sold = availability
    ? availability.filter((d) => d.estado === 'vendido').length
    : 0;

  const isPublished = event.estatus === 'PUBLICADO';
  const hasLayout = !!event.id_version;

  const chipColor = {
    PUBLICADO: 'success',
    BORRADOR: 'warning',
    CANCELADO: 'danger',
    FINALIZADO: 'default',
  };

  // ─── Selection / hold derived state ───
  const timeExpired = msRemaining !== null && msRemaining <= 0;
  const continueDisabled =
    selectedSeats.length === 0 ||
    !heldUntil ||
    timeExpired ||
    holding;

  const getCountdownColor = () => {
    if (msRemaining > 3 * 60 * 1000) return 'success';
    if (msRemaining > 60 * 1000) return 'warning';
    return 'danger';
  };
  const countdownColor = getCountdownColor();

  const maxMapSelection = isPublished && isAuthenticated ? 10 : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <Button
        variant="flat"
        onPress={() => navigate(-1)}
        className="mb-4"
        startContent={<ArrowLeft className="size-4" />}
      >
        Volver
      </Button>

      {/* Hero: image + info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
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

        {/* Info sidebar */}
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
              <div>
                <span className="text-default-400 block text-xs mb-1">Estado</span>
                <Chip
                  size="sm"
                  color={chipColor[event.estatus] || 'default'}
                >
                  {event.estatus}
                </Chip>
              </div>
            </div>
          </Card>

          {/* Venue card */}
          {venue && (
            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-3">Lugar</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 mt-0.5 text-default-400 shrink-0" />
                  <div>
                    <span className="font-medium block">{venue.nombre}</span>
                    <span className="text-default-500 text-xs">
                      {venue.direccion}
                    </span>
                    <span className="text-default-400 block text-xs">
                      {venue.ciudad}, {venue.pais}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Availability summary */}
          {isPublished && totalSeats > 0 && (
            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-3">Disponibilidad</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#4a197f] inline-block" />
                    <span>Disponibles</span>
                  </div>
                  <span className="font-semibold">{available}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#f59e0b] inline-block" />
                    <span>En proceso</span>
                  </div>
                  <span className="font-semibold">{held}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#94a3b8] inline-block" />
                    <span>Vendidos</span>
                  </div>
                  <span className="font-semibold">{sold}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between text-sm font-medium">
                  <span>Total asientos</span>
                  <span>{totalSeats}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Sidebar CTA — changes with auth/hold state */}
          {!isPublished && (
            <Card className="p-4 bg-warning-50 border border-warning-200">
              <p className="text-sm text-warning-700 text-center">
                Este evento no esta disponible para compra ({event.estatus}).
              </p>
            </Card>
          )}

          {isPublished && hasLayout && !isAuthenticated && (
            <Card className="p-4 bg-default-50 border border-default-200">
              <p className="text-sm text-default-700 text-center mb-3">
                Inicia sesión para seleccionar asientos.
              </p>
              <Button
                as={Link}
                to="/iniciar-sesion"
                color="primary"
                size="lg"
                className="w-full"
              >
                Iniciar sesión
              </Button>
            </Card>
          )}

          {isPublished && hasLayout && isAuthenticated && (
            <Card className="p-4">
              <p className="text-sm text-default-500 text-center mb-3">
                {(() => {
                  if (selectedSeats.length === 0) return 'Selecciona tus asientos en el mapa.';
                  const plural = selectedSeats.length === 1 ? '' : 's';
                  return `${selectedSeats.length} asiento${plural} seleccionado${plural}`;
                })()}
              </p>

              {msRemaining !== null && (
                <div className="flex justify-center mb-3">
                  <Chip
                    color={countdownColor}
                    variant="flat"
                    size="sm"
                    className="font-mono text-sm"
                  >
                    {(() => {
                      if (timeExpired) return 'Tiempo expirado';
                      return `Tiempo: ${formatTimeRemaining(msRemaining)}`;
                    })()}
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
                {(() => {
                  if (holding) return 'Reservando...';
                  const countSuffix = selectedSeats.length > 0 ? ` (${selectedSeats.length})` : '';
                  return `Continuar${countSuffix}`;
                })()}
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Seat map — interactive when authenticated & published */}
      {hasLayout && (
        <div className="mt-2">
          <h2 className="text-xl font-bold mb-4">Mapa del recinto</h2>
          <Card className="p-4 overflow-hidden">
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
              layoutId={Number(event.id_version)}
              eventId={isPublished ? Number(event.id_evento) : null}
              onSelectionChange={handleSelectionChange}
              maxSelection={maxMapSelection}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
