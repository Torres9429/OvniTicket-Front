export const CELL_SIZE = 28;
export const CELL_SPACING = 32;
export const GRID_PADDING = 60;

export const COLORS = {
  SEAT_FREE: '#4a197f',
  SEAT_RESERVED: '#94a3b8',
  SEAT_HELD: '#f59e0b',
  SEAT_SELECTED: '#e11d48',
  SEAT_HIGHLIGHTED: '#22d3ee',
  STAGE: '#2f3136',
  AISLE: 'transparent',
  EMPTY: 'transparent',
  GRID_BACKGROUND: '#f8fafc',
  GRID_BORDER: '#cbd5e1',
};

export const CELL_TYPES = {
  EMPTY: 'VACÍO',
  AISLE: 'PASILLO',
  STAGE: 'ESCENARIO',
  SEAT_ZONE: 'ZONA DE ASIENTOS',
};

export const getGridWidth = (cols) => cols * CELL_SPACING + GRID_PADDING * 2;
export const getGridHeight = (rows) => rows * CELL_SPACING + GRID_PADDING * 2;
