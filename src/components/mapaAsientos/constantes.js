export const TAMANO_CELDA = 28;
export const ESPACIO_CELDAS = 32;
export const PADDING_GRID = 60;

export const COLORES = {
  ASIENTO_LIBRE: '#4a197f',
  ASIENTO_RESERVADO: '#94a3b8',
  ASIENTO_SELECCIONADO: '#e11d48',
  ESCENARIO: '#2f3136',
  PASILLO: 'transparent',
  VACIO: 'transparent',
  FONDO_GRID: '#f8fafc',
  BORDE_GRID: '#cbd5e1',
};

export const TIPOS_CELDA = {
  VACIO: 'VACÍO',
  PASILLO: 'PASILLO',
  ESCENARIO: 'ESCENARIO',
  ZONA_ASIENTOS: 'ZONA DE ASIENTOS',
};

export const obtenerAnchoGrid = (cols) => cols * ESPACIO_CELDAS + PADDING_GRID * 2;
export const obtenerAltoGrid = (rows) => rows * ESPACIO_CELDAS + PADDING_GRID * 2;
