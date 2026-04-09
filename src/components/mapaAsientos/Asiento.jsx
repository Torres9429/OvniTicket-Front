import React from 'react';
import { Circle } from './react-konva';
import { TAMANO_CELDA, COLORES } from './constantes';

function obtenerColor(reservado, seleccionado, colorZona) {
  if (seleccionado) return COLORES.ASIENTO_SELECCIONADO;
  if (reservado) return COLORES.ASIENTO_RESERVADO;
  return colorZona || COLORES.ASIENTO_LIBRE;
}

const Asiento = ({ x, y, dato, colorZona, esSeleccionado, onHover, onSeleccionar, onDeseleccionar }) => {
  const reservado = dato.estatus === 'reservado';

  return (
    <Circle
      x={x}
      y={y}
      radius={TAMANO_CELDA / 2}
      fill={obtenerColor(reservado, esSeleccionado, colorZona)}
      strokeWidth={1}
      stroke={esSeleccionado ? '#c53030' : 'transparent'}
      onMouseEnter={(e) => {
        e.target._clearCache();
        onHover(dato, e.target.getAbsolutePosition());
        const container = e.target.getStage().container();
        container.style.cursor = reservado ? 'not-allowed' : 'pointer';
      }}
      onMouseLeave={(e) => {
        onHover(null);
        e.target.getStage().container().style.cursor = '';
      }}
      onClick={() => {
        if (reservado) return;
        if (esSeleccionado) {
          onDeseleccionar(dato.id);
        } else {
          onSeleccionar(dato.id);
        }
      }}
      onTap={() => {
        if (reservado) return;
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
