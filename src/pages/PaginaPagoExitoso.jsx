import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Spinner } from '@heroui/react';
import { getOrders } from '../services/ordenes.api';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 20000;

export default function PaginaPagoExitoso() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState('procesando'); // 'procesando' | 'encontrado' | 'timeout'
  const [orderId, setOrderId] = useState(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    const inicio = Date.now();

    const buscarOrden = async () => {
      try {
        const orders = await getOrders();
        const lista = Array.isArray(orders) ? orders : orders?.results ?? [];

        // Busca la orden pagada más reciente creada en los últimos 3 minutos
        const tresMinutosAtras = Date.now() - 3 * 60 * 1000;
        const reciente = lista
          .filter(
            (o) =>
              o.estatus === 'pagado' &&
              new Date(o.fecha_creacion).getTime() > tresMinutosAtras
          )
          .sort((a, b) => b.id_orden - a.id_orden)[0];

        if (reciente) {
          clearTimeout(pollingRef.current);
          setOrderId(reciente.id_orden);
          setEstado('encontrado');
          // Pausa breve para que el usuario vea el mensaje de éxito
          setTimeout(() => navigate(`/confirmacion/${reciente.id_orden}`), 1500);
          return;
        }
      } catch {
        // Silenciar errores de red durante el polling; se reintenta
      }

      if (Date.now() - inicio >= POLL_TIMEOUT_MS) {
        setEstado('timeout');
        return;
      }

      pollingRef.current = setTimeout(buscarOrden, POLL_INTERVAL_MS);
    };

    // Primera consulta con un pequeño retardo para darle tiempo al webhook
    pollingRef.current = setTimeout(buscarOrden, 1500);

    // Limpiar sesión de checkout
    sessionStorage.removeItem('stripe_checkout_state');

    return () => clearTimeout(pollingRef.current);
  }, [navigate]);

  // --- Estado: procesando ---
  if (estado === 'procesando') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 p-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-100 text-success text-4xl">
          ✓
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-success mb-1">¡Pago exitoso!</h1>
          <p className="text-default-500">Estamos procesando tu orden...</p>
        </div>
        <Spinner size="md" label="Verificando tu compra" />
      </div>
    );
  }

  // --- Estado: encontrado (transición rápida) ---
  if (estado === 'encontrado') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 p-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-100 text-success text-4xl">
          ✓
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-success mb-1">¡Compra confirmada!</h1>
          <p className="text-default-500">
            Orden #{orderId} lista. Redirigiendo...
          </p>
        </div>
        <Spinner size="sm" />
      </div>
    );
  }

  // --- Estado: timeout (webhook demorado o error) ---
  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-100 text-success text-3xl mb-4 mx-auto">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-success mb-2">¡Pago recibido!</h1>
        <p className="text-default-500 mb-2">
          Tu pago fue procesado por Stripe correctamente.
        </p>
        <p className="text-sm text-default-400 mb-6">
          Tu orden está siendo generada. Puede tomar unos segundos más en aparecer.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button
            color="primary"
            onPress={() => navigate('/mis-ordenes')}
          >
            Ver mis órdenes
          </Button>
          <Button
            color="primary"
            variant="flat"
            onPress={() => navigate('/')}
          >
            Ir al inicio
          </Button>
        </div>
      </Card>
    </div>
  );
}
