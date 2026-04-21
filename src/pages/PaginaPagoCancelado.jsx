import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@heroui/react';

export default function PaginaPagoCancelado() {
  const navigate = useNavigate();
  const [checkoutState, setCheckoutState] = useState(null);

  useEffect(() => {
    // Recuperar el estado del checkout guardado antes de redirigir a Stripe
    const raw = sessionStorage.getItem('stripe_checkout_state');
    if (raw) {
      try {
        setCheckoutState(JSON.parse(raw));
      } catch {
        // ignorar si el JSON está corrupto
      }
    }
  }, []);

  const handleReintentar = () => {
    if (checkoutState) {
      sessionStorage.removeItem('stripe_checkout_state');
      navigate('/checkout', { state: checkoutState });
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warning-100 text-warning text-3xl mb-4 mx-auto">
          ✕
        </div>
        <h1 className="text-2xl font-bold mb-2">Pago cancelado</h1>
        <p className="text-default-500 mb-6">
          No se realizó ningún cargo. Tus asientos siguen reservados mientras el tiempo no expire.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          {checkoutState && (
            <Button color="primary" onPress={handleReintentar}>
              Intentar de nuevo
            </Button>
          )}
          <Button
            color="primary"
            variant="flat"
            onPress={() => navigate('/')}
          >
            Volver al inicio
          </Button>
        </div>
      </Card>
    </div>
  );
}
