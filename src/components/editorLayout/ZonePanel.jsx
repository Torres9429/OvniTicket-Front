import { useEffect, useMemo, useState } from 'react';

const DEFAULT_FORM = {
  nombre: '',
  color: '#4a197f',
  precio: '0',
};

export default function ZonePanel({
  zones,
  sections,
  onAddZone,
  onUpdateZone,
  onDeleteZone,
  onAssignSectionZone,
}) {
  const [open, setOpen] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (!open) {
      setEditingZoneId(null);
      setForm(DEFAULT_FORM);
    }
  }, [open]);

  const sectionsWithoutZone = useMemo(
    () => (sections || []).filter((section) => !section.zoneId),
    [sections]
  );

  const openCreate = () => {
    setEditingZoneId(null);
    setForm(DEFAULT_FORM);
    setOpen(true);
  };

  const openEdit = (zone) => {
    setEditingZoneId(zone.id);
    setForm({
      nombre: zone.nombre || '',
      color: zone.color || '#4a197f',
      precio: String(zone.precio ?? 0),
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.nombre.trim()) return;
    const payload = {
      nombre: form.nombre.trim(),
      color: form.color,
      precio: Number(form.precio) || 0,
    };

    if (editingZoneId) {
      onUpdateZone(editingZoneId, payload);
    } else {
      onAddZone(payload);
    }

    setOpen(false);
  };

  return (
    <div className="flex h-full min-h-[460px] flex-col gap-4 rounded-2xl border border-divider bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Zonas</h3>
          <p className="text-xs text-muted">Nombre, color y precio base</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground"
        >
          Agregar zona
        </button>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto">
        {(zones || []).length === 0 && (
          <p className="text-sm text-muted">Todavía no hay zonas creadas.</p>
        )}

        {(zones || []).map((zone) => {
          const totalSections = (sections || []).filter((section) => String(section.zoneId) === String(zone.id)).length;
          return (
            <div key={zone.id} className="flex items-center gap-3 rounded-xl border border-divider bg-default px-3 py-2">
              <div className="size-4 rounded-full" style={{ backgroundColor: zone.color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{zone.nombre}</p>
                <p className="text-xs text-muted">${zone.precio || 0} · {totalSections} secciones</p>
              </div>
              <button
                onClick={() => openEdit(zone)}
                className="text-xs font-medium text-accent"
              >
                Editar
              </button>
              <button
                onClick={() => onDeleteZone(zone.id)}
                className="text-xs font-medium text-danger"
              >
                Borrar
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-divider pt-3">
        <h4 className="mb-2 text-sm font-semibold text-foreground">Secciones sin zona</h4>
        {sectionsWithoutZone.length === 0 ? (
          <p className="text-xs text-muted">Todas las secciones ya tienen una zona asignada.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sectionsWithoutZone.map((section) => (
              <label key={section.id} className="flex items-center gap-2 rounded-xl border border-divider bg-default px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{section.nombre}</span>
                <select
                  value={section.zoneId || ''}
                  onChange={(event) => onAssignSectionZone(section.id, event.target.value || null)}
                  className="rounded-lg border border-divider bg-surface px-2 py-1 text-xs text-foreground"
                >
                  <option value="">Sin zona</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>{zone.nombre}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-divider bg-surface p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">
              {editingZoneId ? 'Editar zona' : 'Agregar zona'}
            </h3>
            <div className="mt-4 grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                  className="w-full rounded-xl border border-divider bg-surface-secondary px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Color</label>
                  <input
                    type="color"
                    value={form.color}
                    onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                    className="h-11 w-full cursor-pointer rounded-xl border border-divider bg-surface-secondary p-1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Precio</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.precio}
                    onChange={(event) => setForm((prev) => ({ ...prev, precio: event.target.value }))}
                    className="w-full rounded-xl border border-divider bg-surface-secondary px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-divider bg-default px-3 py-2 text-sm font-medium text-default-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
