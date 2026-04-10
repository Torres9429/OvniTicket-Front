import { Group, Rect, Text, Circle } from '../mapaAsientos/react-konva';
import { ESPACIO_CELDAS } from '../mapaAsientos/constantes';

const SECTION_PADDING = 14;
const SEAT_SIZE = 16;

export default function SectionShape({
  section,
  zoneColor,
  isSelected,
  onSelect,
  onDoubleClick,
  onDragEnd,
  onTransformEnd,
  nodeRef,
}) {
  const rows = section.rows || [];
  const seatsPerRow = section.seatsPerRow || rows[0]?.seats?.length || 1;
  const numRows = section.numRows || rows.length || 1;
  const width = SECTION_PADDING * 2 + Math.max(1, seatsPerRow) * ESPACIO_CELDAS;
  const height = SECTION_PADDING * 2 + Math.max(1, numRows) * ESPACIO_CELDAS;

  return (
    <Group
      ref={nodeRef}
      x={section.x}
      y={section.y}
      rotation={section.rotation || 0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      <Rect
        width={width}
        height={height}
        cornerRadius={16}
        fill={zoneColor}
        opacity={0.12}
        stroke={isSelected ? '#4a197f' : zoneColor}
        strokeWidth={isSelected ? 2 : 1}
      />
      <Text
        text={section.nombre}
        x={SECTION_PADDING}
        y={8}
        width={width - SECTION_PADDING * 2}
        fontSize={14}
        fill="#0f172a"
        fontStyle="bold"
        align="center"
        listening={false}
      />
      {rows.map((row, rowIndex) =>
        (row.seats || []).map((seat, seatIndex) => {
          const x = SECTION_PADDING + seatIndex * ESPACIO_CELDAS;
          const y = SECTION_PADDING + rowIndex * ESPACIO_CELDAS + 18;
          return (
            <Group key={seat.id} listening={false}>
              <Circle x={x + SEAT_SIZE / 2} y={y + SEAT_SIZE / 2} radius={SEAT_SIZE / 2} fill={zoneColor} stroke="#ffffff" strokeWidth={1} />
              <Text
                text={seat.label}
                x={x - 6}
                y={y + 1}
                width={SEAT_SIZE + 12}
                fontSize={9}
                fill="#ffffff"
                align="center"
                listening={false}
              />
            </Group>
          );
        })
      )}
      <Text
        text={section.zoneId ? `Zona ${section.zoneId}` : 'Sin zona'}
        x={SECTION_PADDING}
        y={height - 22}
        width={width - SECTION_PADDING * 2}
        fontSize={11}
        fill="#334155"
        align="center"
        listening={false}
      />
    </Group>
  );
}
