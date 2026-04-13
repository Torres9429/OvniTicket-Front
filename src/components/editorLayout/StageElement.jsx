import { Group, Rect, Text } from '../mapaAsientos/react-konva';
import PropTypes from 'prop-types';

const STYLE_BY_TYPE = {
  stage: {
    fill: '#2f3136',
    label: 'ESCENARIO',
  },
  aisle: {
    fill: '#94a3b8',
    label: 'PASILLO',
  },
};

export default function StageElement({
  element,
  isSelected,
  onSelect,
  onDragEnd,
  nodeRef,
}) {
  const style = STYLE_BY_TYPE[element.type] || STYLE_BY_TYPE.stage;

  return (
    <Group
      ref={nodeRef}
      x={element.x}
      y={element.y}
      rotation={element.rotation || 0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
    >
      <Rect
        width={element.width}
        height={element.height}
        cornerRadius={element.type === 'stage' ? 14 : 10}
        fill={style.fill}
        opacity={0.92}
        stroke={isSelected ? '#4a197f' : 'rgba(255,255,255,0.25)'}
        strokeWidth={isSelected ? 2 : 1}
      />
      <Text
        text={style.label}
        width={element.width}
        height={element.height}
        align="center"
        verticalAlign="middle"
        fill="#ffffff"
        fontSize={15}
        fontStyle="bold"
        listening={false}
      />
    </Group>
  );
}

StageElement.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    type: PropTypes.string,
    x: PropTypes.number,
    y: PropTypes.number,
    rotation: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onDragEnd: PropTypes.func.isRequired,
  nodeRef: PropTypes.func,
};

StageElement.defaultProps = {
  nodeRef: undefined,
};
