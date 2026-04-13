import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { MapaAsientos } from '../components/mapaAsientos';

export default function PaginaSeleccionAsientos() {
  const { idEvento, idLayout } = useParams();
  const navigate = useNavigate();
  const [selectedSeats, setSelectedSeats] = useState([]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Selecciona tus asientos</h1>
          <p className="text-default-500 mt-1">
            Haz doble click para hacer zoom. Arrastra para mover el mapa.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm rounded-lg border border-default-300 hover:bg-default-100 transition-colors"
        >
          Volver
        </button>
      </div>

      <MapaAsientos
        idLayout={Number(idLayout)}
        idEvento={Number(idEvento)}
        onSeleccionCambia={setSelectedSeats}
        maxSeleccion={10}
      />

      {selectedSeats.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              // Will navigate to the purchase flow in Phase 4
              console.log('Continuar con:', selectedSeats);
            }}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Continuar ({selectedSeats.length} asiento{selectedSeats.length !== 1 ? 's' : ''})
          </button>
        </div>
      )}
    </div>
  );
}
