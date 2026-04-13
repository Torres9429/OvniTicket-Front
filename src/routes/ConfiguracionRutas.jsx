import { Routes, Route, Navigate, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import { Plantilla } from "../components/Plantilla";
import PaginaIniciarSesion from "../pages/PaginaIniciarSesion";
import PaginaRegistro from "../pages/PaginaRegistro";
import PaginaInicio from "../pages/PaginaInicio";
import PaginaEventos from "../pages/PaginaEventos";
import PaginaNoEncontrada from "../pages/PaginaNoEncontrada";
import PaginaUsuarios from "../pages/PaginaUsuarios";

// Pages migrated from OvniTicket
import PaginaLugares from "../pages/PaginaLugares";
import PaginaLayoutsEditar from "../pages/PaginaLayoutsEditar";
import PaginaMisEventos from "../pages/PaginaMisEventos";
import PaginaSolicitudes from "../pages/PaginaSolicitudes";
import PaginaSinAcceso from "../pages/PaginaSinAcceso";
import PaginaSolicitarDueno from "../pages/PaginaSolicitarDueno";
import PaginaDetalleEvento from "../pages/PaginaDetalleEvento";
import PaginaCheckout from "../pages/PaginaCheckout";
import PaginaConfirmacion from "../pages/PaginaConfirmacion";
import PaginaMisOrdenes from "../pages/PaginaMisOrdenes";
import PaginaMisVentas from "../pages/PaginaMisVentas";
import PaginaLayouts from "../pages/PaginaLayouts";
import { useAuth } from "../hooks/useAuth";

/**
 * Legacy redirect: old URL /eventos/:idEvento/layout/:idLayout/asientos
 * now forwards to /eventos/:idEvento so seat selection happens on the
 * event detail page itself.
 */
function RedirectToDetailSelection() {
  const { idEvento } = useParams();
  return <Navigate to={`/eventos/${idEvento}`} replace />;
}

/**
 * Protected route component.
 * If there is no session, redirects to /iniciar-sesion.
 */
function ProtectedRoute({ children }) {
  const { esAutenticado: isAuthenticated, cargando: loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/iniciar-sesion" replace />;

  return children;
}

/**
 * Role-protected route.
 * allowedRoles: array of roles in lowercase, e.g. ['admin', 'organizador']
 */
function RoleProtectedRoute({ allowedRoles, children }) {
  const { esAutenticado: isAuthenticated, cargando: loading, usuario: user } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/iniciar-sesion" replace />;

  const role = (user?.rol || "").toLowerCase();
  const aliases = {
    administrador: "admin",
    cliente: "organizador",
    client: "organizador",
    dueno: "organizador",
    dueño: "organizador",
  };
  const normalizedRole = aliases[role] || role;

  if (!allowedRoles.includes(normalizedRole)) {
    return <Navigate to="/sin-acceso" replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

RoleProtectedRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * Route configuration.
 *
 * Plantilla acts as the root route "/" with <Outlet /> for child routes.
 * - Public routes inside Plantilla: "/", "/iniciar-sesion", "/*"
 * - Protected routes inside Plantilla: "/eventos", "/usuarios"
 */
export default function ConfiguracionRutas() {
  const { cargando: loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/" element={<Plantilla />}>
        <Route index element={<PaginaInicio />} />

        <Route path="iniciar-sesion" element={<PaginaIniciarSesion />} />
        <Route path="registrar" element={<PaginaRegistro />} />

        <Route
          path="eventos"
          element={
            <ProtectedRoute>
              <PaginaEventos />
            </ProtectedRoute>
          }
        />
        <Route
          path="usuarios"
          element={
            <RoleProtectedRoute allowedRoles={["admin"]}>
              <PaginaUsuarios />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="lugares"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "organizador"]}>
              <PaginaLugares />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="lugares/:idLugar/layouts/:idLayout"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'organizador']}>
              <PaginaLayoutsEditar />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="lugares/:idLugar/layouts"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'organizador']}>
              <PaginaLayouts />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="mis-eventos"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "organizador"]}>
              <PaginaMisEventos />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="ventas"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "organizador"]}>
              <PaginaMisVentas />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="admin/solicitudes"
          element={
            <RoleProtectedRoute allowedRoles={["admin"]}>
              <PaginaSolicitudes />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="solicitar-dueno"
          element={
            <ProtectedRoute>
              <PaginaSolicitarDueno />
            </ProtectedRoute>
          }
        />
        <Route path="eventos/:id" element={<PaginaDetalleEvento />} />
        {/* Legacy seat-selection URL — redirect to the event detail page (seat
            selection now lives inline on /eventos/:id) */}
        <Route
          path="eventos/:idEvento/layout/:idLayout/asientos"
          element={<RedirectToDetailSelection />}
        />
        <Route
          path="checkout"
          element={
            <ProtectedRoute>
              <PaginaCheckout />
            </ProtectedRoute>
          }
        />
        <Route
          path="confirmacion/:id"
          element={
            <ProtectedRoute>
              <PaginaConfirmacion />
            </ProtectedRoute>
          }
        />
        {/* Legacy /confirmacion (no id) — redirects to mis-ordenes because without an id
            we cannot know which order to show */}
        <Route
          path="confirmacion"
          element={<Navigate to="/mis-ordenes" replace />}
        />
        <Route
          path="mis-ordenes"
          element={
            <ProtectedRoute>
              <PaginaMisOrdenes />
            </ProtectedRoute>
          }
        />
        {/* Alias of /mis-ordenes aimed at end-users. Same screen,
            same backend, title adjusted based on the route. */}
        <Route
          path="mis-boletos"
          element={
            <ProtectedRoute>
              <PaginaMisOrdenes />
            </ProtectedRoute>
          }
        />
        <Route path="sin-acceso" element={<PaginaSinAcceso />} />
        <Route path="*" element={<PaginaNoEncontrada />} />
      </Route>
    </Routes>
  );
}
