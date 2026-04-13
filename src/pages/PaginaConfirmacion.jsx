import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button, Card, Chip, Spinner } from '@heroui/react';
import { obtenerOrdenDetalle } from '../services/ordenes.api';
import { descargarBoletoTxt } from '../utils/descargarBoleto';

export default function PaginaConfirmacion() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Hint payload from checkout navigation (optional, for instant paint).
  const hint = location.state || {};

  // Authoritative data fetched from backend.
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(Boolean(id));
  const [error, setError] = useState(
    id ? null : 'No se especificó un número de orden.',
  );

  useEffect(() => {
    if (!id) return;
    let cancelado = false;
    obtenerOrdenDetalle(id)
      .then((data) => {
        if (cancelado) return;
        setDatos(data);
        setCargando(false);
      })
      .catch((err) => {
        if (cancelado) return;
        const status = err?.response?.status;
        const mensaje =
          status === 404
            ? 'La orden no existe.'
            : status === 403
            ? 'No tienes permiso para ver esta orden.'
            : 'No se pudo cargar la orden. Inténtalo de nuevo.';
        setError(mensaje);
        setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  if (cargando) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" label="Cargando confirmación..." />
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center">
        <div className="text-5xl mb-4 text-default-300">&#9432;</div>
        <h1 className="text-2xl font-bold mb-2">
          {error || 'No se pudo cargar la confirmación'}
        </h1>
        <p className="text-default-500 mb-6">
          Puedes consultar tus órdenes en el siguiente enlace.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button
            color="primary"
            variant="flat"
            onPress={() => navigate('/mis-ordenes')}
          >
            Ver mis ordenes
          </Button>
          <Button color="primary" onPress={() => navigate('/')}>
            Ir al inicio
          </Button>
        </div>
      </div>
    );
  }

  const { orden, tickets = [], evento } = datos;

  const idOrden = orden.id_orden ?? 'N/A';
  const estatus = orden.estatus || 'pagado';
  const totalBackend = Number(orden.total || 0);
  const transactionId = hint.transactionId || null;

  const filasBoletos = tickets.map((t) => ({
    key: t.id_ticket,
    etiqueta: t.label || `Ticket #${t.id_ticket}`,
    zona: t.zona || 'General',
    precio: t.precio != null ? Number(t.precio) : null,
  }));

  // Sanity check: sum of ticket prices must equal orden.total. If they differ
  // the backend has a data-consistency bug and we surface it.
  const totalCalculado = filasBoletos.reduce(
    (sum, b) => sum + (Number(b.precio) || 0),
    0,
  );
  const hayInconsistencia =
    filasBoletos.length > 0 && Math.abs(totalCalculado - totalBackend) > 0.01;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Encabezado de éxito */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-100 text-success text-3xl mb-4"
          aria-hidden="true"
        >
          &#10003;
        </div>
        <h1 className="text-2xl font-bold text-success">Compra confirmada</h1>
        <p className="text-default-500 mt-1">
          Tu compra fue procesada exitosamente. ¡Disfruta el evento!
        </p>
      </div>

      {/* Detalles de la orden */}
      <Card className="p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">Detalles de la orden</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-default-500">Número de orden</span>
            <span className="font-medium font-mono">#{idOrden}</span>
          </div>

          {transactionId && (
            <div className="flex justify-between">
              <span className="text-default-500">ID de transacción</span>
              <span className="font-medium font-mono text-xs">{transactionId}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-default-500">Evento</span>
            <span className="font-medium">{evento?.nombre || 'Evento'}</span>
          </div>

          {evento?.fecha_inicio && (
            <div className="flex justify-between">
              <span className="text-default-500">Fecha</span>
              <span className="font-medium">
                {new Date(evento.fecha_inicio).toLocaleString('es-MX', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-default-500">Boletos</span>
            <span className="font-medium">{filasBoletos.length}</span>
          </div>

          <div className="flex justify-between items-center border-t pt-2 mt-2">
            <span className="text-default-500">Total pagado</span>
            <span className="font-bold text-base">
              ${totalBackend.toLocaleString('es-MX')} MXN
            </span>
          </div>

          {hayInconsistencia && (
            <p className="text-xs text-warning-600 mt-1">
              Nota: la suma de boletos (${totalCalculado.toLocaleString('es-MX')})
              no coincide con el total guardado (${totalBackend.toLocaleString('es-MX')}).
              Contacta soporte.
            </p>
          )}

          <div className="flex justify-between items-center">
            <span className="text-default-500">Estado</span>
            <Chip color="success" size="sm" variant="flat">
              {estatus}
            </Chip>
          </div>
        </div>
      </Card>

      {/* Lista de boletos */}
      {filasBoletos.length > 0 && (
        <Card className="p-5 mb-6">
          <h2 className="text-lg font-semibold mb-3">
            Tus boletos ({filasBoletos.length})
          </h2>
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {filasBoletos.map((boleto) => (
              <li
                key={boleto.key}
                className="flex justify-between items-center text-sm py-1 border-b border-default-100 last:border-0"
              >
                <span className="font-medium">{boleto.etiqueta}</span>
                <span className="text-right text-default-500">
                  <span className="block">{boleto.zona}</span>
                  {boleto.precio != null && (
                    <span className="text-default-700">
                      ${boleto.precio.toLocaleString('es-MX')} MXN
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Descarga de boleto */}
      <div className="flex justify-center mt-4 mb-6">
        <Button
          color="primary"
          variant="flat"
          onPress={() => descargarBoletoTxt(datos, transactionId)}
        >
          Descargar boleto
        </Button>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 justify-center flex-wrap">
        <Button
          color="primary"
          variant="flat"
          onPress={() => navigate('/mis-ordenes')}
        >
          Ver mis ordenes
        </Button>
        <Button color="primary" onPress={() => navigate('/')}>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
