import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button, Card, Chip, Spinner, toast } from '@heroui/react';
import {
  getOrdersByUser,
  getOrderDetail,
} from '../services/ordenes.api';
import { downloadTicketTxt } from '../utils/descargarBoleto';
import { useAuth } from '../hooks/useAuth';

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
  const { usuario: user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  // Adapt copy based on the route where this component is mounted
  const ticketView = location.pathname.startsWith('/mis-boletos');
  const title = ticketView ? 'Mis boletos' : 'Mis órdenes';
  const emptyText = ticketView
    ? 'Todavía no tienes boletos. ¡Compra tu primer evento!'
    : 'No tienes órdenes todavía.';

  const userId = user?.idUsuario || user?.id_usuario || user?.id;

  useEffect(() => {
    if (!userId) return;
    getOrdersByUser(userId)
      .then((data) => setOrders(data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleDownload = async (orderId) => {
    setDownloadingId(orderId);
    try {
      const detail = await getOrderDetail(orderId);
      downloadTicketTxt(detail);
      toast.success('Boleto descargado.');
    } catch (err) {
      const status = err?.response?.status;
      const getErrorMessage = () => {
        if (status === 404) return 'La orden no existe.';
        if (status === 403) return 'No tienes permiso para descargar esta orden.';
        return 'No se pudo descargar el boleto. Intenta de nuevo.';
      };
      toast.error(getErrorMessage());
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>

      {orders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-default-500">{emptyText}</p>
          <Link to="/" className="text-primary mt-2 inline-block">
            Explorar eventos
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const orderId = order.id_orden ?? order.id;
            const status = order.estatus || 'pendiente';
            const isPaid = status === 'pagado';
            return (
              <Card key={orderId} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">Orden #{orderId}</span>
                      <Chip size="sm" color={isPaid ? 'success' : 'default'}>
                        {status}
                      </Chip>
                    </div>
                    {order.fecha_creacion && (
                      <p className="text-xs text-default-400 mt-1">
                        {new Date(order.fecha_creacion).toLocaleString('es-MX', {
                          dateStyle: 'long',
                          timeStyle: 'short',
                        })}
                      </p>
                    )}
                    <p className="text-sm text-default-600 mt-1 font-medium">
                      Total: ${Number(order.total || 0).toLocaleString('es-MX')} MXN
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      onPress={() => navigate(`/confirmacion/${orderId}`)}
                    >
                      Ver detalle
                    </Button>
                    <Button
                      size="sm"
                      color="primary"
                      onPress={() => handleDownload(orderId)}
                      isLoading={downloadingId === orderId}
                      isDisabled={!isPaid || downloadingId === orderId}
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
