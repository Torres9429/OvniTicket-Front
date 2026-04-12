import { TIPOS_CELDA } from '../mapaAsientos/constantes';

const HERRAMIENTAS = [
  { tipo: TIPOS_CELDA.ZONA_ASIENTOS, label: 'AGREGAR SECCION', icono: '▦', estilo: 'bg-accent text-accent-foreground hover:opacity-90' },
  { tipo: TIPOS_CELDA.ESCENARIO, label: 'AGREGAR ESCENARIO', icono: '◈', estilo: 'bg-default text-default-foreground hover:bg-default-100' },
  { tipo: TIPOS_CELDA.PASILLO, label: 'AGREGAR PASILLO', icono: '↕', estilo: 'bg-warning text-warning-foreground hover:opacity-90' },
  { tipo: TIPOS_CELDA.VACIO, label: 'ELIMINAR', icono: '🗑', estilo: 'bg-danger text-danger-foreground hover:opacity-90' },
];

export default function BarraHerramientas({ herramientaActiva, onCambiar }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {HERRAMIENTAS.map((h) => (
        <button
          key={h.tipo}
          onClick={() => onCambiar(h.tipo)}
          className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold transition-all shadow-sm border border-divider ${h.estilo} ${
            herramientaActiva === h.tipo
              ? 'ring-4 ring-accent/20 scale-[1.01]'
              : ''
          }`}
        >
          <span className="text-lg leading-none">{h.icono}</span>
          <span>{h.label}</span>
        </button>
      ))}
    </div>
  );
}
