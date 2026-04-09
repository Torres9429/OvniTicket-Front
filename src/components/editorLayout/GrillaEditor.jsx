import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group } from '../mapaAsientos/react-konva';
import { TIPOS_CELDA, COLORES, ESPACIO_CELDAS, PADDING_GRID } from '../mapaAsientos/constantes';

const TAMANO_CELDA = 26;
const GAP = ESPACIO_CELDAS;

function colorCelda(tipo, colorZona) {
  switch (tipo) {
    case TIPOS_CELDA.ZONA_ASIENTOS:
      return colorZona || COLORES.ASIENTO_LIBRE;
    case TIPOS_CELDA.ESCENARIO:
      return COLORES.ESCENARIO;
    case TIPOS_CELDA.PASILLO:
      return '#e2e8f0';
    default:
      return 'transparent';
  }
}

function bordeSeleccion(tipo) {
  return tipo && tipo !== TIPOS_CELDA.VACIO ? '#00000022' : '#e2e8f080';
}

export default function GrillaEditor({
  rows,
  cols,
  celdas,
  zonasMap,
  herramientaActiva,
  zonaActiva,
  onCeldaClick,
}) {
  const contenedorRef = useRef(null);
  const [tamano, setTamano] = useState({ width: 800, height: 600 });
  const [esPintando, setEsPintando] = useState(false);

  useEffect(() => {
    if (!contenedorRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setTamano({ width, height });
    });
    observer.observe(contenedorRef.current);
    return () => observer.disconnect();
  }, []);

  const anchoGrid = cols * GAP + PADDING_GRID * 2;
  const altoGrid = rows * GAP + PADDING_GRID * 2;
  const escalaX = tamano.width / anchoGrid;
  const escalaY = tamano.height / altoGrid;
  const escala = Math.min(escalaX, escalaY, 1.5);

  const handleCeldaInteraccion = useCallback(
    (row, col) => {
      onCeldaClick(row, col);
    },
    [onCeldaClick]
  );

  return (
    <div
      ref={contenedorRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'crosshair',
      }}
    >
      <Stage
        width={tamano.width}
        height={tamano.height}
        scaleX={escala}
        scaleY={escala}
        draggable
        onMouseDown={() => setEsPintando(true)}
        onMouseUp={() => setEsPintando(false)}
        onMouseLeave={() => setEsPintando(false)}
      >
        <Layer>
          {/* Fondo */}
          <Rect width={anchoGrid} height={altoGrid} fill="#f8fafc" />

          {/* Labels filas */}
          {Array.from({ length: rows }, (_, r) => (
            <Text
              key={`fl-${r}`}
              text={`${r + 1}`}
              x={PADDING_GRID / 4}
              y={PADDING_GRID + r * GAP - 6}
              fontSize={11}
              fill="#94a3b8"
              width={PADDING_GRID / 2}
              align="center"
            />
          ))}

          {/* Labels columnas */}
          {Array.from({ length: cols }, (_, c) => (
            <Text
              key={`cl-${c}`}
              text={`${c + 1}`}
              x={PADDING_GRID + c * GAP - GAP / 2}
              y={PADDING_GRID / 4}
              fontSize={11}
              fill="#94a3b8"
              width={GAP}
              align="center"
            />
          ))}

          {/* Celdas */}
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const key = `${r}-${c}`;
              const celda = celdas[key];
              const tipo = celda?.tipo || null;
              const zonaColor = celda?.idZona ? zonasMap[celda.idZona]?.color : null;
              const tieneTipo = tipo && tipo !== TIPOS_CELDA.VACIO;

              return (
                <Group key={key}>
                  <Rect
                    x={PADDING_GRID + c * GAP - TAMANO_CELDA / 2}
                    y={PADDING_GRID + r * GAP - TAMANO_CELDA / 2}
                    width={TAMANO_CELDA}
                    height={TAMANO_CELDA}
                    fill={tieneTipo ? colorCelda(tipo, zonaColor) : '#f1f5f9'}
                    stroke={bordeSeleccion(tipo)}
                    strokeWidth={1}
                    cornerRadius={tipo === TIPOS_CELDA.ESCENARIO ? 2 : TAMANO_CELDA / 2}
                    onClick={() => handleCeldaInteraccion(r, c)}
                    onTap={() => handleCeldaInteraccion(r, c)}
                    onMouseEnter={(e) => {
                      if (esPintando) handleCeldaInteraccion(r, c);
                      e.target.getStage().container().style.cursor = 'crosshair';
                    }}
                  />
                  {tipo === TIPOS_CELDA.ESCENARIO && (
                    <Text
                      x={PADDING_GRID + c * GAP - TAMANO_CELDA / 2}
                      y={PADDING_GRID + r * GAP - 5}
                      text="E"
                      width={TAMANO_CELDA}
                      fontSize={10}
                      fill="white"
                      align="center"
                      listening={false}
                    />
                  )}
                </Group>
              );
            })
          )}
        </Layer>
      </Stage>
    </div>
  );
}
