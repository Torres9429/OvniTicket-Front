import { useEffect, useState } from 'react';

export default function SectionConfigDialog({ open, section, zones, onClose, onSave }) {
  const [nombre, setNombre] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [numRows, setNumRows] = useState(3);
  const [seatsPerRow, setSeatsPerRow] = useState(8);

  useEffect(() => {
    if (!open) return;
    setNombre(section?.nombre || '');
    setZoneId(section?.zoneId || '');
    setNumRows(section?.numRows || section?.rows?.length || 3);
    setSeatsPerRow(section?.seatsPerRow || section?.rows?.[0]?.seats?.length || 8);
  }, [open, section]);

  if (!open) return null;

  const handleSave = () => {
    onSave({
      nombre: nombre.trim(),
      zoneId: zoneId || null,
      numRows: Math.max(1, Number(numRows) || 1),
      seatsPerRow: Math.max(1, Number(seatsPerRow) || 1),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-divider bg-surface p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground">Configurar sección</h3>
        <p className="mt-1 text-sm text-muted">La sección se reconstruye completa cuando cambias filas o asientos.</p>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Nombre</label>
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className="w-full rounded-xl border border-divider bg-surface-secondary px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Zona</label>
            <select
              value={zoneId}
              onChange={(event) => setZoneId(event.target.value)}
              className="w-full rounded-xl border border-divider bg-surface-secondary px-3 py-2 text-sm text-foreground"
            >
              <option value="">Sin zona</option>
              {(zones || []).map((zone) => (
                <option key={zone.id} value={zone.id}>{zone.nombre}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Filas</label>
              <input
                type="number"
                min={1}
                max={50}
                value={numRows}
                onChange={(event) => setNumRows(event.target.value)}
                className="w-full rounded-xl border border-divider bg-surface-secondary px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Asientos por fila</label>
              <input
                type="number"
                min={1}
                max={50}
                value={seatsPerRow}
                onChange={(event) => setSeatsPerRow(event.target.value)}
                className="w-full rounded-xl border border-divider bg-surface-secondary px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-divider bg-default px-3 py-2 text-sm font-medium text-default-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
