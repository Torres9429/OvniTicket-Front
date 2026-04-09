import { useState } from 'react';

const COLORES_PREDEFINIDOS = [
  '#1b728d', '#e53e3e', '#38a169', '#d69e2e',
  '#805ad5', '#dd6b20', '#3182ce', '#d53f8c',
  '#2b6cb0', '#c05621', '#276749', '#9b2c2c',
];

export default function PanelZonas({
  zonas,
  zonaActiva,
  onSeleccionar,
  onAgregar,
  onEliminar,
  onEditar,
}) {
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState(COLORES_PREDEFINIDOS[0]);
  const [editandoId, setEditandoId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAgregar = () => {
    if (!nombre.trim()) return;
    onAgregar({ nombre: nombre.trim(), color });
    setNombre('');
    setColor(COLORES_PREDEFINIDOS[(zonas.length + 1) % COLORES_PREDEFINIDOS.length]);
  };

  const iniciarEdicion = (zona) => {
    setEditandoId(zona.id);
    setEditNombre(zona.nombre);
    setEditColor(zona.color);
  };

  const confirmarEdicion = () => {
    if (!editNombre.trim()) return;
    onEditar(editandoId, { nombre: editNombre.trim(), color: editColor });
    setEditandoId(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-sm">Zonas</h3>

      {/* Lista de zonas */}
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {zonas.length === 0 && (
          <p className="text-xs text-default-400">Sin zonas. Agrega una abajo.</p>
        )}
        {zonas.map((zona) => (
          <div key={zona.id}>
            {editandoId === zona.id ? (
              <div className="flex gap-1 items-center">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                />
                <input
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmarEdicion()}
                  className="flex-1 text-xs px-2 py-1 border rounded"
                  autoFocus
                />
                <button onClick={confirmarEdicion} className="text-xs text-success hover:underline">
                  ✓
                </button>
                <button onClick={() => setEditandoId(null)} className="text-xs text-default-400 hover:underline">
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSeleccionar(zona.id)}
                onDoubleClick={() => iniciarEdicion(zona)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-left text-xs transition-all ${
                  zonaActiva === zona.id
                    ? 'bg-primary/10 ring-1 ring-primary/40'
                    : 'hover:bg-default-100'
                }`}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: zona.color }}
                />
                <span className="flex-1 truncate">{zona.nombre}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onEliminar(zona.id); }}
                  className="text-danger/60 hover:text-danger text-xs shrink-0"
                >
                  ✕
                </button>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Agregar zona */}
      <div className="flex flex-col gap-2 pt-2 border-t border-default-200">
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 p-0"
          />
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAgregar()}
            placeholder="Nombre de zona"
            className="flex-1 text-xs px-2 py-1.5 border rounded border-default-300 bg-transparent"
          />
        </div>
        <button
          onClick={handleAgregar}
          disabled={!nombre.trim()}
          className="text-xs font-medium px-3 py-1.5 rounded bg-primary text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          + Agregar zona
        </button>
      </div>
    </div>
  );
}
