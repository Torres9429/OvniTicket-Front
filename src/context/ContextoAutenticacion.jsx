/* eslint-disable react-refresh/only-export-components -- Contexto y proveedor en el mismo módulo */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { iniciarSesion } from "../services/autenticacion.api";

export const ContextoAutenticacion = createContext();

const LLAVES_ALMACENAMIENTO = {
  jwt: "jwt",
  refresh: "refresh",
  usuario: "usuario",
};

export const ProveedorAutenticacion = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  const limpiarSesion = useCallback(() => {
    localStorage.removeItem(LLAVES_ALMACENAMIENTO.jwt);
    localStorage.removeItem(LLAVES_ALMACENAMIENTO.refresh);
    localStorage.removeItem(LLAVES_ALMACENAMIENTO.usuario);
  }, []);

  const manejarSalida = useCallback(() => {
    setUsuario(null);
    setError(null);
    limpiarSesion();
  }, [limpiarSesion]);

  const manejarAcceso = useCallback(async (correo, contrasena) => {
    try {
      const respuesta = await iniciarSesion({ correo, contrasena });

      const token = respuesta?.data?.access;
      const refresh = respuesta?.data?.refresh;
      const datosUsuario = respuesta?.data?.usuario;

      if (!token || !datosUsuario) {
        throw new Error("Respuesta inválida del servidor");
      }

      localStorage.setItem(LLAVES_ALMACENAMIENTO.jwt, token);
      localStorage.setItem(LLAVES_ALMACENAMIENTO.refresh, refresh);
      localStorage.setItem(
        LLAVES_ALMACENAMIENTO.usuario,
        JSON.stringify(datosUsuario),
      );

      const infoUsuario = {
        nombreUsuario: datosUsuario.nombre,
        rol: datosUsuario.rol,
        idUsuario: datosUsuario.id_usuario,
        correo: datosUsuario.correo,
      };

      setUsuario(infoUsuario);
      setError(null);

      return { exito: true, usuario: infoUsuario };
    } catch (err) {
      console.error("Error en iniciar sesión:", err);
      setUsuario(null);
      setError(
        err?.response?.data?.error || err.message || "Error de autenticación",
      );
      return { exito: false, error: err.message };
    }
  }, []);

  useEffect(() => {
    try {
      const usuarioGuardado = localStorage.getItem(
        LLAVES_ALMACENAMIENTO.usuario,
      );

      if (usuarioGuardado) {
        const parseado = JSON.parse(usuarioGuardado);
        setUsuario({
          nombreUsuario: parseado.nombre,
          rol: parseado.rol,
          idUsuario: parseado.id_usuario,
          correo: parseado.correo,
        });
      }
    } catch (err) {
      console.error("Error restaurando sesión:", err);
      manejarSalida();
    } finally {
      setCargando(false);
    }
  }, [manejarSalida]);

  const valor = useMemo(
    () => ({
      usuario,
      error,
      cargando,
      esAutenticado: !!usuario,
      manejarAcceso,
      manejarSalida,
    }),
    [usuario, error, cargando, manejarAcceso, manejarSalida],
  );

  return (
    <ContextoAutenticacion.Provider value={valor}>
      {children}
    </ContextoAutenticacion.Provider>
  );
};
