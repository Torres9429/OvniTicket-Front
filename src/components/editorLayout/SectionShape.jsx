import PropTypes from 'prop-types';
import { Group, Rect, Text, Circle } from '../mapaAsientos/react-konva';
import { CELL_SPACING } from '../mapaAsientos/constantes';

const SECTION_PADDING = 14;
const SEAT_SIZE = 16;
const SECTION_HEADER_OFFSET = 18;

function getNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function SectionShape({
  section,
  zoneColor,
  isSelected,
  draggable = true,
  onSelect,
  onDoubleClick,
  onDragEnd,
  onTransformEnd,
  nodeRef,
  onSeatSelect,
  onSeatHover,
  onSeatDeselect,
}) {
  const rows = section.rows || [];
  const shouldUseIndexedRowY = !rows.some((row, rowIndex) =>
    (row.seats || []).some((seat) => {
      const seatY = getNumber(seat.y, rowIndex * CELL_SPACING);
      return Math.abs(seatY - rowIndex * CELL_SPACING) > 1;
    })
  );

  const getSeatX = (seat, seatIndex) => getNumber(seat.x, seatIndex * CELL_SPACING);
  const getSeatY = (seat, rowIndex) => {
    if (shouldUseIndexedRowY) {
      return rowIndex * CELL_SPACING;
    }
    return getNumber(seat.y, rowIndex * CELL_SPACING);
  };

  const seatCoordinates = rows.flatMap((row, rowIndex) =>
    (row.seats || []).map((seat, seatIndex) => ({
      x: getSeatX(seat, seatIndex),
      y: getSeatY(seat, rowIndex),
    }))
  );

  const maxSeatX = seatCoordinates.length > 0
    ? Math.max(...seatCoordinates.map((seat) => seat.x))
    : 0;
  const maxSeatY = seatCoordinates.length > 0
    ? Math.max(...seatCoordinates.map((seat) => seat.y))
    : 0;

  const width = SECTION_PADDING * 2 + Math.max(SEAT_SIZE, maxSeatX + SEAT_SIZE);
  const height =
    SECTION_PADDING * 2 +
    SECTION_HEADER_OFFSET +
    Math.max(SEAT_SIZE, maxSeatY + SEAT_SIZE) +
    16;  // Espacio extra para números de asiento debajo

  return (
    <Group
      ref={nodeRef}
      x={section.x}
      y={section.y}
      rotation={section.rotation || 0}
      draggable={draggable}
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
        text={section.nombre || `Sección`}
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
          const x = SECTION_PADDING + getSeatX(seat, seatIndex);
          const y = SECTION_PADDING + SECTION_HEADER_OFFSET + getSeatY(seat, rowIndex);
          const seatStatus = seat.status || 'libre';
          const isReserved = seatStatus === 'reservado';
          const isHeld = seatStatus === 'retenido';
          const seatFill = seat.selected
            ? '#e11d48'
            : isReserved
              ? '#94a3b8'
              : isHeld
                ? '#f59e0b'
                : seat.zoneColor || zoneColor;

          // Guard: no permitir seleccionar asientos reservados o retenidos de otros
          const isUnavailable = seatStatus === 'reservado' || seatStatus === 'retenido';

          return (
            <Group
              key={seat.id}
              onClick={() => {
                if (isUnavailable) return;
                onSeatSelect?.(seat);
              }}
              onTap={() => {
                if (isUnavailable) return;
                onSeatSelect?.(seat);
              }}
              onMouseEnter={(e) => {
                if (isUnavailable) {
                  e.target.getStage().container().style.cursor = 'not-allowed';
                }
                onSeatHover?.(seat, e.target.getAbsolutePosition());
              }}
              onMouseLeave={(e) => {
                e.target.getStage().container().style.cursor = '';
                onSeatHover?.(null);
              }}
              listening={Boolean(onSeatSelect || onSeatHover || onSeatDeselect)}
            >
              <Circle
                x={x + SEAT_SIZE / 2}
                y={y + SEAT_SIZE / 2}
                radius={SEAT_SIZE / 2}
                fill={seatFill}
                stroke="#ffffff"
                strokeWidth={1}
              />
              <Text
                text={`${row.label || (rowIndex + 1)}${seat.label || (seatIndex + 1)}`}
                x={x - 6}
                y={y + SEAT_SIZE + 2}
                width={SEAT_SIZE + 12}
                fontSize={8}
                fill="#475569"
                align="center"
                listening={false}
              />
            </Group>
          );
        })
      )}
      {/* Mostrar nombre de la zona (sacado del primer asiento si disponible) */}
      {(() => {
        const firstSeat = rows?.[0]?.seats?.[0];
        const zoneName = firstSeat?.zoneName || section.zoneName || section.nombre || '';
        return zoneName ? (
          <Text
            text={zoneName}
            x={SECTION_PADDING}
            y={height - 20}
            width={width - SECTION_PADDING * 2}
            fontSize={12}
            fill="#1e293b"
            fontStyle="bold"
            align="center"
            listening={false}
          />
        ) : null;
      })()}
    </Group>
  );
}

SectionShape.propTypes = {
  section: PropTypes.shape({
    rows: PropTypes.array,
    seatsPerRow: PropTypes.number,
    numRows: PropTypes.number,
    x: PropTypes.number,
    y: PropTypes.number,
    rotation: PropTypes.number,
    nombre: PropTypes.string,
    zoneId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  zoneColor: PropTypes.string.isRequired,
  isSelected: PropTypes.bool.isRequired,
  draggable: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onDoubleClick: PropTypes.func.isRequired,
  onDragEnd: PropTypes.func.isRequired,
  onTransformEnd: PropTypes.func.isRequired,
  nodeRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]),
  onSeatSelect: PropTypes.func,
  onSeatHover: PropTypes.func,
  onSeatDeselect: PropTypes.func,
};
