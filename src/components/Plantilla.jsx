import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Badge, Button, Dropdown, Label, ScrollShadow, SearchField, Tabs, toast, Spinner } from '@heroui/react';
import { InterruptorTema } from './InterruptorTema';
import {
  House,
  Person,
  ArrowRight,
  Receipt,
  LayoutHeaderSideContent,
  Persons,
  MapPin,
  ShoppingCart,
  Calendar,
  ChartColumn,
  Ticket,
  Pencil,
  Key,
  ArrowRightFromSquare,
  Lock,
  PersonPencil,
  PencilToSquare,
  ArrowRightToSquare,
} from '@gravity-ui/icons';
import { usarAutenticacion } from '../hooks/usarAutenticacion';
import { normalizarRol } from '../utils/rutasAutorizacion';

/**
 * Mapeo de tab keys a rutas
 */
const TAB_ROUTES = {
  inicio: '/',
  // Admin
  eventos: '/eventos',
  usuarios: '/usuarios',
  lugares: '/lugares',
  // Cliente
  'mis-lugares': '/mis-lugares',
  'mis-eventos': '/mis-eventos',
  ventas: '/ventas',
  // Usuario
  'mis-boletos': '/mis-boletos',
  'mis-compras': '/mis-compras',
  // Público
  'iniciar-sesion': '/iniciar-sesion',
  registrar: '/registrar',
};

/**
 * Buscador aislado para prevenir lag de escritura
 */
function BuscadorNav({ busquedaGlobal, setbusquedaGlobal, getTabKey }) {
  const [val, setVal] = useState(busquedaGlobal);

  useEffect(() => {
    if (val !== busquedaGlobal) {
      setVal(busquedaGlobal);
    }
  }, [busquedaGlobal]);

  useEffect(() => {
    const t = setTimeout(() => {
      setbusquedaGlobal(val);
    }, 250);
    return () => clearTimeout(t);
  }, [val, setbusquedaGlobal]);

  return (
    <SearchField 
      name="search" 
      variant="secondary" 
      aria-label="Buscar" 
      className="w-full"
      value={val}
      onChange={setVal}
      onClear={() => setVal("")}
    >
      <SearchField.Group className="h-10 rounded-full w-full">
        {val !== busquedaGlobal ? (
          <div className="flex h-full items-center justify-center pl-3">
            <Spinner size="sm" color="current" className="opacity-50" />
          </div>
        ) : (
          <SearchField.SearchIcon />
        )}
        <SearchField.Input 
          placeholder={
            getTabKey() === 'usuarios' ? 'Buscar usuarios...' :
            getTabKey() === 'lugares' || getTabKey() === 'mis-lugares' ? 'Buscar lugares...' :
            'Buscar eventos...'
          }
          className="min-w-0 w-full" 
        />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}

/**
 * Plantilla principal — ruta "/" con <Outlet />
 */
export function Plantilla() {
  const { usuario, esAutenticado, manejarSalida } = usarAutenticacion();
  const navigate = useNavigate();
  const location = useLocation();
  const rol = normalizarRol(usuario?.rol);

  const esAdmin = rol === 'ADMIN';
  const esCliente = rol === 'CLIENTE' || rol === 'CLIENT';
  const esUsuario = rol === 'USER' || rol === 'USUARIO';

  const [busquedaGlobal, setbusquedaGlobal] = useState("");

  // Limpiar búsqueda al cambiar de página
  useEffect(() => {
    setbusquedaGlobal("");
  }, [location.pathname]);

  // Mapeo de ruta actual a key de tab
  const getTabKey = () => {
    const pathname = location.pathname;
    const entry = Object.entries(TAB_ROUTES).find(([, path]) => {
      if (path === '/') return pathname === '/';
      return pathname === path || pathname.startsWith(`${path}/`);
    });
    return entry ? entry[0] : 'inicio';
  };

  const handleTabChange = (key) => {
    const route = TAB_ROUTES[key];
    if (route) navigate(route);
  };

  // Dropdown de perfil — acciones
  const handleProfileAction = (key) => {
    switch (key) {
      case 'cerrar-sesion':
        manejarSalida();
        toast.success('Sesión cerrada', { description: 'Has cerrado sesión correctamente.' });
        navigate('/');
        break;
      case 'edit-profile':
      case 'update-password':
        // De momento no hacen nada
        console.log(`Acción seleccionada: ${key}`);
        break;
      default:
        break;
    }
  };

  // Extraer iniciales del usuario (ej. Diego = DI)
  const getInitials = (name) => {
    if (!name) return 'US';
    return name.substring(0, 2).toUpperCase();
  };

  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: House, show: true },
    { id: 'eventos', label: 'Eventos', icon: LayoutHeaderSideContent, show: esAutenticado && esAdmin },
    { id: 'usuarios', label: 'Usuarios', icon: Persons, show: esAutenticado && esAdmin },
    { id: 'lugares', label: 'Lugares', icon: MapPin, show: esAutenticado && esAdmin },
    { id: 'mis-lugares', label: 'Mis Lugares', icon: MapPin, show: esAutenticado && esCliente },
    { id: 'mis-eventos', label: 'Mis Eventos', icon: Calendar, show: esAutenticado && esCliente },
    { id: 'ventas', label: 'Ventas', icon: ChartColumn, show: esAutenticado && esCliente },
    { id: 'mis-boletos', label: 'Boletos', icon: Ticket, show: esAutenticado && esUsuario },
    { id: 'iniciar-sesion', label: 'Ingresar', icon: ArrowRightToSquare, show: !esAutenticado },
    { id: 'registrar', label: 'Registrarse', icon: PencilToSquare, show: !esAutenticado },
  ];

  const renderTabsComponent = () => (
    <Tabs
      selectedKey={getTabKey()}
      onSelectionChange={handleTabChange}
      aria-label="Navegación principal"
    >
      <Tabs.ListContainer>
        <Tabs.List className="max-md:h-14 max-md:rounded-full">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              return (
                <Tabs.Tab key={item.id} id={item.id} className='max-md:h-12 max-md:flex-col'>
                  <Icon className="md:mr-2 max-md:size-5" />
                  <p className="text-sm max-md:text-xs max-md:font-semibold">{item.label}</p>
                  <Tabs.Indicator className='max-md:rounded-full'/>
                </Tabs.Tab>
              );
            })}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );

  return (
    <div className="w-full h-dvh flex flex-col relative">
      {/* Navbar Responsiva - Top */}
      <div className="px-4 md:px-8 py-3 flex items-center justify-between gap-2 md:gap-4">
        
        {/* Sección central: Tabs (Sólo PC) y Búsqueda */}
        <div className="flex-1 flex items-center gap-4">
          <div className="hidden lg:flex">
            {renderTabsComponent()}
          </div>

          <div className="flex min-w-0 w-full ml-auto lg:ml-0">
            <BuscadorNav 
              busquedaGlobal={busquedaGlobal} 
              setbusquedaGlobal={setbusquedaGlobal} 
              getTabKey={getTabKey} 
            />
          </div>
        </div>

        {/* Extremo derecho: Tema y Perfil */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <InterruptorTema />
          {esAutenticado ? (
            <Dropdown>
              <Button
                isIconOnly
                variant="tertiary"
                className="text-sm size-10"
                aria-label="Menú de perfil"
              >
                {getInitials(usuario?.nombreUsuario)}
              </Button>
              <Dropdown.Popover placement="bottom end">
                {/* Header llamativo y centrado del dropdown */}
                <div className="flex items-center justify-center gap-2 px-4 pt-4 pb-2">
                  <div className="shrink-0 size-14 rounded-full flex items-center justify-center bg-default">
                    <p className="font-bold">{getInitials(usuario?.nombreUsuario)}</p>
                  </div>
                  <div className="flex flex-col w-full">
                    <p className="text-base font-semibold truncate">
                      {usuario?.nombreUsuario}
                    </p>
                    <p className="text-sm text-muted truncate">{usuario?.correo}</p>
                  </div>
                </div>

                {/* Menú de opciones */}
                <Dropdown.Menu onAction={handleProfileAction} className="p-2">
                  <Dropdown.Item
                    id="update-profile"
                    textValue="Actualizar perfil"
                  >
                    <PersonPencil />
                    <Label>Actualizar perfil</Label>
                  </Dropdown.Item>
                  <Dropdown.Item
                    id="update-password"
                    textValue="Actualizar contraseña"
                  >
                    <PencilToSquare />
                    <Label>Actualizar contraseña</Label>
                  </Dropdown.Item>
                  <Dropdown.Item
                    id="cerrar-sesion"
                    textValue="Cerrar sesión"
                    variant="danger"
                  >
                    <ArrowRightFromSquare className="text-danger" />
                    <Label>Cerrar sesión</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          ) : (
            <Button
              isIconOnly
              variant="tertiary"
              size="lg"
              onPress={() => navigate("/iniciar-sesion")}
              aria-label="Iniciar sesión"
            >
              <Person />
            </Button>
          )}
        </div>
      </div>

      {/* Content + Footer */}
      <ScrollShadow className="flex-1 flex flex-col custom-scrollbar" size={0}>
        <div className="flex-1">
          <Outlet context={{ busquedaGlobal, setbusquedaGlobal }} />
        </div>
        <footer className="w-full pt-6 lg:pb-6 pb-21 mt-6 pl-8 pr-4 border-t border-divider bg-accent text-accent-foreground">
          <div className="flex flex-col gap-6 w-full">
            {/* Parte superior: Marca y Eslogan */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-col gap-1">
                <h4 className="text-xl font-bold tracking-tight">Ovniticket</h4>
                <p className="text-sm text-accent-foreground/70 max-w-md">
                  Tu pase directo a los mejores eventos. Compra seguro, disfruta
                  al máximo y vive la experiencia.
                </p>
              </div>
            </div>

            <hr className="border-accent-foreground/20" />

            {/* Parte inferior: Copyright y Enlaces (Deshabilitados) */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-accent-foreground/70 text-center sm:text-left">
                © {new Date().getFullYear()} Ovniticket. Todos los derechos
                reservados.
              </p>

              <div className="flex flex-wrap justify-center sm:justify-end gap-6 text-sm">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  title="Página no disponible"
                  className="text-accent-foreground/60 opacity-60 cursor-not-allowed decoration-transparent transition-none"
                >
                  Términos y Condiciones
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  title="Página no disponible"
                  className="text-accent-foreground/60 opacity-60 cursor-not-allowed decoration-transparent transition-none"
                >
                  Aviso de Privacidad
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  title="Página no disponible"
                  className="text-accent-foreground/60 opacity-60 cursor-not-allowed decoration-transparent transition-none"
                >
                  Soporte
                </a>
              </div>
            </div>
          </div>
        </footer>
      </ScrollShadow>

      {/* Mobile Bottom Tabs */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 py-3 flex justify-center w-full">
        {renderTabsComponent()}
      </div>
    </div>
  );
}