import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button, Card, Chip, Spinner, toast } from '@heroui/react';
import { useAutenticacion } from '../hooks/usarAutenticacion';
import {
  obtenerOrdenesPorUsuario,
  obtenerOrdenDetalle,
} from '../services/ordenes.api';
import { descargarBoletoTxt } from '../utils/descargarBoleto';

/**
 * Pantalla de listado de órdenes/boletos del usuario.
 *
 * Se monta en dos rutas:
 *   - /mis-ordenes  → título "Mis órdenes" (historial de compras)
 *   - /mis-boletos  → título "Mis boletos" (vista orientada a uso)
 *
 * Ambas listan las mismas órdenes y ofrecen las mismas acciones:
 *   - Ver detalle de la orden → /confirmacion/:id
 *   - Descargar boleto → fetch al backend y genera .txt
 */
export default function PaginaMisOrdenes() {
  const { usuario } = useAutenticacion();
  const navigate = useNavigate();
  const location = useLocation();

  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [descargandoId, setDescargandoId] = useState(null);

  // Adaptar copy según la ruta donde se monte
  const vistaBoletos = location.pathname.startsWith('/mis-boletos');
  const titulo = vistaBoletos ? 'Mis boletos' : 'Mis órdenes';
  const vacioTexto = vistaBoletos
    ? 'Todavía no tienes boletos. ¡Compra tu primer evento!'
    : 'No tienes órdenes todavía.';

  const idUsuario = usuario?.idUsuario || usuario?.id_usuario || usuario?.id;

  useEffect(() => {
    if (!idUsuario) return;
    obtenerOrdenesPorUsuario(idUsuario)
      .then((data) => setOrdenes(data || []))
      .catch(() => setOrdenes([]))
      .finally(() => setCargando(false));
  }, [idUsuario]);

  const handleDescargar = async (idOrden) => {
    setDescargandoId(idOrden);
    try {
      const detalle = await obtenerOrdenDetalle(idOrden);
      descargarBoletoTxt(detalle);
      toast.success('Boleto descargado.');
    } catch (err) {
      const estado = err?.response?.status;
      const mensaje =
        estado === 404
          ? 'La orden no existe.'
          : estado === 403
          ? 'No tienes permiso para descargar esta orden.'
          : 'No se pudo descargar el boleto. Intenta de nuevo.';
      toast.error(mensaje);
    } finally {
      setDescargandoId(null);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{titulo}</h1>

      {ordenes.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-default-500">{vacioTexto}</p>
          <Link to="/" className="text-primary mt-2 inline-block">
            Explorar eventos
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordenes.map((orden) => {
            const idOrden = orden.id_orden ?? orden.id;
            const estatus = orden.estatus || 'pendiente';
            const esPagado = estatus === 'pagado';
            return (
              <Card key={idOrden} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">Orden #{idOrden}</span>
                      <Chip size="sm" color={esPagado ? 'success' : 'default'}>
                        {estatus}
                      </Chip>
                    </div>
                    {orden.fecha_creacion && (
                      <p className="text-xs text-default-400 mt-1">
                        {new Date(orden.fecha_creacion).toLocaleString('es-MX', {
                          dateStyle: 'long',
                          timeStyle: 'short',
                        })}
                      </p>
                    )}
                    <p className="text-sm text-default-600 mt-1 font-medium">
                      Total: ${Number(orden.total || 0).toLocaleString('es-MX')} MXN
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      onPress={() => navigate(`/confirmacion/${idOrden}`)}
                    >
                      Ver detalle
                    </Button>
                    <Button
                      size="sm"
                      color="primary"
                      onPress={() => handleDescargar(idOrden)}
                      isLoading={descargandoId === idOrden}
                      isDisabled={!esPagado || descargandoId === idOrden}
                    >
                      Descargar boleto
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
