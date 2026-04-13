import { useContext } from "react";
import { ContextoAutenticacion } from "../context/ContextoAutenticacion";

/**
 * Custom hook para acceder al contexto de autenticación
 * Uso: const { user, isAuthenticated, handleLogin, handleLogout } = useAuth();
 */
export function useAuth() {
  const context = useContext(ContextoAutenticacion);

  if (!context) {
    throw new Error(
      "useAuth debe ser usado dentro de un ProveedorAutenticacion",
    );
  }

  return context;
}
