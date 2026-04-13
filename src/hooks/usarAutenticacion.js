import { useContext } from "react";
import { ContextoAutenticacion } from "../context/ContextoAutenticacion";

/**
 * Custom hook para acceder al contexto de autenticación
 * Uso: const { usuario, esAutenticado, manejarAcceso, manejarSalida } = useAutenticacion();
 */
export function useAutenticacion() {
  const contexto = useContext(ContextoAutenticacion);

  if (!contexto) {
    throw new Error(
      "useAutenticacion debe ser usado dentro de un ProveedorAutenticacion",
    );
  }

  return contexto;
}
