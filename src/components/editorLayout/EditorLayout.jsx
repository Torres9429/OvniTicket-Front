import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Spinner, Tooltip } from '@heroui/react';
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
  layoutToGridSnapshot,
  normalizeLayoutZones,
} from './layoutModel';
import { getVenue } from '../../services/lugares.api';
import { createLayout, updateLayout, saveLayoutSnapshot, getLayout } from '../../services/layouts.api';
import { createZone, updateZone, deleteZone, getZones } from '../../services/zonas.api';
import { syncGridCells } from '../../services/gridCells.api';
import { createSeat, deleteSeat, getSeats } from '../../services/asientos.api';
import { ArrowShapeTurnUpLeft, CircleInfo, CloudCheck, CloudSlash, FloppyDisk } from '@gravity-ui/icons';
import { useAuth } from '../../hooks/useAuth';

function getCurrentUserId(user) {
  return user?.userId ?? user?.id_usuario ?? user?.id ?? null;
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

function formatBaseSection(section, sectionIdx, overrides) {
  return {
    ...section,
    id: section.id,
    nombre: section.nombre || `Sección ${sectionIdx + 1}`,
    zoneId: section.zoneId || null,
    x: typeof section.x === 'number' ? section.x : 100,
    y: typeof section.y === 'number' ? section.y : 100,
    rotation: typeof section.rotation === 'number' ? section.rotation : 0,
    ...overrides
  };
}

function normalizeSectionRows(section, sectionIdx) {
  const hasValidRows = Array.isArray(section.rows) && 
                       section.rows.length > 0 && 
                       section.rows.every(row => Array.isArray(row.seats) && row.seats.length > 0);

  if (!hasValidRows) {
    const numRows = Number(section.numRows || 3);
    const seatsPerRow = Number(section.seatsPerRow || 8);
    const newRows = Array.from({ length: numRows }, (_, rowIdx) => ({
      id: `row-${section.id}-${rowIdx}`,
      label: String.fromCodePoint(65 + rowIdx),
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
    return formatBaseSection(section, sectionIdx, { numRows, seatsPerRow, rows: newRows });
  }

  const numRows = section.rows.length;
  const seatsPerRow = section.rows[0]?.seats?.length || 1;
  const rows = section.rows.map((row, rowIdx) => ({
    ...row,
    id: row.id || `row-${rowIdx}`,
    label: row.label || String.fromCodePoint(65 + rowIdx),
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
  return formatBaseSection(section, sectionIdx, { numRows, seatsPerRow, rows });
}

function normalizeElement(el) {
  return {
    ...el,
    id: el.id || createId(),
    type: el.type || 'stage',
    x: typeof el.x === 'number' ? el.x : 0,
    y: typeof el.y === 'number' ? el.y : 0,
    width: typeof el.width === 'number' ? el.width : 200,
    height: typeof el.height === 'number' ? el.height : 100,
    rotation: typeof el.rotation === 'number' ? el.rotation : 0,
  };
}

function ensureValidLayout(layout) {
  const normalized = normalizeLayoutZones(layout);
  const sections = (normalized.sections || []).map(normalizeSectionRows);
  const elements = Array.isArray(normalized.elements) ? normalized.elements.map(normalizeElement) : [];

  return {
    ...normalized,
    sections,
    elements,
    zones: Array.isArray(normalized.zones) ? normalized.zones : [],
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

function deduplicateBackendZones(zones) {
  const seenNames = new Set();
  const uniqueZones = [];
  for (const zone of zones) {
    if (!seenNames.has(zone.nombre)) {
      seenNames.add(zone.nombre);
      uniqueZones.push({
        id: zone.id_zona || zone.id,
        idBackend: zone.id_zona || zone.id,
        id_zona: zone.id_zona || zone.id,
        nombre: zone.nombre,
        color: zone.color,
        precio: Number(zone.precio || 0),
      });
    }
  }
  return uniqueZones;
}

function remapSectionsWithZones(snapshot, mergedZones) {
  const snapshotZones = snapshot.zones || [];
  const sectionZoneRemap = new Map();
  for (const sz of snapshotZones) {
    const match = mergedZones.find((bz) => bz.nombre === sz.nombre);
    if (match && String(match.id) !== String(sz.id)) {
      sectionZoneRemap.set(String(sz.id), String(match.id));
    }
  }

  return (snapshot.sections || []).map((section) => {
    if (section.zoneId && sectionZoneRemap.has(String(section.zoneId))) {
      return { ...section, zoneId: sectionZoneRemap.get(String(section.zoneId)) };
    }
    return section;
  });
}

async function syncBackendZones(normalizedLayout, currentLayoutId) {
  const existingZones = await getZones().catch(() => []);
  const zonesForLayout = (existingZones || []).filter((zone) => String(zone.id_layout) === String(currentLayoutId));
  const zoneIdMap = new Map();

  const backendZoneMap = new Map();
  for (const bz of zonesForLayout) {
    backendZoneMap.set(String(bz.id_zona), bz);
  }

  for (const zone of normalizedLayout.zones || []) {
    const payload = {
      nombre: zone.nombre,
      color: zone.color,
      precio: Number(zone.precio) || 0,
      id_layout: currentLayoutId,
    };

    const backendId = resolveBackendZoneId(zone);
    if (backendId && backendZoneMap.has(String(backendId))) {
      await updateZone(backendId, payload);
      zoneIdMap.set(String(zone.id), backendId);
    } else {
      const createdZone = await createZone(payload);
      zoneIdMap.set(String(zone.id), createdZone.id_zona);
    }
  }

  const zonesAfterSave = (normalizedLayout.zones || []).map((zone) => ({
    ...zone,
    id: zone.id,
    idBackend: zoneIdMap.get(String(zone.id)) || resolveBackendZoneId(zone) || zone.id,
  }));

  const activeBackendIds = new Set(zonesAfterSave.map((z) => String(z.idBackend)));
  await Promise.all(
    zonesForLayout
      .filter((zone) => !activeBackendIds.has(String(zone.id_zona)))
      .map((zone) => deleteZone(zone.id_zona).catch(() => {})),
  );

  return zonesAfterSave;
}

async function deleteAllZoneSeats(allSeats, zonesAfterSave) {
  for (const zone of zonesAfterSave) {
    const backendZoneId = resolveBackendZoneId(zone);
    if (!backendZoneId) continue;
    const zoneSeatIds = (allSeats || [])
      .filter((a) => String(a.id_zona) === String(backendZoneId))
      .map((a) => a.id_asiento);
    for (const id of zoneSeatIds) {
      await deleteSeat(id).catch(() => {});
    }
  }
}

async function createAllSeats(normalizedLayout, zonesAfterSave) {
  const SPACING = 36;
  let seatNumber = 1;
  for (const section of normalizedLayout.sections || []) {
    const zone = zonesAfterSave.find((z) => String(z.id) === String(section.zoneId));
    if (!zone) continue;
    const backendZoneId = resolveBackendZoneId(zone);
    if (!backendZoneId) continue;

    const startRow = Math.max(0, Math.round((section.y || 0) / SPACING));
    const startCol = Math.max(0, Math.round((section.x || 0) / SPACING));

    for (const [rowIdx, row] of (section.rows || []).entries()) {
      for (const [seatIdx] of (row.seats || []).entries()) {
        await createSeat({
          grid_row: startRow + rowIdx,
          grid_col: startCol + seatIdx,
          numero_asiento: seatNumber,
          existe: 1,
          id_zona: backendZoneId,
        }).catch(() => {});
        seatNumber += 1;
      }
    }
  }
}

async function syncGridAndSeats(normalizedLayout, zonesAfterSave) {
  try {
    const allSeats = await getSeats().catch(() => []);
    await deleteAllZoneSeats(allSeats, zonesAfterSave);
    await createAllSeats(normalizedLayout, zonesAfterSave);
  } catch (seatsError) {
    console.warn('[EditorLayout] Error parcial en asientos:', seatsError);
  }
}

export default function EditorLayout({
  venueId,
  ownerId,
  initialVenue = null,
  existingLayoutId = null,
  initialLayout = null,
  onSaved,
  onGoBack = null,
}) {
  const { user } = useAuth();
  const [venue, setVenue] = useState(null);
  const [layout, setLayout] = useState(createDefaultLayout());
  const [layoutId, setLayoutId] = useState(existingLayoutId);
  const [layoutStatus, setLayoutStatus] = useState('borrador');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const autosaveRef = useRef(null);

  const currentUserId = useMemo(() => getCurrentUserId(user), [user]);
  const resolvedOwnerId = useMemo(() => ownerId || currentUserId, [ownerId, currentUserId]);

  const totalSections = layout.sections?.length || 0;
  const totalZones = layout.zones?.length || 0;
  const totalElements = layout.elements?.length || 0;

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    setMessage(null);
  }, []);

  const updateLayoutState = useCallback((updater) => {
    setLayout((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return ensureValidLayout(next);
    });
    markDirty();
  }, [markDirty]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const venueData = initialVenue || await getVenue(venueId);
        if (cancelled) return;

        const venueOwnerId = getVenueOwnerId(venueData);
        if (resolvedOwnerId != null && venueOwnerId != null && String(venueOwnerId) !== String(resolvedOwnerId)) {
          throw new Error('El lugar no pertenece al usuario actual.');
        }

        setVenue(venueData);

        const resolvedInitialLayout = initialLayout?.layout || initialLayout || null;
        const initialLayoutId = resolvedInitialLayout?.id_layout || resolvedInitialLayout?.id || existingLayoutId;

        if (!initialLayoutId) {
          setLayout(createDefaultLayout());
          setLayoutStatus('borrador');
          setLayoutId(null);
          setHasUnsavedChanges(false);
          return;
        }

        console.log('[EditorLayout] Cargando layout:', initialLayoutId);

        // Si el padre ya pasó el snapshot completo, lo usamos directamente
        const layoutData = resolvedInitialLayout?.layout_data
          ? resolvedInitialLayout
          : await getLayout(initialLayoutId);
        if (cancelled) return;

        console.log('[EditorLayout] layoutData recibido:', layoutData);

        // Siempre obtener zonas del backend (fuente de verdad)
        const allZones = await getZones().catch(() => []);
        const zonesForThisLayout = (allZones || [])
          .filter((zone) => String(zone.id_layout) === String(initialLayoutId));

        const uniqueBackendZones = deduplicateBackendZones(zonesForThisLayout);

        console.log('[EditorLayout] ========== LAYOUT LOADING ==========');
        console.log('[EditorLayout] layoutData:', {
          id_layout: layoutData.id_layout || initialLayoutId,
          hasLayoutData: !!layoutData?.layout_data,
          zonesFromBackend: uniqueBackendZones.length,
        });

        // El layout_data contiene la estructura completa
        const snapshotData = layoutData?.layout_data;

        const snapshot = snapshotData && (snapshotData.sections?.length > 0 || snapshotData.elements?.length > 0)
          ? normalizeLayoutZones(snapshotData)
          : createDefaultLayout();

        console.log('[EditorLayout] Snapshot loaded:', {
          sectionsCount: snapshot.sections?.length || 0,
          elementsCount: snapshot.elements?.length || 0,
        });

        // Usar zonas del backend (fuente de verdad), no del snapshot
        const mergedZones = uniqueBackendZones.length > 0 ? uniqueBackendZones : (snapshot.zones || []);

        const remappedSections = remapSectionsWithZones(snapshot, mergedZones);

        const normalizedLayout = ensureValidLayout({
          ...snapshot,
          sections: remappedSections,
          zones: mergedZones,
        });

        console.log('[EditorLayout] Final layout:', {
          sectionsCount: normalizedLayout.sections?.length || 0,
          elementsCount: normalizedLayout.elements?.length || 0,
          zonesCount: normalizedLayout.zones?.length || 0,
        });

        setLayout(normalizedLayout);
        setLayoutId(layoutData.id_layout || initialLayoutId);
        setLayoutStatus(String(layoutData.estatus || resolvedInitialLayout?.estatus || 'borrador').toLowerCase());
        setHasUnsavedChanges(false);
        setSelectedItem(null);
      } catch (loadError) {
        if (!cancelled) {
          console.error('[EditorLayout] Error loading:', loadError);
          setError(loadError?.message || 'No se pudo cargar el editor del lugar.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [venueId, existingLayoutId, initialLayout, resolvedOwnerId, initialVenue]);

  const handleAddSection = useCallback(() => {
    updateLayoutState((prev) => {
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
  }, [updateLayoutState]);

  const handleAddStageElement = useCallback(() => {
    updateLayoutState((prev) => {
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
  }, [updateLayoutState]);

  const handleAddAisle = useCallback(() => {
    updateLayoutState((prev) => {
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
  }, [updateLayoutState]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedItem) return;

    updateLayoutState((prev) => {
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
  }, [selectedItem, updateLayoutState]);

  const handleMoveSection = useCallback((sectionId, position) => {
    updateLayoutState((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((section) => (
        section.id === sectionId
          ? { ...section, x: position.x, y: position.y }
          : section
      )),
    }));
  }, [updateLayoutState]);

  const handleResizeSection = useCallback((sectionId, transform) => {
    updateLayoutState((prev) => ({
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
  }, [updateLayoutState]);

  const handleMoveElement = useCallback((elementId, position) => {
    updateLayoutState((prev) => ({
      ...prev,
      elements: (prev.elements || []).map((element) => (
        element.id === elementId
          ? { ...element, x: position.x, y: position.y }
          : element
      )),
    }));
  }, [updateLayoutState]);

  const handleAssignSectionZone = useCallback((sectionId, zoneId) => {
    updateLayoutState((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((section) => (
        section.id === sectionId
          ? { ...section, zoneId: zoneId || null }
          : section
      )),
    }));
  }, [updateLayoutState]);

  const handleAddZone = useCallback((zone) => {
    updateLayoutState((prev) => ({
      ...prev,
      zones: [...(prev.zones || []), { id: `local-${Date.now()}`, ...zone }],
    }));
  }, [updateLayoutState]);

  const handleUpdateZone = useCallback((zoneId, updates) => {
    updateLayoutState((prev) => ({
      ...prev,
      zones: (prev.zones || []).map((zone) => (
        String(zone.id) === String(zoneId)
          ? { ...zone, ...updates, precio: Number(updates.precio) || 0 }
          : zone
      )),
    }));
  }, [updateLayoutState]);

  const handleDeleteZone = useCallback((zoneId) => {
    updateLayoutState((prev) => ({
      ...prev,
      zones: (prev.zones || []).filter((zone) => String(zone.id) !== String(zoneId)),
      sections: (prev.sections || []).map((section) => (
        String(section.zoneId) === String(zoneId)
          ? { ...section, zoneId: null }
          : section
      )),
    }));
  }, [updateLayoutState]);

  const handleRequestSectionEdit = useCallback((sectionId) => {
    setEditingSectionId(sectionId);
    setSectionDialogOpen(true);
  }, []);

  const handleSaveSectionDialog = useCallback((payload) => {
    if (!editingSectionId) return;

    updateLayoutState((prev) => ({
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
  }, [editingSectionId, updateLayoutState]);

  const getSelectedSection = useMemo(
    () => layout.sections?.find((section) => section.id === editingSectionId) || null,
    [editingSectionId, layout.sections]
  );

  const handleSave = useCallback(async ({ silent = false } = {}) => {
    if (saving) return null;
    setSaving(true);
    setError(null);
    if (!silent) setMessage(null);

    try {
      const normalizedLayout = normalizeLayoutZones(layout);
      const snapshot = layoutToGridSnapshot(normalizedLayout);
      const currentVenueId = Number(venueId);
      const ownerIdNum = Number(resolvedOwnerId);

      let currentLayoutId = layoutId;

      if (currentLayoutId) {
        await updateLayout(currentLayoutId, {
          grid_rows: snapshot.grid_rows,
          grid_cols: snapshot.grid_cols,
          version: normalizedLayout.version || 1,
          estatus: layoutStatus.toUpperCase(),
          id_lugar: currentVenueId,
          id_dueno: ownerIdNum,
        });
      } else {
        const created = await createLayout({
          grid_rows: snapshot.grid_rows,
          grid_cols: snapshot.grid_cols,
          version: normalizedLayout.version || 1,
          estatus: layoutStatus.toUpperCase(),
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
          id_lugar: currentVenueId,
          id_dueno: ownerIdNum,
        });
        currentLayoutId = created.id_layout;
        setLayoutId(currentLayoutId);
      }

      // ── Sincronizar zonas ──
      const zonesAfterSave = await syncBackendZones(normalizedLayout, currentLayoutId);

      // ── Sincronizar grid cells con endpoint bulk ──
      const cells = layoutToGridSnapshot({ ...normalizedLayout, zones: zonesAfterSave }).cells;
      await syncGridCells(currentLayoutId, cells);

      // ── Guardar snapshot del layout ──
      await saveLayoutSnapshot(currentLayoutId, {
        layout_data: {
          ...normalizedLayout,
          zones: zonesAfterSave,
        },
      }).catch(() => null);

      // ── Sincronizar asientos (usando endpoints existentes) ──
      await syncGridAndSeats(normalizedLayout, zonesAfterSave);

      setLayout((prev) => normalizeLayoutZones({ ...prev, zones: zonesAfterSave }));
      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());

      if (!silent) {
        setMessage('Layout guardado correctamente');
      }

      onSaved?.(currentLayoutId);
      return currentLayoutId;
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError.message || 'No se pudo guardar el layout.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [saving, layoutId, venueId, layout, onSaved, resolvedOwnerId, layoutStatus]);

  const handlePublishToggle = useCallback(async () => {
    const currentLayoutId = layoutId || await handleSave({ silent: true });
    if (!currentLayoutId) return;

    setSavingSnapshot(true);
    try {
      const nextStatus = layoutStatus === 'publicado' ? 'borrador' : 'publicado';
      await updateLayout(currentLayoutId, {
        grid_rows: layoutToGridSnapshot(layout).grid_rows,
        grid_cols: layoutToGridSnapshot(layout).grid_cols,
        version: normalizeLayoutZones(layout).version || 1,
        estatus: nextStatus.toUpperCase(),
        id_lugar: Number(venueId),
        id_dueno: Number(resolvedOwnerId),
      });
      await saveLayoutSnapshot(currentLayoutId, {
        layout_data: normalizeLayoutZones(layout),
      }).catch(() => null);
      setLayoutStatus(nextStatus);
      setMessage(nextStatus === 'publicado' ? 'Layout publicado correctamente' : 'Layout cambiado a borrador');
    } catch (publishError) {
      setError(publishError?.response?.data?.error || publishError.message || 'No se pudo cambiar el estado del layout.');
    } finally {
      setSavingSnapshot(false);
    }
  }, [layoutStatus, handleSave, layoutId, venueId, layout, resolvedOwnerId]);

  useEffect(() => {
    autosaveRef.current = setInterval(() => {
      if (hasUnsavedChanges && !saving) {
        handleSave({ silent: true }).catch(() => null);
      }
    }, 30000);

    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
  }, [saving, hasUnsavedChanges, handleSave]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (loading) {
    return (
                  <div className="flex items-center justify-center py-52 text-muted-foreground text-sm">
                      <Spinner color="current" size="sm" />
                      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pl-8 pr-4 pt-3">
      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
          {message}
        </div>
      )}

      <div className="relative min-w-0 rounded-2xl">
        {layout.sections?.length === 0 && layout.elements?.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <p className="rounded-xl border border-dashed border-divider bg-surface/80 px-6 py-4 text-sm text-muted backdrop-blur-sm">
              Usa los botones de arriba para agregar secciones, escenarios o
              pasillos.
            </p>
          </div>
        )}

        <div className="absolute top-0 px-0 z-20 w-full flex justify-between items-center gap-4">
          <div>
            <div className="flex gap-3 items-center">
              <h2>Layout v{layout.version || 1}</h2>

              <Tooltip delay={0}>
                <Tooltip.Trigger aria-label="Info icon">
                  {hasUnsavedChanges ? (
                    <CloudSlash className="text-warning" />
                  ) : (
                    <CloudCheck />
                  )}
                </Tooltip.Trigger>
                <Tooltip.Content placement="right">
                  {hasUnsavedChanges ? "Cambios pendientes" : "Guardado"}
                </Tooltip.Content>
              </Tooltip>
            </div>
            <div className="flex gap-3 items-center">
              <p className="text-muted text-sm truncate">
                {venue?.nombre} — {venue?.ciudad}, {venue?.pais}
              </p>
              <Tooltip delay={0}>
                <Tooltip.Trigger aria-label="Info icon">
                  <CircleInfo className="text-muted" />
                </Tooltip.Trigger>
                <Tooltip.Content
                  placement="right"
                  className="flex flex-col gap-2 p-3"
                >
                  <p className="capitalize font-bold">{layoutStatus}</p>
                  <div className="flex flex-col">
                    <p className="text-sm">{totalSections} secciones</p>
                    <p className="text-sm">{totalZones} zonas</p>
                    <p className="text-sm">{totalElements} elementos</p>
                  </div>
                  {lastSavedAt && (
                    <>
                      <span>·</span>
                      <span>
                        {lastSavedAt.toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </>
                  )}
                </Tooltip.Content>
              </Tooltip>
            </div>
          </div>

          <EditorToolbar
            onAddSection={handleAddSection}
            onAddStageElement={handleAddStageElement}
            onAddAisle={handleAddAisle}
            onDeleteSelected={handleDeleteSelected}
            hasSelection={Boolean(selectedItem)}
          />
          <div className="flex gap-2">
            {onGoBack && (
              <Button
                aria-label="Volver a mis lugares"
                variant="ghost"
                onPress={onGoBack}
              >
                <ArrowShapeTurnUpLeft />
                Regresar
              </Button>
            )}
            <Button
              isDisabled={savingSnapshot || saving}
              isLoading={savingSnapshot}
              variant="tertiary"
              onPress={handlePublishToggle}
            >
              {layoutStatus === "publicado" ? "Pasar a borrador" : "Publicar"}
            </Button>
            <Button
              isPending={saving}
              isDisabled={saving}
              onPress={() => handleSave()}
            >
              {({ isPending }) => (
                <>
                  {isPending ? (
                    <Spinner color="current" size="sm" />
                  ) : (
                    <FloppyDisk />
                  )}
                  {isPending ? "Guardando..." : "Guardar"}
                </>
              )}
            </Button>
          </div>
        </div>

        <EditorCanvas
          layout={layout}
          selectedItem={selectedItem}
          onSelectSection={(sectionId) =>
            setSelectedItem({ kind: "section", id: sectionId })
          }
          onSelectElement={(elementId) =>
            setSelectedItem({ kind: "element", id: elementId })
          }
          onMoveSection={handleMoveSection}
          onResizeSection={handleResizeSection}
          onMoveElement={handleMoveElement}
          onClearSelection={() => setSelectedItem(null)}
          onRequestSectionEdit={handleRequestSectionEdit}
        />

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

EditorLayout.propTypes = {
  venueId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  ownerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  initialVenue: PropTypes.object,
  existingLayoutId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  initialLayout: PropTypes.object,
  onSaved: PropTypes.func.isRequired,
  onGoBack: PropTypes.func,
};
