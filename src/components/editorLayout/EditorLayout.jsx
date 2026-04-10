import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from '@heroui/react';
import EditorCanvas from './EditorCanvas';
import EditorToolbar from './EditorToolbar';
import ZonePanel from './ZonePanel';
import SectionConfigDialog from './SectionConfigDialog';
import {
  autoLabelSection,
  createDefaultLayout,
  createId,
  createSection,
  createStageElement,
  legacyGridToLayout,
  layoutToGridSnapshot,
  normalizeLayoutZones,
} from './layoutModel';
import { usarAutenticacion } from '../../hooks/usarAutenticacion';
import { obtenerLugar } from '../../services/lugares.api';
import { crearLayout, actualizarLayout, guardarSnapshotLayout, obtenerLayout } from '../../services/layouts.api';
import { crearZona, actualizarZona, eliminarZona, obtenerZonas } from '../../services/zonas.api';
import { crearGridCell, eliminarGridCell, obtenerGridCellsPorLayout } from '../../services/gridCells.api';

function getCurrentUserId(usuario) {
  return usuario?.idUsuario ?? usuario?.id_usuario ?? usuario?.id ?? null;
}

function getVenueOwnerId(venue) {
  return venue?.ownerId ?? venue?.id_dueno ?? venue?.idDueno ?? null;
}

function nextSectionName(sections) {
  return `Seccion ${sections.length + 1}`;
}

function resolveBackendZoneId(zone) {
  return zone?.idBackend ?? zone?.id_zona ?? zone?.id ?? null;
}

function ensureValidLayout(layout) {
  const normalized = normalizeLayoutZones(layout);
  
  // Validar y completar secciones
  const sections = (normalized.sections || []).map((section, sectionIdx) => {
    // Si la sección tiene rows correctamente estructuradas, mantenerlas
    if (Array.isArray(section.rows) && section.rows.length > 0) {
      // Verificar que cada row tenga seats
      const validRows = section.rows.every(row => Array.isArray(row.seats) && row.seats.length > 0);
      
      if (validRows) {
        // Calcular numRows y seatsPerRow basándose en la estructura existente
        const numRows = section.rows.length;
        const seatsPerRow = section.rows[0]?.seats?.length || 1;
        
        // Asegurar que cada fila y asiento tiene los campos necesarios
        const rows = section.rows.map((row, rowIdx) => ({
          ...row,
          id: row.id || `row-${rowIdx}`,
          label: row.label || String.fromCharCode(65 + rowIdx),
          labelOverride: row.labelOverride || null,
          seats: (row.seats || []).map((seat, seatIdx) => ({
            ...seat,
            id: seat.id || `seat-${rowIdx}-${seatIdx}`,
            label: seat.label || String(seatIdx + 1),
            labelOverride: seat.labelOverride || null,
            x: typeof seat.x === 'number' ? seat.x : seatIdx * 36,
            y: typeof seat.y === 'number' ? seat.y : rowIdx * 36,
            type: seat.type || 'standard',
          })),
        }));
        
        return {
          ...section,
          id: section.id,
          nombre: section.nombre || `Sección ${sectionIdx + 1}`,
          zoneId: section.zoneId || null,
          x: typeof section.x === 'number' ? section.x : 100,
          y: typeof section.y === 'number' ? section.y : 100,
          rotation: typeof section.rotation === 'number' ? section.rotation : 0,
          numRows,
          seatsPerRow,
          rows,
        };
      }
    }
    
    // Fallback: reconstruir si no hay rows válidas
    const numRows = Number(section.numRows || 3);
    const seatsPerRow = Number(section.seatsPerRow || 8);
    
    const newRows = Array.from({ length: numRows }, (_, rowIdx) => ({
      id: `row-${section.id}-${rowIdx}`,
      label: String.fromCharCode(65 + rowIdx),
      labelOverride: null,
      seats: Array.from({ length: seatsPerRow }, (_, seatIdx) => ({
        id: `seat-${section.id}-${rowIdx}-${seatIdx}`,
        label: String(seatIdx + 1),
        labelOverride: null,
        x: seatIdx * 36,
        y: rowIdx * 36,
        type: 'standard',
      })),
    }));
    
    return {
      ...section,
      id: section.id,
      nombre: section.nombre || `Sección ${sectionIdx + 1}`,
      zoneId: section.zoneId || null,
      x: typeof section.x === 'number' ? section.x : 100,
      y: typeof section.y === 'number' ? section.y : 100,
      rotation: typeof section.rotation === 'number' ? section.rotation : 0,
      numRows,
      seatsPerRow,
      rows: newRows,
    };
  });

  return {
    ...normalized,
    sections,
    elements: Array.isArray(normalized.elements)
      ? (normalized.elements || []).map(el => ({
          ...el,
          id: el.id || createId(),
          type: el.type || 'stage',
          x: typeof el.x === 'number' ? el.x : 0,
          y: typeof el.y === 'number' ? el.y : 0,
          width: typeof el.width === 'number' ? el.width : 200,
          height: typeof el.height === 'number' ? el.height : 100,
          rotation: typeof el.rotation === 'number' ? el.rotation : 0,
        }))
      : [],
    zones: Array.isArray(normalized.zones)
      ? normalized.zones
      : [],
    canvasWidth: Number(normalized.canvasWidth) || 1000,
    canvasHeight: Number(normalized.canvasHeight) || 800,
  };
}

function updateSectionShape(section, updates) {
  const numRows = Math.max(1, Number(updates.numRows ?? section.numRows ?? section.rows?.length ?? 1));
  const seatsPerRow = Math.max(1, Number(updates.seatsPerRow ?? section.seatsPerRow ?? section.rows?.[0]?.seats?.length ?? 1));
  const x = Number(updates.x ?? section.x ?? 100);
  const y = Number(updates.y ?? section.y ?? 100);
  const rotation = Number(updates.rotation ?? section.rotation ?? 0);

  const rebuilt = createSection({
    nombre: updates.nombre ?? section.nombre,
    zoneId: updates.zoneId ?? section.zoneId ?? null,
    x,
    y,
    numRows,
    seatsPerRow,
    rotation,
  });

  return autoLabelSection({
    ...rebuilt,
    id: section.id,
  });
}

export default function EditorLayout({
  idLugar,
  idDueno,
  venueInicial = null,
  idLayoutExistente = null,
  layoutInicial = null,
  onGuardado,
  onVolver = null,
}) {
  const { usuario } = usarAutenticacion();
  const [venue, setVenue] = useState(null);
  const [layout, setLayout] = useState(createDefaultLayout());
  const [idLayout, setIdLayout] = useState(idLayoutExistente);
  const [estadoLayout, setEstadoLayout] = useState('borrador');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoSnapshot, setGuardandoSnapshot] = useState(false);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const autosaveRef = useRef(null);

  const currentUserId = useMemo(() => getCurrentUserId(usuario), [usuario]);
  const resolvedOwnerId = useMemo(() => idDueno || currentUserId, [idDueno, currentUserId]);

  const totalSections = layout.sections?.length || 0;
  const totalZones = layout.zones?.length || 0;
  const totalElements = layout.elements?.length || 0;

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    setMensaje(null);
  }, []);

  const updateLayout = useCallback((updater) => {
    setLayout((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return ensureValidLayout(next);
    });
    markDirty();
  }, [markDirty]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setCargando(true);
      setError(null);

      try {
        const venueData = venueInicial || await obtenerLugar(idLugar);
        if (cancelled) return;

        const venueOwnerId = getVenueOwnerId(venueData);
        if (resolvedOwnerId != null && venueOwnerId != null && String(venueOwnerId) !== String(resolvedOwnerId)) {
          throw new Error('El lugar no pertenece al usuario actual.');
        }

        setVenue(venueData);

        const resolvedInitialLayout = layoutInicial?.layout || layoutInicial || null;
        const initialLayoutId = resolvedInitialLayout?.id_layout || resolvedInitialLayout?.id || idLayoutExistente;

        if (!initialLayoutId) {
          setLayout(createDefaultLayout());
          setEstadoLayout('borrador');
          setIdLayout(null);
          setHasUnsavedChanges(false);
          return;
        }

        console.log('[EditorLayout] Cargando layout:', initialLayoutId);

        // Si el padre ya pasó el snapshot completo, lo usamos directamente
        const layoutData = resolvedInitialLayout?.layout_data
          ? resolvedInitialLayout
          : await obtenerLayout(initialLayoutId);
        if (cancelled) return;

        console.log('[EditorLayout] layoutData recibido:', layoutData);

        // Extraer zones desde layout_data si existen
        let loadedZones = (layoutData?.layout_data?.zones || []);
        
        // Si no hay zones en layout_data, pedir al backend
        if (loadedZones.length === 0) {
          const allZones = await obtenerZonas().catch(() => []);
          loadedZones = (allZones || [])
            .filter((zona) => String(zona.id_layout) === String(initialLayoutId));
        }

        const backendZones = loadedZones.map((zona) => ({
          id: zona.id_zona || zona.id,
          idBackend: zona.id_zona || zona.id,
          nombre: zona.nombre,
          color: zona.color,
          precio: Number(zona.precio || 0),
        }));

        console.log('[EditorLayout] ========== LAYOUT LOADING ==========');
        console.log('[EditorLayout] layoutData:', {
          id_layout: layoutData.id_layout || initialLayoutId,
          hasLayoutData: !!layoutData?.layout_data,
          zonesFromData: loadedZones.length,
        });

        // El layout_data contiene la estructura completa
        const snapshotData = layoutData?.layout_data;

        const snapshot = snapshotData && (snapshotData.sections?.length > 0 || snapshotData.elements?.length > 0)
          ? normalizeLayoutZones(snapshotData)
          : createDefaultLayout(); // No hacer conversion desde grid si no hay snapshot

        console.log('[EditorLayout] Snapshot loaded:', {
          sectionsCount: snapshot.sections?.length || 0,
          elementsCount: snapshot.elements?.length || 0,
        });

        const mergedZones = (snapshot.zones || []).length > 0 ? snapshot.zones : backendZones;

        const normalizedLayout = ensureValidLayout({
          ...snapshot,
          zones: mergedZones,
        });

        console.log('[EditorLayout] Final layout:', {
          sectionsCount: normalizedLayout.sections?.length || 0,
          elementsCount: normalizedLayout.elements?.length || 0,
          zonesCount: normalizedLayout.zones?.length || 0,
        });

        setLayout(normalizedLayout);
        setIdLayout(layoutData.id_layout || initialLayoutId);
        setEstadoLayout(String(layoutData.estatus || resolvedInitialLayout?.estatus || 'borrador').toLowerCase());
        setHasUnsavedChanges(false);
        setSelectedItem(null);
      } catch (loadError) {
        if (!cancelled) {
          console.error('[EditorLayout] Error loading:', loadError);
          setError(loadError?.message || 'No se pudo cargar el editor del lugar.');
        }
      } finally {
        if (!cancelled) setCargando(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [idLugar, idLayoutExistente, layoutInicial, resolvedOwnerId, venueInicial]);

  const handleAddSection = useCallback(() => {
    updateLayout((prev) => {
      const section = createSection({
        nombre: nextSectionName(prev.sections || []),
        zoneId: null,
        x: 100,
        y: 100,
        numRows: 3,
        seatsPerRow: 8,
      });
      return {
        ...prev,
        sections: [...(prev.sections || []), section],
      };
    });
  }, [updateLayout]);

  const handleAddStageElement = useCallback(() => {
    updateLayout((prev) => {
      const element = createStageElement({
        type: 'stage',
        x: Math.max(120, (prev.canvasWidth || 1000) / 2 - 140),
        y: 40,
        width: 260,
        height: 64,
      });
      return {
        ...prev,
        elements: [...(prev.elements || []), element],
      };
    });
  }, [updateLayout]);

  const handleAddAisle = useCallback(() => {
    updateLayout((prev) => {
      const element = createStageElement({
        type: 'aisle',
        x: Math.max(140, (prev.canvasWidth || 1000) / 2 - 18),
        y: 180,
        width: 36,
        height: 220,
      });
      return {
        ...prev,
        elements: [...(prev.elements || []), element],
      };
    });
  }, [updateLayout]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedItem) return;

    updateLayout((prev) => {
      if (selectedItem.kind === 'section') {
        return {
          ...prev,
          sections: (prev.sections || []).filter((section) => section.id !== selectedItem.id),
        };
      }

      if (selectedItem.kind === 'element') {
        return {
          ...prev,
          elements: (prev.elements || []).filter((element) => element.id !== selectedItem.id),
        };
      }

      return prev;
    });

    setSelectedItem(null);
  }, [selectedItem, updateLayout]);

  const handleMoveSection = useCallback((sectionId, position) => {
    updateLayout((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((section) => (
        section.id === sectionId
          ? { ...section, x: position.x, y: position.y }
          : section
      )),
    }));
  }, [updateLayout]);

  const handleResizeSection = useCallback((sectionId, transform) => {
    updateLayout((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((section) => {
        if (section.id !== sectionId) return section;

        const oldRows = section.rows?.length || section.numRows || 1;
        const oldSeatsPerRow = section.rows?.[0]?.seats?.length || section.seatsPerRow || 1;
        const nextRows = Math.max(1, Math.round(oldRows * transform.scaleY));
        const nextSeatsPerRow = Math.max(1, Math.round(oldSeatsPerRow * transform.scaleX));

        return updateSectionShape(section, {
          nombre: section.nombre,
          zoneId: section.zoneId,
          x: transform.x,
          y: transform.y,
          rotation: transform.rotation,
          numRows: nextRows,
          seatsPerRow: nextSeatsPerRow,
        });
      }),
    }));
  }, [updateLayout]);

  const handleMoveElement = useCallback((elementId, position) => {
    updateLayout((prev) => ({
      ...prev,
      elements: (prev.elements || []).map((element) => (
        element.id === elementId
          ? { ...element, x: position.x, y: position.y }
          : element
      )),
    }));
  }, [updateLayout]);

  const handleAssignSectionZone = useCallback((sectionId, zoneId) => {
    updateLayout((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((section) => (
        section.id === sectionId
          ? { ...section, zoneId: zoneId || null }
          : section
      )),
    }));
  }, [updateLayout]);

  const handleAddZone = useCallback((zone) => {
    updateLayout((prev) => ({
      ...prev,
      zones: [...(prev.zones || []), { id: `local-${Date.now()}`, ...zone }],
    }));
  }, [updateLayout]);

  const handleUpdateZone = useCallback((zoneId, updates) => {
    updateLayout((prev) => ({
      ...prev,
      zones: (prev.zones || []).map((zone) => (
        String(zone.id) === String(zoneId)
          ? { ...zone, ...updates, precio: Number(updates.precio) || 0 }
          : zone
      )),
    }));
  }, [updateLayout]);

  const handleDeleteZone = useCallback((zoneId) => {
    updateLayout((prev) => ({
      ...prev,
      zones: (prev.zones || []).filter((zone) => String(zone.id) !== String(zoneId)),
      sections: (prev.sections || []).map((section) => (
        String(section.zoneId) === String(zoneId)
          ? { ...section, zoneId: null }
          : section
      )),
    }));
  }, [updateLayout]);

  const handleRequestSectionEdit = useCallback((sectionId) => {
    setEditingSectionId(sectionId);
    setSectionDialogOpen(true);
  }, []);

  const handleSaveSectionDialog = useCallback((payload) => {
    if (!editingSectionId) return;

    updateLayout((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((section) => {
        if (section.id !== editingSectionId) return section;
        return updateSectionShape(section, {
          nombre: payload.nombre || section.nombre,
          zoneId: payload.zoneId,
          numRows: payload.numRows,
          seatsPerRow: payload.seatsPerRow,
        });
      }),
    }));

    setSectionDialogOpen(false);
    setEditingSectionId(null);
  }, [editingSectionId, updateLayout]);

  const getSelectedSection = useMemo(
    () => layout.sections?.find((section) => section.id === editingSectionId) || null,
    [editingSectionId, layout.sections]
  );

  const handleSave = useCallback(async ({ silencioso = false } = {}) => {
    if (guardando) return null;
    setGuardando(true);
    setError(null);
    if (!silencioso) setMensaje(null);

    try {
      const normalizedLayout = normalizeLayoutZones(layout);
      const snapshot = layoutToGridSnapshot(normalizedLayout);
      const currentVenueId = Number(idLugar);
      const ownerId = Number(resolvedOwnerId);

      let layoutId = idLayout;

      if (!layoutId) {
        const created = await crearLayout({
          grid_rows: snapshot.grid_rows,
          grid_cols: snapshot.grid_cols,
          version: normalizedLayout.version || 1,
          estatus: estadoLayout.toUpperCase(),
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
          id_lugar: currentVenueId,
          id_dueno: ownerId,
        });
        layoutId = created.id_layout;
        setIdLayout(layoutId);
      } else {
        await actualizarLayout(layoutId, {
          grid_rows: snapshot.grid_rows,
          grid_cols: snapshot.grid_cols,
          version: normalizedLayout.version || 1,
          estatus: estadoLayout.toUpperCase(),
          id_lugar: currentVenueId,
          id_dueno: ownerId,
        });
      }

      const existingZones = await obtenerZonas().catch(() => []);
      const zonesForLayout = (existingZones || []).filter((zone) => String(zone.id_layout) === String(layoutId));
      const zoneIdMap = new Map();

      for (const zone of normalizedLayout.zones || []) {
        const payload = {
          nombre: zone.nombre,
          color: zone.color,
          precio: Number(zone.precio) || 0,
          id_layout: layoutId,
        };

        if (zone.idBackend || zone.id_zona) {
          const backendId = resolveBackendZoneId(zone);
          await actualizarZona(backendId, payload);
          zoneIdMap.set(String(zone.id), backendId);
        } else {
          const createdZone = await crearZona(payload);
          zoneIdMap.set(String(zone.id), createdZone.id_zona);
        }
      }

      const zonesAfterSave = (normalizedLayout.zones || []).map((zone) => ({
        ...zone,
        idBackend: zoneIdMap.get(String(zone.id)) || zone.idBackend || zone.id_zona || zone.id,
      }));

      await Promise.all((zonesForLayout || [])
        .filter((zone) => !zonesAfterSave.some((currentZone) => String(currentZone.idBackend) === String(zone.id_zona)))
        .map((zone) => eliminarZona(zone.id_zona).catch(() => {})));

      const cells = layoutToGridSnapshot({ ...normalizedLayout, zones: zonesAfterSave }).cells;
      const existingCells = await obtenerGridCellsPorLayout(layoutId).catch(() => []);
      await Promise.all((existingCells || []).map((cell) => eliminarGridCell(cell.id_grid_cells).catch(() => {})));

      await Promise.all(cells.map((cell) => crearGridCell({
        tipo: cell.tipo,
        row: cell.row,
        col: cell.col,
        id_zona: cell.id_zona,
        id_layout: layoutId,
      })));

      await guardarSnapshotLayout(layoutId, {
        layout_data: {
          ...normalizedLayout,
          zones: zonesAfterSave,
        },
      }).catch(() => null);

      setLayout((prev) => normalizeLayoutZones({ ...prev, zones: zonesAfterSave }));
      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());

      if (!silencioso) {
        setMensaje('Layout guardado correctamente');
      }

      onGuardado?.(layoutId);
      return layoutId;
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError.message || 'No se pudo guardar el layout.');
      return null;
    } finally {
      setGuardando(false);
    }
  }, [guardando, idLayout, idLugar, layout, onGuardado, resolvedOwnerId, estadoLayout]);

  const handleSaveSnapshot = useCallback(async () => {
    const layoutId = idLayout || await handleSave({ silencioso: true });
    if (!layoutId) return;

    setGuardandoSnapshot(true);
    try {
      await guardarSnapshotLayout(layoutId, {
        layout_data: normalizeLayoutZones(layout),
      });
      setMensaje('Snapshot guardado correctamente');
      setHasUnsavedChanges(false);
    } catch (snapshotError) {
      setError(snapshotError?.response?.data?.error || snapshotError.message || 'No se pudo guardar el snapshot.');
    } finally {
      setGuardandoSnapshot(false);
    }
  }, [handleSave, idLayout, layout]);

  const handlePublishToggle = useCallback(async () => {
    const layoutId = idLayout || await handleSave({ silencioso: true });
    if (!layoutId) return;

    setGuardandoSnapshot(true);
    try {
      const nextStatus = estadoLayout === 'publicado' ? 'borrador' : 'publicado';
      await actualizarLayout(layoutId, {
        grid_rows: layoutToGridSnapshot(layout).grid_rows,
        grid_cols: layoutToGridSnapshot(layout).grid_cols,
        version: normalizeLayoutZones(layout).version || 1,
        estatus: nextStatus.toUpperCase(),
        id_lugar: Number(idLugar),
        id_dueno: Number(resolvedOwnerId),
      });
      await guardarSnapshotLayout(layoutId, {
        layout_data: normalizeLayoutZones(layout),
      }).catch(() => null);
      setEstadoLayout(nextStatus);
      setMensaje(nextStatus === 'publicado' ? 'Layout publicado correctamente' : 'Layout cambiado a borrador');
    } catch (publishError) {
      setError(publishError?.response?.data?.error || publishError.message || 'No se pudo cambiar el estado del layout.');
    } finally {
      setGuardandoSnapshot(false);
    }
  }, [estadoLayout, handleSave, idLayout, idLugar, layout, resolvedOwnerId]);

  useEffect(() => {
    autosaveRef.current = setInterval(() => {
      if (hasUnsavedChanges && !guardando) {
        handleSave({ silencioso: true }).catch(() => null);
      }
    }, 30000);

    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
  }, [guardando, hasUnsavedChanges, handleSave]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (cargando) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-divider bg-surface">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-background p-4 md:p-6">
      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
          {mensaje}
        </div>
      )}

      {!error && layout.sections.length === 0 && layout.elements.length === 0 && (
        <div className="rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
          El layout está vacío. Abre la consola (F12) y revisa los logs de "[EditorLayout]" para diagnosticar.
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-divider bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Editor de Lugar</h2>
            <p className="text-sm text-muted">
              {venue?.nombre ? `${venue.nombre} · ` : ''}
              Estado: <span className="font-medium text-foreground capitalize">{estadoLayout}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSave()}
              disabled={guardando}
              className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={handlePublishToggle}
              disabled={guardandoSnapshot || guardando}
              className="rounded-xl bg-default px-5 py-2 text-sm font-semibold text-default-foreground disabled:opacity-50"
            >
              {guardandoSnapshot ? 'Procesando...' : estadoLayout === 'publicado' ? 'Pasar a borrador' : 'Publicar layout'}
            </button>
            <button
              onClick={handleSaveSnapshot}
              disabled={guardandoSnapshot || !idLayout}
              className="rounded-xl border border-divider bg-surface-secondary px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
            >
              Snapshot
            </button>
            {onVolver && (
              <button
                onClick={onVolver}
                className="rounded-xl bg-default px-5 py-2 text-sm font-semibold text-default-foreground"
              >
                Volver
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className={hasUnsavedChanges ? 'font-medium text-warning' : 'font-medium text-success'}>
            {hasUnsavedChanges ? 'Cambios pendientes' : 'Sin cambios pendientes'}
          </span>
          <span>Secciones: {totalSections}</span>
          <span>Zonas: {totalZones}</span>
          <span>Elementos: {totalElements}</span>
          {lastSavedAt && (
            <span>
              Último guardado: {lastSavedAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span>Autoguardado cada 30 segundos</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <EditorToolbar
            onAddSection={handleAddSection}
            onAddStageElement={handleAddStageElement}
            onAddAisle={handleAddAisle}
            onDeleteSelected={handleDeleteSelected}
            hasSelection={Boolean(selectedItem)}
          />

          {layout.sections?.length === 0 && (
            <div className="rounded-xl border border-dashed border-divider bg-default px-4 py-3 text-sm text-muted">
              Agrega una sección para empezar a dibujar el mapa.
            </div>
          )}

          <EditorCanvas
            layout={layout}
            selectedItem={selectedItem}
            onSelectSection={(sectionId) => setSelectedItem({ kind: 'section', id: sectionId })}
            onSelectElement={(elementId) => setSelectedItem({ kind: 'element', id: elementId })}
            onMoveSection={handleMoveSection}
            onResizeSection={handleResizeSection}
            onMoveElement={handleMoveElement}
            onClearSelection={() => setSelectedItem(null)}
            onRequestSectionEdit={handleRequestSectionEdit}
          />
        </div>

        <ZonePanel
          zones={layout.zones || []}
          sections={layout.sections || []}
          onAddZone={handleAddZone}
          onUpdateZone={handleUpdateZone}
          onDeleteZone={handleDeleteZone}
          onAssignSectionZone={handleAssignSectionZone}
        />
      </div>

      <SectionConfigDialog
        open={sectionDialogOpen}
        section={getSelectedSection}
        zones={layout.zones || []}
        onClose={() => {
          setSectionDialogOpen(false);
          setEditingSectionId(null);
        }}
        onSave={handleSaveSectionDialog}
      />
    </div>
  );
}
