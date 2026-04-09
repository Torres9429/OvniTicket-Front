import { useState, useEffect, useCallback } from 'react';
import GrillaEditor from './GrillaEditor';
import BarraHerramientas from './BarraHerramientas';
import PanelZonas from './PanelZonas';
import { TIPOS_CELDA } from '../mapaAsientos/constantes';

import { crearLayout, actualizarLayout, obtenerLayout } from '../../services/layouts.api';
import { crearZona, actualizarZona, eliminarZona, obtenerZonas } from '../../services/zonas.api';
import { crearGridCell, eliminarGridCell, obtenerGridCellsPorLayout } from '../../services/gridCells.api';

let contadorZonaLocal = 0;

/**
 * Editor interactivo de layout para configurar grids, zonas y celdas.
 *
 * @param {Object} props
 * @param {number} props.idLugar    - ID del lugar al que pertenece el layout
 * @param {number} props.idDueno    - ID del usuario dueño
 * @param {number|null} props.idLayoutExistente - ID de un layout existente (modo edición)
 * @param {Function} props.onGuardado - Callback tras guardar exitosamente
 */
export default function EditorLayout({ idLugar, idDueno, idLayoutExistente = null, onGuardado }) {
  const [filas, setFilas] = useState(10);
  const [columnas, setColumnas] = useState(15);
  const [celdas, setCeldas] = useState({});
  const [zonas, setZonas] = useState([]);
  const [zonasMap, setZonasMap] = useState({});
  const [herramientaActiva, setHerramientaActiva] = useState(TIPOS_CELDA.ZONA_ASIENTOS);
  const [zonaActiva, setZonaActiva] = useState(null);
  const [idLayout, setIdLayout] = useState(idLayoutExistente);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(!!idLayoutExistente);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  // Sincronizar zonasMap cuando cambian zonas
  useEffect(() => {
    const mapa = {};
    zonas.forEach((z) => { mapa[z.id] = z; });
    setZonasMap(mapa);
  }, [zonas]);

  // Cargar layout existente
  useEffect(() => {
    if (!idLayoutExistente) return;
    let montado = true;

    async function cargar() {
      setCargando(true);
      try {
        const [layout, celdasBackend, zonasBackend] = await Promise.all([
          obtenerLayout(idLayoutExistente),
          obtenerGridCellsPorLayout(idLayoutExistente),
          obtenerZonas(),
        ]);

        if (!montado) return;

        setFilas(layout.grid_rows);
        setColumnas(layout.grid_cols);
        setIdLayout(layout.id_layout);

        const zonasLayout = (zonasBackend || []).filter(
          (z) => z.id_layout === Number(idLayoutExistente)
        );
        setZonas(zonasLayout.map((z) => ({
          id: z.id_zona,
          idBackend: z.id_zona,
          nombre: z.nombre,
          color: z.color,
        })));

        const celdasMapa = {};
        (celdasBackend || []).forEach((c) => {
          celdasMapa[`${c.row}-${c.col}`] = {
            tipo: c.tipo,
            idZona: c.id_zona,
            idBackend: c.id_grid_cells,
          };
        });
        setCeldas(celdasMapa);
      } catch (err) {
        if (montado) setError('Error al cargar el layout: ' + (err.message || err));
      } finally {
        if (montado) setCargando(false);
      }
    }

    cargar();
    return () => { montado = false; };
  }, [idLayoutExistente]);

  // Click en celda — asigna herramienta activa + zona activa
  const handleCeldaClick = useCallback(
    (row, col) => {
      const key = `${row}-${col}`;

      if (herramientaActiva === TIPOS_CELDA.VACIO) {
        setCeldas((prev) => {
          const copia = { ...prev };
          delete copia[key];
          return copia;
        });
        return;
      }

      if (herramientaActiva === TIPOS_CELDA.ZONA_ASIENTOS && !zonaActiva) {
        setError('Selecciona una zona antes de pintar asientos.');
        setTimeout(() => setError(null), 3000);
        return;
      }

      setCeldas((prev) => ({
        ...prev,
        [key]: {
          tipo: herramientaActiva,
          idZona: herramientaActiva === TIPOS_CELDA.ZONA_ASIENTOS ? zonaActiva : null,
          idBackend: prev[key]?.idBackend || null,
        },
      }));
    },
    [herramientaActiva, zonaActiva]
  );

  // Zona CRUD
  const handleAgregarZona = useCallback((datos) => {
    contadorZonaLocal++;
    const nueva = { id: `local-${contadorZonaLocal}`, nombre: datos.nombre, color: datos.color, idBackend: null };
    setZonas((prev) => [...prev, nueva]);
    setZonaActiva(nueva.id);
  }, []);

  const handleEliminarZona = useCallback((id) => {
    setZonas((prev) => prev.filter((z) => z.id !== id));
    setCeldas((prev) => {
      const copia = { ...prev };
      Object.keys(copia).forEach((key) => {
        if (copia[key].idZona === id) delete copia[key];
      });
      return copia;
    });
    if (zonaActiva === id) setZonaActiva(null);
  }, [zonaActiva]);

  const handleEditarZona = useCallback((id, datos) => {
    setZonas((prev) => prev.map((z) => (z.id === id ? { ...z, ...datos } : z)));
  }, []);

  // Redimensionar grid
  const handleRedimensionar = () => {
    const nuevasFilas = Math.max(1, Math.min(50, filas));
    const nuevasCols = Math.max(1, Math.min(50, columnas));
    setFilas(nuevasFilas);
    setColumnas(nuevasCols);

    // Eliminar celdas fuera del nuevo rango
    setCeldas((prev) => {
      const copia = { ...prev };
      Object.keys(copia).forEach((key) => {
        const [r, c] = key.split('-').map(Number);
        if (r >= nuevasFilas || c >= nuevasCols) delete copia[key];
      });
      return copia;
    });
  };

  // Guardar todo al backend
  const handleGuardar = async () => {
    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {
      // 1. Crear o actualizar layout
      let layoutId = idLayout;
      const now = new Date().toISOString();

      if (!layoutId) {
        const layoutData = {
          grid_rows: filas,
          grid_cols: columnas,
          version: 1,
          estatus: 'activo',
          fecha_creacion: now,
          fecha_actualizacion: now,
          id_lugar: idLugar,
          id_dueno: idDueno,
        };
        const layoutCreado = await crearLayout(layoutData);
        layoutId = layoutCreado.id_layout;
        setIdLayout(layoutId);
      } else {
        await actualizarLayout(layoutId, {
          grid_rows: filas,
          grid_cols: columnas,
          version: 1,
          estatus: 'activo',
          id_lugar: idLugar,
          id_dueno: idDueno,
        });
      }

      // 2. Guardar zonas
      const zonasGuardadas = {};
      for (const zona of zonas) {
        if (zona.idBackend) {
          await actualizarZona(zona.idBackend, {
            nombre: zona.nombre,
            color: zona.color,
            id_layout: layoutId,
          });
          zonasGuardadas[zona.id] = zona.idBackend;
        } else {
          const zonaCreada = await crearZona({
            nombre: zona.nombre,
            color: zona.color,
            id_layout: layoutId,
          });
          zonasGuardadas[zona.id] = zonaCreada.id_zona;
        }
      }

      // Actualizar IDs de zonas en el estado local
      setZonas((prev) =>
        prev.map((z) => ({
          ...z,
          idBackend: zonasGuardadas[z.id] || z.idBackend,
        }))
      );

      // 3. Eliminar celdas existentes y recrear
      if (idLayoutExistente) {
        const celdasExistentes = await obtenerGridCellsPorLayout(layoutId);
        await Promise.all(
          (celdasExistentes || []).map((c) => eliminarGridCell(c.id_grid_cells).catch(() => {}))
        );
      }

      // 4. Crear celdas nuevas
      const promesasCeldas = Object.entries(celdas).map(([key, celda]) => {
        const [row, col] = key.split('-').map(Number);
        const idZonaBackend = celda.idZona ? zonasGuardadas[celda.idZona] || celda.idZona : null;
        return crearGridCell({
          tipo: celda.tipo,
          row,
          col,
          id_zona: idZonaBackend,
          id_layout: layoutId,
        });
      });

      await Promise.all(promesasCeldas);

      setMensaje('Layout guardado correctamente');
      setTimeout(() => setMensaje(null), 4000);
      onGuardado?.(layoutId);
    } catch (err) {
      console.error('Error guardando layout:', err);
      setError('Error al guardar: ' + (err?.response?.data?.error || err.message || 'Error desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  // Estadísticas rápidas
  const totalAsientos = Object.values(celdas).filter((c) => c.tipo === TIPOS_CELDA.ZONA_ASIENTOS).length;
  const totalEscenario = Object.values(celdas).filter((c) => c.tipo === TIPOS_CELDA.ESCENARIO).length;

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-default-500">Cargando editor...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mensajes */}
      {error && (
        <div className="px-4 py-2 bg-danger/10 text-danger rounded-lg text-sm">{error}</div>
      )}
      {mensaje && (
        <div className="px-4 py-2 bg-success/10 text-success rounded-lg text-sm">{mensaje}</div>
      )}

      {/* Dimensiones + guardar */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Filas:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={filas}
            onChange={(e) => setFilas(Number(e.target.value) || 1)}
            className="w-16 px-2 py-1.5 border rounded text-sm border-default-300 bg-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Columnas:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={columnas}
            onChange={(e) => setColumnas(Number(e.target.value) || 1)}
            className="w-16 px-2 py-1.5 border rounded text-sm border-default-300 bg-transparent"
          />
        </div>
        <button
          onClick={handleRedimensionar}
          className="px-3 py-1.5 text-sm rounded border border-default-300 hover:bg-default-100 transition-colors"
        >
          Aplicar
        </button>
        <div className="flex-1" />
        <span className="text-xs text-default-400">
          {totalAsientos} asientos · {totalEscenario} escenario
        </span>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {guardando ? 'Guardando...' : 'Guardar layout'}
        </button>
      </div>

      {/* Herramientas + panel zonas */}
      <div className="flex gap-4">
        <div className="flex-1 flex flex-col gap-3">
          <BarraHerramientas
            herramientaActiva={herramientaActiva}
            onCambiar={setHerramientaActiva}
          />

          {herramientaActiva === TIPOS_CELDA.ZONA_ASIENTOS && zonas.length === 0 && (
            <p className="text-xs text-warning">Crea una zona primero para pintar asientos.</p>
          )}
        </div>

        <div className="w-56 shrink-0">
          <PanelZonas
            zonas={zonas}
            zonaActiva={zonaActiva}
            onSeleccionar={setZonaActiva}
            onAgregar={handleAgregarZona}
            onEliminar={handleEliminarZona}
            onEditar={handleEditarZona}
          />
        </div>
      </div>

      {/* Grid canvas */}
      <div style={{ height: '55vh' }}>
        <GrillaEditor
          rows={filas}
          cols={columnas}
          celdas={celdas}
          zonasMap={zonasMap}
          herramientaActiva={herramientaActiva}
          zonaActiva={zonaActiva}
          onCeldaClick={handleCeldaClick}
        />
      </div>
    </div>
  );
}
