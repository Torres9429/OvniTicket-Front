import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Group } from './react-konva';
import Asiento from './Asiento';
import CeldaEscenario from './CeldaEscenario';
import PopupAsiento from './PopupAsiento';
import useDatosMapa from './usarDatosMapa';
import {
  ESPACIO_CELDAS,
  PADDING_GRID,
  TIPOS_CELDA,
  COLORES,
  obtenerAnchoGrid,
  obtenerAltoGrid,
} from './constantes';

/**
 * Agrupa celdas de escenario contiguas en la misma fila para renderizar un solo bloque.
 */
function agruparEscenarios(grid, rows, cols) {
  const grupos = [];
  for (let r = 0; r < rows; r++) {
    let inicioCol = null;
    for (let c = 0; c <= cols; c++) {
      const celda = c < cols ? grid[r][c] : null;
      const esEscenario = celda?.tipo === TIPOS_CELDA.ESCENARIO;

      if (esEscenario && inicioCol === null) {
        inicioCol = c;
      } else if (!esEscenario && inicioCol !== null) {
        grupos.push({ row: r, colInicio: inicioCol, colFin: c - 1 });
        inicioCol = null;
      }
    }
  }
  return grupos;
}

/**
 * Componente principal del mapa de asientos.
 *
 * @param {Object} props
 * @param {number} props.idLayout - ID del layout
 * @param {number|null} props.idEvento - ID del evento (para ver disponibilidad)
 * @param {Function} props.onSeleccionCambia - Callback con array de IDs seleccionados
 * @param {number} props.maxSeleccion - Máximo de asientos seleccionables (0 = sin límite)
 */
const MapaAsientos = ({
  idLayout,
  idEvento = null,
  onSeleccionCambia,
  maxSeleccion = 0,
}) => {
  const { datos, cargando, error } = useDatosMapa(idLayout, idEvento);

  const contenedorRef = useRef(null);
  const stageRef = useRef(null);

  const [tamano, setTamano] = useState({ width: 800, height: 600 });
  const [escala, setEscala] = useState(1);
  const [escalaAjustada, setEscalaAjustada] = useState(1);
  const [idsSeleccionados, setIdsSeleccionados] = useState([]);
  const [popup, setPopup] = useState({ dato: null, posicion: null });
  const ultimoPayloadSeleccionRef = useRef('');

  // Calcular tamaño disponible
  useEffect(() => {
    if (!contenedorRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setTamano({ width, height });
      }
    });
    observer.observe(contenedorRef.current);
    return () => observer.disconnect();
  }, []);

  // Calcular escala para ajustar al contenedor
  useEffect(() => {
    if (!datos) return;
    const anchoGrid = obtenerAnchoGrid(datos.cols);
    const altoGrid = obtenerAltoGrid(datos.rows);
    const escalaX = tamano.width / anchoGrid;
    const escalaY = tamano.height / altoGrid;
    const nuevaEscala = Math.min(escalaX, escalaY, 1.5);
    queueMicrotask(() => {
      setEscala(nuevaEscala);
      setEscalaAjustada(nuevaEscala);
    });
  }, [datos, tamano]);

  // Build a lookup map for fast seat data access
  const celdasPorId = useMemo(() => {
    if (!datos) return {};
    const map = {};
    for (let r = 0; r < datos.rows; r++) {
      for (let c = 0; c < datos.cols; c++) {
        const celda = datos.grid[r]?.[c];
        if (celda) map[celda.id] = celda;
      }
    }
    return map;
  }, [datos]);

  // Notificar cambios de selección — enviar objetos completos con datos del asiento
  useEffect(() => {
    if (!onSeleccionCambia) return;
    const firmaSeleccion = idsSeleccionados.join('|');
    if (ultimoPayloadSeleccionRef.current === firmaSeleccion) return;
    ultimoPayloadSeleccionRef.current = firmaSeleccion;

    const asientosCompletos = idsSeleccionados
      .map((id) => celdasPorId[id])
      .filter(Boolean);
    onSeleccionCambia(asientosCompletos);
  }, [idsSeleccionados, onSeleccionCambia, celdasPorId]);

  const alternarEscala = useCallback(() => {
    setEscala((prev) => (prev === 1 ? escalaAjustada : 1));
  }, [escalaAjustada]);

  const manejarHover = useCallback((dato, posicion) => {
    setPopup({ dato, posicion });
  }, []);

  const manejarSeleccionar = useCallback(
    (id) => {
      setIdsSeleccionados((prev) => {
        if (maxSeleccion > 0 && prev.length >= maxSeleccion) return prev;
        return [...prev, id];
      });
    },
    [maxSeleccion]
  );

  const manejarDeseleccionar = useCallback((id) => {
    setIdsSeleccionados((prev) => prev.filter((i) => i !== id));
  }, []);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-default-500">Cargando mapa...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-danger">{error}</div>
      </div>
    );
  }

  if (!datos) return null;

  const { grid, rows, cols, zonasMap, preciosMap } = datos;
  const anchoVirtual = obtenerAnchoGrid(cols);
  const altoVirtual = obtenerAltoGrid(rows);
  const gruposEscenario = agruparEscenarios(grid, rows, cols);

  // Leyenda de zonas únicas
  const zonasUnicas = Object.values(zonasMap);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Leyenda de zonas */}
      {zonasUnicas.length > 0 && (
        <div className="flex flex-wrap gap-4 px-4">
          {zonasUnicas.map((zona) => (
            <div key={zona.id_zona} className="flex items-center gap-2 text-sm">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: zona.color || COLORES.ASIENTO_LIBRE }}
              />
              <span>{zona.nombre}</span>
              {preciosMap[zona.id_zona] != null && (
                <span className="text-default-400">
                  (${preciosMap[zona.id_zona]})
                </span>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: COLORES.ASIENTO_RESERVADO }}
            />
            <span>Reservado</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: COLORES.ASIENTO_SELECCIONADO }}
            />
            <span>Seleccionado</span>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={contenedorRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '70vh',
          backgroundColor: '#f1f5f9',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <Stage
          ref={stageRef}
          width={tamano.width}
          height={tamano.height}
          draggable
          dragBoundFunc={(pos) => {
            const maxX = tamano.width / 2;
            const maxY = tamano.height / 2;
            return {
              x: Math.min(maxX, Math.max(pos.x, -anchoVirtual * escala + maxX)),
              y: Math.min(maxY, Math.max(pos.y, -altoVirtual * escala + maxY)),
            };
          }}
          onDblClick={alternarEscala}
          onDblTap={alternarEscala}
          scaleX={escala}
          scaleY={escala}
        >
          <Layer>
            {/* Fondo del grid */}
            <Rect
              width={anchoVirtual}
              height={altoVirtual}
              fill={COLORES.FONDO_GRID}
              cornerRadius={8}
            />

            {/* Labels filas (izquierda) */}
            {Array.from({ length: rows }, (_, r) => (
              <Text
                key={`fila-${r}`}
                text={`${r + 1}`}
                x={PADDING_GRID / 4}
                y={PADDING_GRID + r * ESPACIO_CELDAS - 6}
                fontSize={12}
                fill="#a0aec0"
                width={PADDING_GRID / 2}
                align="center"
              />
            ))}

            {/* Labels columnas (arriba) */}
            {Array.from({ length: cols }, (_, c) => (
              <Text
                key={`col-${c}`}
                text={`${c + 1}`}
                x={PADDING_GRID + c * ESPACIO_CELDAS - ESPACIO_CELDAS / 2}
                y={PADDING_GRID / 4}
                fontSize={12}
                fill="#a0aec0"
                width={ESPACIO_CELDAS}
                align="center"
              />
            ))}

            {/* Escenarios agrupados */}
            {gruposEscenario.map((grupo, idx) => {
              const anchoBloques = (grupo.colFin - grupo.colInicio + 1) * ESPACIO_CELDAS;
              return (
                <CeldaEscenario
                  key={`escenario-${idx}`}
                  x={PADDING_GRID + grupo.colInicio * ESPACIO_CELDAS - ESPACIO_CELDAS / 2}
                  y={PADDING_GRID + grupo.row * ESPACIO_CELDAS - ESPACIO_CELDAS / 2}
                  ancho={anchoBloques}
                  alto={ESPACIO_CELDAS}
                />
              );
            })}

            {/* Asientos (ZONA DE ASIENTOS) */}
            {grid.flatMap((fila, r) =>
              fila.map((celda, c) => {
                if (!celda || celda.tipo !== TIPOS_CELDA.ZONA_ASIENTOS) return null;
                return (
                  <Asiento
                    key={celda.id}
                    x={PADDING_GRID + c * ESPACIO_CELDAS}
                    y={PADDING_GRID + r * ESPACIO_CELDAS}
                    dato={celda}
                    colorZona={celda.colorZona}
                    esSeleccionado={idsSeleccionados.includes(celda.id)}
                    onHover={manejarHover}
                    onSeleccionar={manejarSeleccionar}
                    onDeseleccionar={manejarDeseleccionar}
                  />
                );
              })
            )}
          </Layer>
        </Stage>

        {/* Popup HTML */}
        {popup.dato && (
          <PopupAsiento
            posicion={popup.posicion}
            dato={popup.dato}
            nombreZona={popup.dato.nombreZona}
            precio={popup.dato.precio}
            onCerrar={() => setPopup({ dato: null, posicion: null })}
          />
        )}
      </div>

      {/* Info selección */}
      {idsSeleccionados.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-primary-50 rounded-xl">
          <span className="text-primary font-medium">
            {idsSeleccionados.length} asiento{idsSeleccionados.length !== 1 ? 's' : ''} seleccionado{idsSeleccionados.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setIdsSeleccionados([])}
            className="text-sm text-danger hover:underline"
          >
            Limpiar selección
          </button>
        </div>
      )}
    </div>
  );
};

export default MapaAsientos;
