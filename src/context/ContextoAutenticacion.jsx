/* eslint-disable react-refresh/only-export-components -- Contexto y proveedor en el mismo módulo */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { login } from "../services/autenticacion.api";

export const ContextoAutenticacion = createContext();

const LLAVES_ALMACENAMIENTO = {
  jwt: "jwt",
  refresh: "refresh",
  usuario: "usuario",
};

export const ProveedorAutenticacion = ({ children }) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(LLAVES_ALMACENAMIENTO.jwt);
    localStorage.removeItem(LLAVES_ALMACENAMIENTO.refresh);
    localStorage.removeItem(LLAVES_ALMACENAMIENTO.usuario);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setError(null);
    clearSession();
  }, [clearSession]);

  const handleLogin = useCallback(async (correo, contrasena) => {
    try {
      const response = await login({ correo, contrasena });

      const token = response?.data?.access;
      const refresh = response?.data?.refresh;
      const userData = response?.data?.usuario;

      if (!token || !userData) {
        throw new Error("Respuesta inválida del servidor");
      }

      localStorage.setItem(LLAVES_ALMACENAMIENTO.jwt, token);
      localStorage.setItem(LLAVES_ALMACENAMIENTO.refresh, refresh);
      localStorage.setItem(
        LLAVES_ALMACENAMIENTO.usuario,
        JSON.stringify(userData),
      );

      const userInfo = {
        userName: userData.nombre,
        role: userData.rol,
        userId: userData.id_usuario,
        email: userData.correo,
      };

      setUser(userInfo);
      setError(null);

      return { success: true, user: userInfo };
    } catch (err) {
      console.error("Error en iniciar sesión:", err);
      setUser(null);
      setError(
        err?.response?.data?.error || err.message || "Error de autenticación",
      );
      return { success: false, error: err.message };
    }
  }, []);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(
        LLAVES_ALMACENAMIENTO.usuario,
      );

      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser({
          userName: parsed.nombre,
          role: parsed.rol,
          userId: parsed.id_usuario,
          email: parsed.correo,
        });
      }
    } catch (err) {
      console.error("Error restaurando sesión:", err);
      handleLogout();
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  const value = useMemo(
    () => ({
      user,
      error,
      loading,
      isAuthenticated: !!user,
      handleLogin,
      handleLogout,
    }),
    [user, error, loading, handleLogin, handleLogout],
  );

  return (
    <ContextoAutenticacion.Provider value={value}>
      {children}
    </ContextoAutenticacion.Provider>
  );
};
