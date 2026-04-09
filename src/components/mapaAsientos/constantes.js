export const TAMANO_CELDA = 28;
export const ESPACIO_CELDAS = 32;
export const PADDING_GRID = 60;

export const COLORES = {
  ASIENTO_LIBRE: '#1b728d',
  ASIENTO_RESERVADO: '#a0aec0',
  ASIENTO_SELECCIONADO: '#e53e3e',
  ESCENARIO: '#4a5568',
  PASILLO: 'transparent',
  VACIO: 'transparent',
  FONDO_GRID: '#f7fafc',
  BORDE_GRID: '#e2e8f0',
};

export const TIPOS_CELDA = {
  VACIO: 'VACÍO',
  PASILLO: 'PASILLO',
  ESCENARIO: 'ESCENARIO',
  ZONA_ASIENTOS: 'ZONA DE ASIENTOS',
};

export const obtenerAnchoGrid = (cols) => cols * ESPACIO_CELDAS + PADDING_GRID * 2;
export const obtenerAltoGrid = (rows) => rows * ESPACIO_CELDAS + PADDING_GRID * 2;
