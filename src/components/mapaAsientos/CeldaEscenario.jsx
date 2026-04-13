import React from 'react';
import { Rect, Text, Group } from './react-konva';
import { CELL_SPACING, COLORS } from './constantes';

const CeldaEscenario = ({ x, y, width, height }) => {
  return (
    <Group x={x} y={y}>
      <Rect
        width={width || CELL_SPACING}
        height={height || CELL_SPACING}
        fill={COLORS.STAGE}
        cornerRadius={4}
      />
      {width > CELL_SPACING * 2 && (
        <Text
          text="ESCENARIO"
          width={width}
          height={height || CELL_SPACING}
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
