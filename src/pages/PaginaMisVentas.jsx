import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Chip, Spinner } from '@heroui/react';
import {
  ChartColumn,
  Ticket,
  ShoppingBag,
  Calendar,
  ArrowRotateLeft,
} from '@gravity-ui/icons';
import { obtenerMisVentas } from '../services/ordenes.api';

function formatoMoneda(n) {
  return `$${Number(n || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MXN`;
}

function formatoFechaCorta(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const CHIP_ESTATUS = {
  PUBLICADO: 'success',
  BORRADOR: 'warning',
  CANCELADO: 'danger',
  FINALIZADO: 'default',
};

function TarjetaKPI({ titulo, valor, icono, color = 'primary' }) {
  const colores = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    default: 'bg-default-100 text-default-700',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-default-500 uppercase tracking-wide">
            {titulo}
          </p>
          <p className="text-2xl font-bold mt-1">{valor}</p>
        </div>
        <div
          className={`p-3 rounded-lg ${colores[color] || colores.primary}`}
          aria-hidden="true"
        >
          {icono}
        </div>
      </div>
    </Card>
  );
}

function BarraOcupacion({ pct }) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  const color = p >= 80 ? 'bg-success' : p >= 40 ? 'bg-primary' : 'bg-default-400';
  return (
    <div className="w-full">
      <div className="h-2 bg-default-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${p}%` }}
        />
      </div>
      <p className="text-xs text-default-500 mt-1">{p.toFixed(1)}% vendido</p>
    </div>
  );
}

export default function PaginaMisVentas() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  // Incrementamos este valor cuando el usuario pulsa "Actualizar" para
  // re-disparar el efecto de carga sin llamar setState síncronamente.
  const [recargas, setRecargas] = useState(0);

  useEffect(() => {
    let cancelado = false;
    obtenerMisVentas()
      .then((data) => {
        if (cancelado) return;
        setDatos(data);
        setCargando(false);
      })
      .catch((err) => {
        if (cancelado) return;
        const status = err?.response?.status;
        setError(
          status === 403
            ? 'No tienes permiso para ver este dashboard.'
            : 'No se pudo cargar el dashboard de ventas.',
        );
        setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [recargas]);

  const recargar = () => {
    setCargando(true);
    setError(null);
    setDatos(null);
    setRecargas((n) => n + 1);
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" label="Cargando dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <div className="text-5xl mb-4 text-default-300">&#9432;</div>
        <h1 className="text-2xl font-bold mb-2">{error}</h1>
        <Button color="primary" onPress={recargar} className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  const resumen = datos?.resumen || {};
  const eventos = datos?.eventos || [];
  const ordenesRecientes = datos?.ordenes_recientes || [];

  const sinVentas = (resumen.boletos_vendidos || 0) === 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mis ventas</h1>
          <p className="text-sm text-default-500 mt-1">
            Resumen de ingresos y ocupación de tus eventos.
          </p>
        </div>
        <Button
          variant="flat"
          onPress={recargar}
          startContent={<ArrowRotateLeft className="size-4" />}
        >
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <TarjetaKPI
          titulo="Total vendido"
          valor={formatoMoneda(resumen.total_vendido)}
          icono={<ChartColumn className="size-5" />}
          color="success"
        />
        <TarjetaKPI
          titulo="Boletos vendidos"
          valor={resumen.boletos_vendidos ?? 0}
          icono={<Ticket className="size-5" />}
          color="primary"
        />
        <TarjetaKPI
          titulo="Órdenes pagadas"
          valor={resumen.ordenes_pagadas ?? 0}
          icono={<ShoppingBag className="size-5" />}
          color="primary"
        />
        <TarjetaKPI
          titulo="Eventos con ventas"
          valor={`${resumen.eventos_con_ventas ?? 0} / ${resumen.eventos_totales ?? 0}`}
          icono={<Calendar className="size-5" />}
          color="default"
        />
      </div>

      {sinVentas && eventos.length === 0 && (
        <Card className="p-8 text-center mb-8">
          <p className="text-default-500 mb-4">
            Todavía no tienes eventos. Cuando crees uno y se venda al menos un
            boleto, verás los datos aquí.
          </p>
          <Link to="/mis-eventos" className="text-primary font-medium">
            Crear mi primer evento →
          </Link>
        </Card>
      )}

      {eventos.length > 0 && (
        <>
          {/* Eventos */}
          <h2 className="text-lg font-semibold mb-3">
            Eventos ({eventos.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {eventos.map((ev) => (
              <Card key={ev.id_evento} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{ev.nombre}</h3>
                    <p className="text-xs text-default-500 mt-0.5">
                      {formatoFechaCorta(ev.fecha_inicio)}
                    </p>
                  </div>
                  <Chip
                    size="sm"
                    color={CHIP_ESTATUS[ev.estatus] || 'default'}
                  >
                    {ev.estatus}
                  </Chip>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-xs text-default-400">Revenue</p>
                    <p className="font-semibold text-success">
                      {formatoMoneda(ev.revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-default-400">Boletos</p>
                    <p className="font-semibold">
                      {ev.boletos_vendidos} / {ev.asientos_totales || '—'}
                    </p>
                  </div>
                </div>

                <BarraOcupacion pct={ev.ocupacion_pct} />
              </Card>
            ))}
          </div>
        </>
      )}

      {ordenesRecientes.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">Órdenes recientes</h2>
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-default-50 text-default-600 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Evento</th>
                    <th className="px-4 py-3 text-left">Comprador</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenesRecientes.map((o) => (
                    <tr
                      key={o.id_orden}
                      className="border-t border-default-100 hover:bg-default-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        #{o.id_orden}
                      </td>
                      <td className="px-4 py-3 text-default-500">
                        {formatoFechaCorta(o.fecha_creacion)}
                      </td>
                      <td className="px-4 py-3 font-medium truncate max-w-[180px]">
                        {o.nombre_evento}
                      </td>
                      <td className="px-4 py-3 text-default-500 truncate max-w-[180px]">
                        {o.comprador || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatoMoneda(o.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Chip
                          size="sm"
                          color={o.estatus === 'pagado' ? 'success' : 'default'}
                        >
                          {o.estatus}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
