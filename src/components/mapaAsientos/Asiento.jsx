import React from 'react';
import { Circle } from './react-konva';
import { CELL_SIZE, COLORS } from './constantes';

function getColor(status, selected, zoneColor) {
  if (selected) return COLORS.SEAT_SELECTED;
  if (status === 'reservado') return COLORS.SEAT_RESERVED;
  if (status === 'retenido') return COLORS.SEAT_HELD;
  return zoneColor || COLORS.SEAT_FREE;
}

const Asiento = ({ x, y, data, zoneColor, isSelected, onHover, onSelect, onDeselect }) => {
  const unavailable = data.estatus === 'reservado' || data.estatus === 'retenido';

  return (
    <Circle
      x={x}
      y={y}
      radius={CELL_SIZE / 2}
      fill={getColor(data.estatus, isSelected, zoneColor)}
      strokeWidth={1}
      stroke={isSelected ? '#c53030' : 'transparent'}
      onMouseEnter={(e) => {
        e.target._clearCache();
        onHover(data, e.target.getAbsolutePosition());
        const container = e.target.getStage().container();
        container.style.cursor = unavailable ? 'not-allowed' : 'pointer';
      }}
      onMouseLeave={(e) => {
        onHover(null);
        e.target.getStage().container().style.cursor = '';
      }}
      onClick={() => {
        if (unavailable) return;
        if (isSelected) {
          onDeselect(data.id);
        } else {
          onSelect(data.id);
        }
      }}
      onTap={() => {
        if (unavailable) return;
        if (isSelected) {
          onDeselect(data.id);
        } else {
          onSelect(data.id);
        }
      }}
    />
  );
};

export default React.memo(Asiento);
