import React from 'react';
import { Circle } from './react-konva';
import { TAMANO_CELDA, COLORES } from './constantes';

function obtenerColor(estatus, seleccionado, colorZona) {
  if (seleccionado) return COLORES.ASIENTO_SELECCIONADO;
  if (estatus === 'reservado') return COLORES.ASIENTO_RESERVADO;
  if (estatus === 'retenido') return COLORES.ASIENTO_RETENIDO;
  return colorZona || COLORES.ASIENTO_LIBRE;
}

const Asiento = ({ x, y, dato, colorZona, esSeleccionado, onHover, onSeleccionar, onDeseleccionar }) => {
  const noDisponible = dato.estatus === 'reservado' || dato.estatus === 'retenido';

  return (
    <Circle
      x={x}
      y={y}
      radius={TAMANO_CELDA / 2}
      fill={obtenerColor(dato.estatus, esSeleccionado, colorZona)}
      strokeWidth={1}
      stroke={esSeleccionado ? '#c53030' : 'transparent'}
      onMouseEnter={(e) => {
        e.target._clearCache();
        onHover(dato, e.target.getAbsolutePosition());
        const container = e.target.getStage().container();
        container.style.cursor = noDisponible ? 'not-allowed' : 'pointer';
      }}
      onMouseLeave={(e) => {
        onHover(null);
        e.target.getStage().container().style.cursor = '';
      }}
      onClick={() => {
        if (noDisponible) return;
        if (esSeleccionado) {
          onDeseleccionar(dato.id);
        } else {
          onSeleccionar(dato.id);
        }
      }}
      onTap={() => {
        if (noDisponible) return;
        if (esSeleccionado) {
          onDeseleccionar(dato.id);
        } else {
          onSeleccionar(dato.id);
        }
      }}
    />
  );
};

export default React.memo(Asiento);
