import { Routes, Route, Navigate } from 'react-router-dom';
import { usarAutenticacion } from '../hooks/usarAutenticacion';
import { Plantilla } from '../components/Plantilla';
import PaginaIniciarSesion from '../pages/PaginaIniciarSesion';
import PaginaRegistro from '../pages/PaginaRegistro';
import PaginaInicio from '../pages/PaginaInicio';
import PaginaEventos from '../pages/PaginaEventos';
import PaginaNoEncontrada from '../pages/PaginaNoEncontrada';
import PaginaUsuarios from '../pages/PaginaUsuarios';

// Paginas migradas desde OvniTicket
import PaginaDashboard from '../pages/PaginaDashboard';
import PaginaLugares from '../pages/PaginaLugares';
import PaginaCrearLugar from '../pages/PaginaCrearLugar';
import PaginaEditarLugar from '../pages/PaginaEditarLugar';
import PaginaMisEventos from '../pages/PaginaMisEventos';
import PaginaSolicitudes from '../pages/PaginaSolicitudes';
import PaginaPerfil from '../pages/PaginaPerfil';
import PaginaSinAcceso from '../pages/PaginaSinAcceso';
import PaginaSolicitarDueno from '../pages/PaginaSolicitarDueno';
import PaginaSeleccionAsientos from '../pages/PaginaSeleccionAsientos';

/**
 * Componente de ruta protegida
 * Si no hay sesión, redirige a /iniciar-sesion
 */
function RutaProtegida({ children }) {
  const { esAutenticado, cargando } = usarAutenticacion();

  if (cargando) return null;
  if (!esAutenticado) return <Navigate to="/iniciar-sesion" replace />;

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
  const { esAutenticado, cargando } = usarAutenticacion();

  if (cargando) return null;

  return (
    <Routes>
      <Route path="/" element={<Plantilla />}>
        <Route index element={<PaginaInicio />} />

        <Route
          path="iniciar-sesion"
          element={<PaginaIniciarSesion />}
        />
        <Route
          path="registrar"
          element={<PaginaRegistro />}
        />

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
            <RutaProtegida>
              <PaginaUsuarios />
            </RutaProtegida>
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
            <RutaProtegida>
              <PaginaLugares />
            </RutaProtegida>
          }
        />
        <Route
          path="mis-lugares/crear"
          element={
            <RutaProtegida>
              <PaginaCrearLugar />
            </RutaProtegida>
          }
        />
        <Route
          path="mis-lugares/editar/:id"
          element={
            <RutaProtegida>
              <PaginaEditarLugar />
            </RutaProtegida>
          }
        />
        <Route
          path="mis-eventos"
          element={
            <RutaProtegida>
              <PaginaMisEventos />
            </RutaProtegida>
          }
        />
        <Route
          path="admin/solicitudes"
          element={
            <RutaProtegida>
              <PaginaSolicitudes />
            </RutaProtegida>
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
        <Route
          path="eventos/:idEvento/layout/:idLayout/asientos"
          element={
            <RutaProtegida>
              <PaginaSeleccionAsientos />
            </RutaProtegida>
          }
        />
        <Route path="sin-acceso" element={<PaginaSinAcceso />} />
        <Route path="*" element={<PaginaNoEncontrada />} />
      </Route>
    </Routes>
  );
}
