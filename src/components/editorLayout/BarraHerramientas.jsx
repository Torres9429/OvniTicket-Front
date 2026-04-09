import { TIPOS_CELDA } from '../mapaAsientos/constantes';

const HERRAMIENTAS = [
  { tipo: TIPOS_CELDA.ZONA_ASIENTOS, label: 'Asiento', color: '#1b728d', icono: '💺' },
  { tipo: TIPOS_CELDA.ESCENARIO, label: 'Escenario', color: '#4a5568', icono: '🎭' },
  { tipo: TIPOS_CELDA.PASILLO, label: 'Pasillo', color: '#e2e8f0', icono: '🚶' },
  { tipo: TIPOS_CELDA.VACIO, label: 'Borrar', color: '#f7fafc', icono: '✕' },
];

export default function BarraHerramientas({ herramientaActiva, onCambiar }) {
  return (
    <div className="flex flex-wrap gap-2">
      {HERRAMIENTAS.map((h) => (
        <button
          key={h.tipo}
          onClick={() => onCambiar(h.tipo)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
            herramientaActiva === h.tipo
              ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30'
              : 'border-default-300 hover:bg-default-100'
          }`}
        >
          <span>{h.icono}</span>
          <span>{h.label}</span>
        </button>
      ))}
    </div>
  );
}
