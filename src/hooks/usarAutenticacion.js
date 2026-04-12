import { useContext } from 'react';
import { ContextoAutenticacion } from '../context/ContextoAutenticacion';

/**
 * Custom hook para acceder al contexto de autenticación
 * Uso: const { usuario, esAutenticado, manejarAcceso, manejarSalida } = usarAutenticacion();
 */
export function usarAutenticacion() {
  const contexto = useContext(ContextoAutenticacion);

  if (!contexto) {
    throw new Error('usarAutenticacion debe ser usado dentro de un ProveedorAutenticacion');
  }

  return contexto;
}
