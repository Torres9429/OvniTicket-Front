import { ESPACIO_CELDAS, PADDING_GRID, TIPOS_CELDA } from '../mapaAsientos/constantes';

const DEFAULT_CANVAS_WIDTH = 1000;
const DEFAULT_CANVAS_HEIGHT = 800;

export function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getRowLabel(index) {
  let label = '';
  let value = index;
  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return label;
}

function getSeatLabel(index) {
  return String(index + 1);
}

function getNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function createDefaultLayout() {
  return {
    version: 1,
    canvasWidth: DEFAULT_CANVAS_WIDTH,
    canvasHeight: DEFAULT_CANVAS_HEIGHT,
    zones: [],
    sections: [],
    elements: [],
  };
}

export function normalizeLayoutZones(layout) {
  if (!layout) return createDefaultLayout();

  return {
    ...createDefaultLayout(),
    ...layout,
    canvasWidth: getNumber(layout.canvasWidth, DEFAULT_CANVAS_WIDTH),
    canvasHeight: getNumber(layout.canvasHeight, DEFAULT_CANVAS_HEIGHT),
    zones: Array.isArray(layout.zones)
      ? layout.zones.map((zona) => ({
          ...zona,
          precio: getNumber(zona.precio, 0),
        }))
      : [],
    sections: Array.isArray(layout.sections) ? layout.sections : [],
    elements: Array.isArray(layout.elements) ? layout.elements : [],
  };
}

export function createSection({
  nombre,
  zoneId = null,
  x = 100,
  y = 100,
  numRows = 3,
  seatsPerRow = 8,
  rotation = 0,
}) {
  const rows = Array.from({ length: Math.max(1, numRows) }, (_, rowIndex) => ({
    id: createId(),
    label: getRowLabel(rowIndex),
    labelOverride: null,
    seats: Array.from({ length: Math.max(1, seatsPerRow) }, (_, seatIndex) => ({
      id: createId(),
      label: getSeatLabel(seatIndex),
      labelOverride: null,
      x: seatIndex * ESPACIO_CELDAS,
      y: rowIndex * ESPACIO_CELDAS,
      type: 'standard',
    })),
  }));

  return autoLabelSection({
    id: createId(),
    nombre,
    zoneId,
    x,
    y,
    rotation,
    numRows: Math.max(1, numRows),
    seatsPerRow: Math.max(1, seatsPerRow),
    rows,
  });
}

export function autoLabelSection(section) {
  const rows = (section.rows || []).map((row, rowIndex) => ({
    ...row,
    label: row.labelOverride || getRowLabel(rowIndex),
    seats: (row.seats || []).map((seat, seatIndex) => ({
      ...seat,
      label: seat.labelOverride || getSeatLabel(seatIndex),
      x: seat.x ?? seatIndex * ESPACIO_CELDAS,
      y: seat.y ?? rowIndex * ESPACIO_CELDAS,
    })),
  }));

  return {
    ...section,
    rows,
    numRows: rows.length,
    seatsPerRow: rows[0]?.seats?.length || 0,
  };
}

export function createStageElement({
  type = 'stage',
  x = 0,
  y = 0,
  width = 260,
  height = 64,
  rotation = 0,
}) {
  return {
    id: createId(),
    type,
    x,
    y,
    width,
    height,
    rotation,
  };
}

export function getZoneColor(zoneId, zones) {
  return zones.find((zone) => String(zone.id) === String(zoneId))?.color || '#4a197f';
}

function getLayoutZoneId(zone, zones) {
  if (!zone) return null;
  const match = zones.find((item) => String(item.id) === String(zone.id));
  return match?.idBackend ?? match?.id_zona ?? match?.id ?? zone.idBackend ?? zone.id_zona ?? zone.id ?? null;
}

export function layoutToGridSnapshot(layout) {
  const zones = Array.isArray(layout.zones) ? layout.zones : [];
  const cells = [];
  let maxRow = 0;
  let maxCol = 0;

  const pushCell = (cell) => {
    cells.push(cell);
    maxRow = Math.max(maxRow, cell.row);
    maxCol = Math.max(maxCol, cell.col);
  };

  (layout.sections || []).forEach((section) => {
    const zoneId = getLayoutZoneId(zones.find((zone) => String(zone.id) === String(section.zoneId)), zones);
    const startRow = Math.max(0, Math.round(section.y / ESPACIO_CELDAS));
    const startCol = Math.max(0, Math.round(section.x / ESPACIO_CELDAS));

    (section.rows || []).forEach((row, rowIndex) => {
      (row.seats || []).forEach((seat, seatIndex) => {
        pushCell({
          tipo: TIPOS_CELDA.ZONA_ASIENTOS,
          row: startRow + rowIndex,
          col: startCol + seatIndex,
          id_zona: zoneId,
        });
      });
    });
  });

  (layout.elements || []).forEach((element) => {
    const tipo = element.type === 'aisle' ? TIPOS_CELDA.PASILLO : TIPOS_CELDA.ESCENARIO;
    const startRow = Math.max(0, Math.round(element.y / ESPACIO_CELDAS));
    const startCol = Math.max(0, Math.round(element.x / ESPACIO_CELDAS));
    const rows = Math.max(1, Math.round(element.height / ESPACIO_CELDAS));
    const cols = Math.max(1, Math.round(element.width / ESPACIO_CELDAS));

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      for (let colIndex = 0; colIndex < cols; colIndex += 1) {
        pushCell({
          tipo,
          row: startRow + rowIndex,
          col: startCol + colIndex,
          id_zona: null,
        });
      }
    }
  });

  const grid_rows = Math.max(1, maxRow + 2);
  const grid_cols = Math.max(1, maxCol + 2);

  return { grid_rows, grid_cols, cells };
}

function buildCellsLookup(celdas) {
  const lookup = new Map();
  celdas.forEach((celda) => {
    lookup.set(`${celda.row}-${celda.col}`, celda);
  });
  return lookup;
}

function getNeighbors(row, col) {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ];
}

function buildComponent(visited, lookup, startCell, matchFn) {
  const queue = [startCell];
  const component = [];
  visited.add(`${startCell.row}-${startCell.col}`);

  while (queue.length > 0) {
    const current = queue.shift();
    component.push(current);

    getNeighbors(current.row, current.col).forEach(([row, col]) => {
      const key = `${row}-${col}`;
      const next = lookup.get(key);
      if (!next || visited.has(key) || !matchFn(next)) return;
      visited.add(key);
      queue.push(next);
    });
  }

  return component;
}

export function legacyGridToLayout({ layout = {}, celdas = [], zonas = [] }) {
  const normalizedZones = normalizeLayoutZones({ ...createDefaultLayout(), ...layout, zones: zonas });
  const lookup = buildCellsLookup(celdas);
  const visited = new Set();
  const sections = [];
  const elements = [];
  const zonesById = new Map(normalizedZones.zones.map((zone) => [String(zone.idBackend ?? zone.id_zona ?? zone.id), zone]));

  for (const celda of celdas) {
    const key = `${celda.row}-${celda.col}`;
    if (visited.has(key)) continue;

    if (celda.tipo === TIPOS_CELDA.ZONA_ASIENTOS) {
      const zoneKey = String(celda.id_zona ?? 'null');
      const component = buildComponent(visited, lookup, celda, (candidate) => candidate.tipo === TIPOS_CELDA.ZONA_ASIENTOS && String(candidate.id_zona ?? 'null') === zoneKey);
      const rows = component.map((item) => item.row);
      const cols = component.map((item) => item.col);
      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      const minCol = Math.min(...cols);
      const maxCol = Math.max(...cols);
      const zone = zonesById.get(String(celda.id_zona ?? '')) || null;

      sections.push(autoLabelSection({
        id: createId(),
        nombre: `Seccion ${sections.length + 1}`,
        zoneId: zone ? zone.id : null,
        x: minCol * ESPACIO_CELDAS,
        y: minRow * ESPACIO_CELDAS,
        rotation: 0,
        rows: Array.from({ length: maxRow - minRow + 1 }, (_, rowIndex) => ({
          id: createId(),
          label: getRowLabel(rowIndex),
          labelOverride: null,
          seats: Array.from({ length: maxCol - minCol + 1 }, (_, seatIndex) => ({
            id: createId(),
            label: getSeatLabel(seatIndex),
            labelOverride: null,
            x: seatIndex * ESPACIO_CELDAS,
            y: rowIndex * ESPACIO_CELDAS,
            type: 'standard',
          })),
        })),
      }));
      continue;
    }

    if (celda.tipo === TIPOS_CELDA.ESCENARIO || celda.tipo === TIPOS_CELDA.PASILLO) {
      const type = celda.tipo === TIPOS_CELDA.PASILLO ? 'aisle' : 'stage';
      const component = buildComponent(visited, lookup, celda, (candidate) => candidate.tipo === celda.tipo);
      const rows = component.map((item) => item.row);
      const cols = component.map((item) => item.col);
      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      const minCol = Math.min(...cols);
      const maxCol = Math.max(...cols);

      elements.push({
        id: createId(),
        type,
        x: minCol * ESPACIO_CELDAS,
        y: minRow * ESPACIO_CELDAS,
        width: (maxCol - minCol + 1) * ESPACIO_CELDAS,
        height: (maxRow - minRow + 1) * ESPACIO_CELDAS,
        rotation: 0,
      });
      continue;
    }

    visited.add(key);
  }

  const maxSectionX = sections.reduce((max, section) => Math.max(max, section.x + section.seatsPerRow * ESPACIO_CELDAS), 0);
  const maxSectionY = sections.reduce((max, section) => Math.max(max, section.y + section.numRows * ESPACIO_CELDAS), 0);
  const maxElementX = elements.reduce((max, element) => Math.max(max, element.x + element.width), 0);
  const maxElementY = elements.reduce((max, element) => Math.max(max, element.y + element.height), 0);

  return normalizeLayoutZones({
    ...createDefaultLayout(),
    ...layout,
    canvasWidth: Math.max(DEFAULT_CANVAS_WIDTH, maxSectionX, maxElementX) + PADDING_GRID,
    canvasHeight: Math.max(DEFAULT_CANVAS_HEIGHT, maxSectionY, maxElementY) + PADDING_GRID,
    zones: normalizedZones.zones,
    sections,
    elements,
  });
}
