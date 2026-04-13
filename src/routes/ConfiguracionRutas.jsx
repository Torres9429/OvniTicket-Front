import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useAutenticacion } from "../hooks/usarAutenticacion";
import { Plantilla } from "../components/Plantilla";
import PaginaIniciarSesion from "../pages/PaginaIniciarSesion";
import PaginaRegistro from "../pages/PaginaRegistro";
import PaginaInicio from "../pages/PaginaInicio";
import PaginaEventos from "../pages/PaginaEventos";
import PaginaNoEncontrada from "../pages/PaginaNoEncontrada";
import PaginaUsuarios from "../pages/PaginaUsuarios";

// Paginas migradas desde OvniTicket
import PaginaDashboard from "../pages/PaginaDashboard";
import PaginaLugares from "../pages/PaginaLugares";
import PaginaCrearLugar from "../pages/PaginaCrearLugar";
import PaginaEditarLugar from "../pages/PaginaEditarLugar";
import PaginaMisEventos from "../pages/PaginaMisEventos";
import PaginaSolicitudes from "../pages/PaginaSolicitudes";
import PaginaPerfil from "../pages/PaginaPerfil";
import PaginaSinAcceso from "../pages/PaginaSinAcceso";
import PaginaSolicitarDueno from "../pages/PaginaSolicitarDueno";
import PaginaDetalleEvento from "../pages/PaginaDetalleEvento";
import PaginaCheckout from "../pages/PaginaCheckout";
import PaginaConfirmacion from "../pages/PaginaConfirmacion";
import PaginaMisOrdenes from "../pages/PaginaMisOrdenes";
import PaginaMisVentas from "../pages/PaginaMisVentas";

/**
 * Legacy redirect: old URL /eventos/:idEvento/layout/:idLayout/asientos
 * now forwards to /eventos/:idEvento so seat selection happens on the
 * event detail page itself.
 */
function RedireccionASeleccionEnDetalle() {
  const { idEvento } = useParams();
  return <Navigate to={`/eventos/${idEvento}`} replace />;
}

/**
 * Componente de ruta protegida
 * Si no hay sesión, redirige a /iniciar-sesion
 */
function RutaProtegida({ children }) {
  const { esAutenticado, cargando } = useAutenticacion();

  if (cargando) return null;
  if (!esAutenticado) return <Navigate to="/iniciar-sesion" replace />;

  return children;
}

/**
 * Ruta protegida con verificación de rol.
 * rolesPermitidos: array de roles en minúsculas, e.g. ['admin', 'organizador']
 */
function RutaProtegidaPorRol({ rolesPermitidos, children }) {
  const { esAutenticado, cargando, usuario } = useAutenticacion();

  if (cargando) return null;
  if (!esAutenticado) return <Navigate to="/iniciar-sesion" replace />;

  const rol = (usuario?.rol || "").toLowerCase();
  const aliases = {
    administrador: "admin",
    cliente: "organizador",
    client: "organizador",
    dueno: "organizador",
    dueño: "organizador",
  };
  const rolNormalizado = aliases[rol] || rol;

  if (!rolesPermitidos.includes(rolNormalizado)) {
    return <Navigate to="/sin-acceso" replace />;
  }

  return children;
}

/**
 * Configuración de rutas
 *
 * Plantilla funciona como ruta principal "/", con <Outlet /> para rutas hijas.
 * - Rutas públicas dentro del Plantilla: "/", "/iniciar-sesion", "/*"
 * - Rutas protegidas dentro del Plantilla: "/eventos", "/usuarios"
 */
export default function RutasConfiguracion() {
  const { cargando } = useAutenticacion();

  if (cargando) return null;

  return (
    <Routes>
      <Route path="/" element={<Plantilla />}>
        <Route index element={<PaginaInicio />} />

        <Route path="iniciar-sesion" element={<PaginaIniciarSesion />} />
        <Route path="registrar" element={<PaginaRegistro />} />

        <Route
          path="eventos"
          element={
            <RutaProtegida>
              <PaginaEventos />
            </RutaProtegida>
          }
        />
        <Route
          path="usuarios"
          element={
            <RutaProtegidaPorRol rolesPermitidos={["admin"]}>
              <PaginaUsuarios />
            </RutaProtegidaPorRol>
          }
        />

        {/* Rutas migradas desde OvniTicket */}
        <Route
          path="dashboard"
          element={
            <RutaProtegida>
              <PaginaDashboard />
            </RutaProtegida>
          }
        />
        <Route
          path="mis-lugares"
          element={
            <RutaProtegidaPorRol rolesPermitidos={["admin", "organizador"]}>
              <PaginaLugares />
            </RutaProtegidaPorRol>
          }
        />
        <Route
          path="mis-lugares/crear"
          element={
            <RutaProtegidaPorRol rolesPermitidos={["admin", "organizador"]}>
              <PaginaCrearLugar />
            </RutaProtegidaPorRol>
          }
        />
        <Route
          path="mis-lugares/editar/:id"
          element={
            <RutaProtegidaPorRol rolesPermitidos={["admin", "organizador"]}>
              <PaginaEditarLugar />
            </RutaProtegidaPorRol>
          }
        />
        <Route
          path="mis-eventos"
          element={
            <RutaProtegidaPorRol rolesPermitidos={["admin", "organizador"]}>
              <PaginaMisEventos />
            </RutaProtegidaPorRol>
          }
        />
        <Route
          path="ventas"
          element={
            <RutaProtegidaPorRol rolesPermitidos={["admin", "organizador"]}>
              <PaginaMisVentas />
            </RutaProtegidaPorRol>
          }
        />
        <Route
          path="admin/solicitudes"
          element={
            <RutaProtegidaPorRol rolesPermitidos={["admin"]}>
              <PaginaSolicitudes />
            </RutaProtegidaPorRol>
          }
        />
        <Route
          path="perfil"
          element={
            <RutaProtegida>
              <PaginaPerfil />
            </RutaProtegida>
          }
        />
        <Route
          path="solicitar-dueno"
          element={
            <RutaProtegida>
              <PaginaSolicitarDueno />
            </RutaProtegida>
          }
        />
        <Route path="eventos/:id" element={<PaginaDetalleEvento />} />
        {/* Legacy seat-selection URL — redirect to the event detail page (seat
            selection now lives inline on /eventos/:id) */}
        <Route
          path="eventos/:idEvento/layout/:idLayout/asientos"
          element={<RedireccionASeleccionEnDetalle />}
        />
        <Route
          path="checkout"
          element={
            <RutaProtegida>
              <PaginaCheckout />
            </RutaProtegida>
          }
        />
        <Route
          path="confirmacion/:id"
          element={
            <RutaProtegida>
              <PaginaConfirmacion />
            </RutaProtegida>
          }
        />
        {/* Legacy /confirmacion (sin id) — redirige a mis-ordenes porque sin id
            no podemos saber qué orden mostrar */}
        <Route
          path="confirmacion"
          element={<Navigate to="/mis-ordenes" replace />}
        />
        <Route
          path="mis-ordenes"
          element={
            <RutaProtegida>
              <PaginaMisOrdenes />
            </RutaProtegida>
          }
        />
        {/* Alias de /mis-ordenes orientado a usuarios finales. Misma pantalla,
            mismo backend, título ajustado según la ruta. */}
        <Route
          path="mis-boletos"
          element={
            <RutaProtegida>
              <PaginaMisOrdenes />
            </RutaProtegida>
          }
        />
        <Route path="sin-acceso" element={<PaginaSinAcceso />} />
        <Route path="*" element={<PaginaNoEncontrada />} />
      </Route>
    </Routes>
  );
}
