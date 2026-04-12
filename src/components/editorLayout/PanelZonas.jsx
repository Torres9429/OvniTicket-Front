import { useState } from 'react';

const COLORES_PREDEFINIDOS = [
  '#4a197f', '#e11d48', '#16a34a', '#d97706',
  '#2563eb', '#0f766e', '#7c3aed', '#dc2626',
  '#0ea5e9', '#f59e0b', '#22c55e', '#9333ea',
];

export default function PanelZonas({
  zonas,
  zonaActiva,
  onSeleccionar,
  onAgregar,
  onEliminar,
  onEditar,
  asientosPorZona = {},
}) {
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState(COLORES_PREDEFINIDOS[0]);
  const [precio, setPrecio] = useState('0');
  const [editandoId, setEditandoId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editPrecio, setEditPrecio] = useState('0');

  const handleAgregar = () => {
    if (!nombre.trim()) return;
    onAgregar({ nombre: nombre.trim(), color, precio: Number(precio) || 0 });
    setNombre('');
    setColor(COLORES_PREDEFINIDOS[(zonas.length + 1) % COLORES_PREDEFINIDOS.length]);
    setPrecio('0');
  };

  const iniciarEdicion = (zona) => {
    setEditandoId(zona.id);
    setEditNombre(zona.nombre);
    setEditColor(zona.color);
    setEditPrecio(String(zona.precio ?? 0));
  };

  const confirmarEdicion = () => {
    if (!editNombre.trim()) return;
    onEditar(editandoId, { nombre: editNombre.trim(), color: editColor, precio: Number(editPrecio) || 0 });
    setEditandoId(null);
  };

  return (
    <div className="flex h-full min-h-[420px] flex-col gap-3 rounded-2xl border border-divider bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Zonas</h3>
        <button
          onClick={handleAgregar}
          disabled={!nombre.trim()}
          className="text-xl font-bold leading-none text-accent disabled:opacity-40"
          title="Agregar zona"
        >
          +
        </button>
      </div>

      <div className="flex max-h-[52vh] flex-col gap-2 overflow-y-auto">
        {zonas.length === 0 && <p className="text-xs text-muted">Sin zonas. Agrega una abajo.</p>}
        {zonas.map((zona) => (
          <div key={zona.id}>
            {editandoId === zona.id ? (
              <div className="flex items-center gap-1 rounded-lg bg-surface-secondary p-2">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-6 w-6 cursor-pointer rounded border-0 p-0"
                />
                <input
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmarEdicion()}
                  className="flex-1 rounded border border-divider bg-surface px-2 py-1 text-xs text-foreground"
                  autoFocus
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editPrecio}
                  onChange={(e) => setEditPrecio(e.target.value)}
                  className="w-20 rounded border border-divider bg-surface px-2 py-1 text-xs text-foreground"
                  title="Precio base"
                />
                <button onClick={confirmarEdicion} className="text-xs text-success hover:underline">
                  ✓
                </button>
                <button onClick={() => setEditandoId(null)} className="text-xs text-muted hover:underline">
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSeleccionar(zona.id)}
                onDoubleClick={() => iniciarEdicion(zona)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-all ${
                  zonaActiva === zona.id ? 'bg-default-100 ring-1 ring-accent/40' : 'hover:bg-default-100'
                }`}
              >
                <div className="h-5 w-5 shrink-0 rounded-full" style={{ backgroundColor: zona.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{zona.nombre}</p>
                  <p className="text-xs text-muted">
                    {asientosPorZona[zona.id] || 0} asientos
                    {zona.precio != null ? ` · $${zona.precio}` : ''}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    iniciarEdicion(zona);
                  }}
                  className="shrink-0 text-sm text-muted hover:text-foreground"
                  title="Editar zona"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEliminar(zona.id);
                  }}
                  className="shrink-0 text-sm text-danger/70 hover:text-danger"
                  title="Eliminar zona"
                >
                  🗑
                </button>
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-divider pt-2">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded border-0 p-0"
          />
          <input
            type="number"
            min={0}
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="Precio"
            className="w-24 rounded border border-divider bg-surface-secondary px-2 py-1.5 text-xs text-foreground"
          />
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAgregar()}
            placeholder="Nombre de zona"
            className="flex-1 rounded border border-divider bg-surface-secondary px-2 py-1.5 text-xs text-foreground"
          />
        </div>
        <button
          onClick={handleAgregar}
          disabled={!nombre.trim()}
          className="rounded-xl border border-accent px-3 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/10 disabled:opacity-40"
        >
          AGREGAR ZONA
        </button>
      </div>
    </div>
  );
}
