import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Card, Chip, Spinner, toast } from '@heroui/react';
import { ArrowLeft, MapPin, Calendar, Clock } from '@gravity-ui/icons';
import { obtenerEvento } from '../services/eventos.api';
import { obtenerLugar } from '../services/lugares.api';
import {
  obtenerDisponibilidad,
  retenerAsientos,
  liberarAsientos,
  obtenerEstadoHold,
} from '../services/asientos.api';
import { MapaAsientos } from '../components/mapaAsientos';
import { useAutenticacion } from '../hooks/usarAutenticacion';

function formatearTiempoRestante(ms) {
  if (ms <= 0) return '0:00';
  const totalSegundos = Math.floor(ms / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${minutos}:${segundos.toString().padStart(2, '0')}`;
}

export default function PaginaDetalleEvento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { esAutenticado } = useAutenticacion();

  const [evento, setEvento] = useState(null);
  const [lugar, setLugar] = useState(null);
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [cargando, setCargando] = useState(true);

  // ─── Selection + hold state (inline checkout entrypoint) ───
  const [asientosSeleccionados, setAsientosSeleccionados] = useState([]);
  const [retenidoHasta, setRetenidoHasta] = useState(null); // ISO string or null
  const [reteniendo, setReteniendo] = useState(false);
  const [errorHold, setErrorHold] = useState(null);
  const [msRestantes, setMsRestantes] = useState(null);

  const primerRenderRef = useRef(true);
  const navegandoACheckoutRef = useRef(false);
  const retenidoHastaRef = useRef(null);
  const ultimaFirmaRetenidaRef = useRef('');
  const ultimaFirmaSeleccionRef = useRef('');

  useEffect(() => {
    retenidoHastaRef.current = retenidoHasta;
  }, [retenidoHasta]);

  // Load event + venue + availability
  useEffect(() => {
    async function cargar() {
      try {
        const ev = await obtenerEvento(id);
        setEvento(ev);

        const [lg, disp] = await Promise.all([
          ev?.id_lugar ? obtenerLugar(ev.id_lugar).catch(() => null) : null,
          ev?.id_evento ? obtenerDisponibilidad(ev.id_evento).catch(() => []) : [],
        ]);
        setLugar(lg);
        setDisponibilidad(disp || []);
      } catch {
        // event not found
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [id]);

  // On mount (authenticated only): check if user already has an active hold
  useEffect(() => {
    if (!esAutenticado || !evento?.id_evento) return;
    obtenerEstadoHold(Number(evento.id_evento))
      .then((data) => {
        if (data?.tiene_retencion && data?.retenido_hasta) {
          setRetenidoHasta(data.retenido_hasta);
        } else if (data?.retenido_hasta) {
          // Accept either {tiene_retencion, retenido_hasta} or {retenido_hasta, ids_grid_cell}
          setRetenidoHasta(data.retenido_hasta);
        }
      })
      .catch(() => {
        // Non-fatal — user just won't see a pre-existing timer
      });
  }, [esAutenticado, evento?.id_evento]);

  // Debounced hold effect — fires whenever asientosSeleccionados changes
  useEffect(() => {
    if (!esAutenticado || !evento?.id_evento) return;

    // Skip the first render where selection is empty by default
    if (primerRenderRef.current) {
      primerRenderRef.current = false;
      return;
    }

    const idEventoNum = Number(evento.id_evento);

    if (asientosSeleccionados.length === 0) {
      // User deselected everything — release hold only if there is one active
      if (retenidoHastaRef.current) {
        liberarAsientos(idEventoNum).catch(() => {});
      }
      setRetenidoHasta(null);
      ultimaFirmaRetenidaRef.current = '';
      setErrorHold(null);
      return;
    }

    const idsGridCell = asientosSeleccionados
      .map((a) => Number(a.idCelda))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    const firmaSeleccion = idsGridCell.join('|');

    // Evita reenviar retención si no cambió la selección.
    if (firmaSeleccion && firmaSeleccion === ultimaFirmaRetenidaRef.current) {
      return;
    }

    setReteniendo(true);
    setErrorHold(null);

    const timer = setTimeout(async () => {
      try {
        const respuesta = await retenerAsientos(idEventoNum, idsGridCell);
        ultimaFirmaRetenidaRef.current = firmaSeleccion;
        setRetenidoHasta(respuesta.retenido_hasta);
      } catch (err) {
        const mensaje =
          err?.response?.data?.error || 'No se pudieron retener los asientos.';
        setErrorHold(mensaje);
        toast.error(mensaje);
      } finally {
        setReteniendo(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      setReteniendo(false);
    };
  }, [asientosSeleccionados, esAutenticado, evento?.id_evento]);

  const handleSeleccionCambia = useCallback((nextAsientos) => {
    const firma = (nextAsientos || [])
      .map((a) => Number(a.idCelda))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)
      .join('|');

    if (firma === ultimaFirmaSeleccionRef.current) return;
    ultimaFirmaSeleccionRef.current = firma;
    setAsientosSeleccionados(nextAsientos || []);
  }, []);

  // Countdown interval — anchored to backend retenidoHasta
  useEffect(() => {
    if (!retenidoHasta) {
      setMsRestantes(null);
      return;
    }

    const tick = () => {
      const ms = new Date(retenidoHasta) - Date.now();
      setMsRestantes(Math.max(0, ms));
    };
    tick();
    const intervalo = setInterval(tick, 500);
    return () => clearInterval(intervalo);
  }, [retenidoHasta]);

  // Unmount cleanup — release hold unless navigating to checkout
  useEffect(() => {
    const idEventoNum = evento?.id_evento ? Number(evento.id_evento) : null;
    return () => {
      if (idEventoNum && !navegandoACheckoutRef.current) {
        liberarAsientos(idEventoNum).catch(() => {});
      }
    };
  }, [evento?.id_evento]);

  const handleContinuar = () => {
    if (asientosSeleccionados.length === 0 || !retenidoHasta) return;
    navegandoACheckoutRef.current = true;
    navigate('/checkout', {
      state: {
        idEvento: Number(evento.id_evento),
        idLayout: Number(evento.id_version),
        asientos: asientosSeleccionados,
        idsGridCell: asientosSeleccionados.map((a) => a.idCelda),
        retenidoHasta,
      },
    });
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Evento no encontrado</h1>
        <Button as={Link} to="/" color="primary">
          Volver al inicio
        </Button>
      </div>
    );
  }

  const fechaInicio = evento.fecha_inicio
    ? new Date(evento.fecha_inicio).toLocaleString('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : null;

  const fechaFin = evento.fecha_fin
    ? new Date(evento.fecha_fin).toLocaleString('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : null;

  // Seat availability summary
  const totalAsientos = disponibilidad ? disponibilidad.length : 0;
  const disponibles = disponibilidad
    ? disponibilidad.filter((d) => d.estado === 'disponible').length
    : 0;
  const retenidos = disponibilidad
    ? disponibilidad.filter((d) => d.estado === 'retenido').length
    : 0;
  const vendidos = disponibilidad
    ? disponibilidad.filter((d) => d.estado === 'vendido').length
    : 0;

  const esPublicado = evento.estatus === 'PUBLICADO';
  const tieneLayout = !!evento.id_version;

  const chipColor = {
    PUBLICADO: 'success',
    BORRADOR: 'warning',
    CANCELADO: 'danger',
    FINALIZADO: 'default',
  };

  // ─── Selection / hold derived state ───
  const tiempoExpirado = msRestantes !== null && msRestantes <= 0;
  const continuarDeshabilitado =
    asientosSeleccionados.length === 0 ||
    !retenidoHasta ||
    tiempoExpirado ||
    reteniendo;

  const colorCuentaRegresiva =
    msRestantes > 3 * 60 * 1000
      ? 'success'
      : msRestantes > 60 * 1000
      ? 'warning'
      : 'danger';

  const maxSeleccionMapa = esPublicado && esAutenticado ? 10 : 0;

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
          {evento.foto ? (
            <img
              src={evento.foto}
              alt={evento.nombre}
              className="w-full h-72 object-cover rounded-xl mb-4"
            />
          ) : (
            <div className="w-full h-72 bg-default-100 rounded-xl mb-4 flex items-center justify-center">
              <span className="text-default-400 text-lg">Sin imagen</span>
            </div>
          )}
          <h1 className="text-3xl font-bold">{evento.nombre}</h1>
          {evento.descripcion && (
            <p className="text-default-500 mt-2 text-base">{evento.descripcion}</p>
          )}
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-3">Detalles del evento</h2>
            <div className="space-y-4 text-sm">
              {fechaInicio && (
                <div className="flex items-start gap-2">
                  <Calendar className="size-4 mt-0.5 text-default-400 shrink-0" />
                  <div>
                    <span className="text-default-400 block text-xs">Inicio</span>
                    <span className="font-medium">{fechaInicio}</span>
                  </div>
                </div>
              )}
              {fechaFin && (
                <div className="flex items-start gap-2">
                  <Calendar className="size-4 mt-0.5 text-default-400 shrink-0" />
                  <div>
                    <span className="text-default-400 block text-xs">Fin</span>
                    <span className="font-medium">{fechaFin}</span>
                  </div>
                </div>
              )}
              {evento.tiempo_espera > 0 && (
                <div className="flex items-start gap-2">
                  <Clock className="size-4 mt-0.5 text-default-400 shrink-0" />
                  <div>
                    <span className="text-default-400 block text-xs">Tiempo de reserva</span>
                    <span className="font-medium">{evento.tiempo_espera} minutos</span>
                  </div>
                </div>
              )}
              <div>
                <span className="text-default-400 block text-xs mb-1">Estado</span>
                <Chip
                  size="sm"
                  color={chipColor[evento.estatus] || 'default'}
                >
                  {evento.estatus}
                </Chip>
              </div>
            </div>
          </Card>

          {/* Venue card */}
          {lugar && (
            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-3">Lugar</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 mt-0.5 text-default-400 shrink-0" />
                  <div>
                    <span className="font-medium block">{lugar.nombre}</span>
                    <span className="text-default-500 text-xs">
                      {lugar.direccion}
                    </span>
                    <span className="text-default-400 block text-xs">
                      {lugar.ciudad}, {lugar.pais}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Availability summary */}
          {esPublicado && totalAsientos > 0 && (
            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-3">Disponibilidad</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#4a197f] inline-block" />
                    <span>Disponibles</span>
                  </div>
                  <span className="font-semibold">{disponibles}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#f59e0b] inline-block" />
                    <span>En proceso</span>
                  </div>
                  <span className="font-semibold">{retenidos}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#94a3b8] inline-block" />
                    <span>Vendidos</span>
                  </div>
                  <span className="font-semibold">{vendidos}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between text-sm font-medium">
                  <span>Total asientos</span>
                  <span>{totalAsientos}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Sidebar CTA — changes with auth/hold state */}
          {!esPublicado && (
            <Card className="p-4 bg-warning-50 border border-warning-200">
              <p className="text-sm text-warning-700 text-center">
                Este evento no esta disponible para compra ({evento.estatus}).
              </p>
            </Card>
          )}

          {esPublicado && tieneLayout && !esAutenticado && (
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

          {esPublicado && tieneLayout && esAutenticado && (
            <Card className="p-4">
              <p className="text-sm text-default-500 text-center mb-3">
                {asientosSeleccionados.length === 0
                  ? 'Selecciona tus asientos en el mapa.'
                  : `${asientosSeleccionados.length} asiento${
                      asientosSeleccionados.length !== 1 ? 's' : ''
                    } seleccionado${asientosSeleccionados.length !== 1 ? 's' : ''}`}
              </p>

              {msRestantes !== null && (
                <div className="flex justify-center mb-3">
                  <Chip
                    color={colorCuentaRegresiva}
                    variant="flat"
                    size="sm"
                    className="font-mono text-sm"
                  >
                    {tiempoExpirado
                      ? 'Tiempo expirado'
                      : `Tiempo: ${formatearTiempoRestante(msRestantes)}`}
                  </Chip>
                </div>
              )}

              {errorHold && !reteniendo && (
                <p className="text-xs text-danger text-center mb-2">{errorHold}</p>
              )}

              <Button
                color="primary"
                size="lg"
                className="w-full"
                onPress={handleContinuar}
                isDisabled={continuarDeshabilitado}
                isLoading={reteniendo}
              >
                {reteniendo
                  ? 'Reservando...'
                  : `Continuar${
                      asientosSeleccionados.length > 0
                        ? ` (${asientosSeleccionados.length})`
                        : ''
                    }`}
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Seat map — interactive when authenticated & published */}
      {tieneLayout && (
        <div className="mt-2">
          <h2 className="text-xl font-bold mb-4">Mapa del recinto</h2>
          <Card className="p-4 overflow-hidden">
            <div className="flex items-center gap-4 mb-3 text-xs text-default-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#4a197f] inline-block" />
                Disponible
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#f59e0b] inline-block" />
                En proceso
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#94a3b8] inline-block" />
                Vendido
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#2f3136] inline-block" />
                Escenario
              </div>
            </div>
            <MapaAsientos
              idLayout={Number(evento.id_version)}
              idEvento={esPublicado ? Number(evento.id_evento) : null}
              onSeleccionCambia={handleSeleccionCambia}
              maxSeleccion={maxSeleccionMapa}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
