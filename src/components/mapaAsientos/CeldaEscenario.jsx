import React from 'react';
import { Rect, Text, Group } from './react-konva';
import { ESPACIO_CELDAS, COLORES } from './constantes';

const CeldaEscenario = ({ x, y, ancho, alto }) => {
  return (
    <Group x={x} y={y}>
      <Rect
        width={ancho || ESPACIO_CELDAS}
        height={alto || ESPACIO_CELDAS}
        fill={COLORES.ESCENARIO}
        cornerRadius={4}
      />
      {ancho > ESPACIO_CELDAS * 2 && (
        <Text
          text="ESCENARIO"
          width={ancho}
          height={alto || ESPACIO_CELDAS}
          align="center"
          verticalAlign="middle"
          fill="white"
          fontSize={14}
          fontStyle="bold"
        />
      )}
    </Group>
  );
};

export default React.memo(CeldaEscenario);
