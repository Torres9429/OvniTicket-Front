import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Button,
  Dropdown,
  Label,
  ScrollShadow,
  SearchField,
  Tabs,
  toast,
  Spinner,
} from "@heroui/react";
import { InterruptorTema } from "./InterruptorTema";
import {
  House,
  Person,
  LayoutHeaderSideContent,
  Persons,
  MapPin,
  Calendar,
  ChartColumn,
  Ticket,
  ArrowRightFromSquare,
  PersonPencil,
  PencilToSquare,
  ArrowRightToSquare,
} from "@gravity-ui/icons";
import { useAuth } from "../hooks/useAuth";
import { normalizeRole } from "../utils/rutasAutorizacion";

/**
 * Tab key to route mapping
 */
const TAB_ROUTES = {
  inicio: "/",
  // Admin roles
  eventos: "/eventos",
  usuarios: "/usuarios",
  lugares: "/lugares",
  "mis-lugares": "/lugares",
  "mis-eventos": "/mis-eventos",
  ventas: "/ventas",
  // User roles
  "mis-boletos": "/mis-boletos",
  "mis-compras": "/mis-compras",
  // Public
  "iniciar-sesion": "/iniciar-sesion",
  registrar: "/registrar",
};

/**
 * Isolated search bar to prevent input lag
 */
function NavSearchBar({ globalSearch, setGlobalSearch, getTabKey }) {
  NavSearchBar.propTypes = {
    globalSearch: PropTypes.string.isRequired,
    setGlobalSearch: PropTypes.func.isRequired,
    getTabKey: PropTypes.func.isRequired,
  };
  const [val, setVal] = useState(globalSearch);

  useEffect(() => {
    queueMicrotask(() => {
      setVal(globalSearch);
    });
  }, [globalSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      setGlobalSearch(val);
    }, 250);
    return () => clearTimeout(t);
  }, [val, setGlobalSearch]);

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
        {val === globalSearch ? (
          <SearchField.SearchIcon />
        ) : (
          <div className="flex h-full items-center justify-center pl-3">
            <Spinner size="sm" color="current" className="opacity-50" />
          </div>
        )}
        <SearchField.Input
          placeholder={(() => {
            const tabKey = getTabKey();
            if (tabKey === "usuarios") return "Buscar usuarios...";
            if (tabKey === "lugares" || tabKey === "mis-lugares") return "Buscar lugares...";
            return "Buscar eventos...";
          })()}
          className="min-w-0 w-full"
        />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}

/**
 * Main layout template — root route "/" with <Outlet />
 */
export function Plantilla() {
  const { user, isAuthenticated, handleLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = normalizeRole(user?.role);

  const isAdminRole = role === "ADMIN";
  const isClientRole = role === "CLIENTE" || role === "CLIENT";
  const isUserRole = role === "USER" || role === "USUARIO";

  const [globalSearch, setGlobalSearch] = useState("");

  // Clear search when navigating to a different page
  useEffect(() => {
    queueMicrotask(() => {
      setGlobalSearch("");
    });
  }, [location.pathname]);

  // Map current route to tab key
  const getTabKey = () => {
    const pathname = location.pathname;
    const entry = Object.entries(TAB_ROUTES).find(([, path]) => {
      if (path === "/") return pathname === "/";
      return pathname === path || pathname.startsWith(`${path}/`);
    });
    return entry ? entry[0] : "inicio";
  };

  const handleTabChange = (key) => {
    const route = TAB_ROUTES[key];
    if (route) navigate(route);
  };

  // Profile dropdown — actions
  const handleProfileAction = (key) => {
    switch (key) {
      case "cerrar-sesion":
        handleLogout();
        toast.success("Sesión cerrada", {
          description: "Has cerrado sesión correctamente.",
        });
        navigate("/");
        break;
      case "edit-profile":
      case "update-password":
        // Not implemented yet
        console.log(`Acción seleccionada: ${key}`);
        break;
      default:
        break;
    }
  };

  // Extract user initials (e.g. Diego = DI)
  const getInitials = (name) => {
    if (!name) return "US";
    return name.substring(0, 2).toUpperCase();
  };

  const navItems = [
    { id: "inicio", label: "Inicio", icon: House, show: true },
    {
      id: "eventos",
      label: "Eventos",
      icon: LayoutHeaderSideContent,
      show: isAuthenticated && isAdminRole,
    },
    {
      id: "usuarios",
      label: "Usuarios",
      icon: Persons,
      show: isAuthenticated && isAdminRole,
    },
    {
      id: "lugares",
      label: "Lugares",
      icon: MapPin,
      show: isAuthenticated && isAdminRole,
    },
    {
      id: "mis-lugares",
      label: "Mis Lugares",
      icon: MapPin,
      show: isAuthenticated && isClientRole,
    },
    {
      id: "mis-eventos",
      label: "Mis Eventos",
      icon: Calendar,
      show: isAuthenticated && isClientRole,
    },
    {
      id: "ventas",
      label: "Ventas",
      icon: ChartColumn,
      show: isAuthenticated && isClientRole,
    },
    {
      id: "mis-boletos",
      label: "Boletos",
      icon: Ticket,
      show: isAuthenticated && isUserRole,
    },
    {
      id: "iniciar-sesion",
      label: "Ingresar",
      icon: ArrowRightToSquare,
      show: !isAuthenticated,
    },
    {
      id: "registrar",
      label: "Registrarse",
      icon: PencilToSquare,
      show: !isAuthenticated,
    },
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
                <Tabs.Tab
                  key={item.id}
                  id={item.id}
                  className="max-md:h-12 max-md:flex-col"
                >
                  <Icon className="md:mr-2 max-md:size-5" />
                  <p className="text-sm max-md:text-xs max-md:font-semibold">
                    {item.label}
                  </p>
                  <Tabs.Indicator className="max-md:rounded-full" />
                </Tabs.Tab>
              );
            })}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );

  return (
    <div className="w-full h-dvh flex flex-col relative">
      {/* Responsive Navbar - Top */}
      <div className="px-4 md:px-8 py-3 flex items-center justify-between gap-2 md:gap-4">
        {/* Center section: Tabs (Desktop only) and Search */}
        <div className="flex-1 flex items-center gap-4">
          <div className="hidden lg:flex">{renderTabsComponent()}</div>

          <div className="flex min-w-0 w-full ml-auto lg:ml-0">
            <NavSearchBar
              globalSearch={globalSearch}
              setGlobalSearch={setGlobalSearch}
              getTabKey={getTabKey}
            />
          </div>
        </div>

        {/* Right side: Theme and Profile */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <InterruptorTema />
          {isAuthenticated ? (
            <Dropdown>
              <Button
                isIconOnly
                variant="tertiary"
                className="text-sm size-10"
                aria-label="Menú de perfil"
              >
                {getInitials(user?.userName)}
              </Button>
              <Dropdown.Popover placement="bottom end">
                {/* Prominent centered dropdown header */}
                <div className="flex items-center justify-center gap-2 px-4 pt-4 pb-2">
                  <div className="shrink-0 size-14 rounded-full flex items-center justify-center bg-default">
                    <p className="font-bold">
                      {getInitials(user?.userName)}
                    </p>
                  </div>
                  <div className="flex flex-col w-full">
                    <p className="text-base font-semibold truncate">
                      {user?.userName}
                    </p>
                    <p className="text-sm text-muted truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* Options menu */}
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
          <Outlet context={{ globalSearch, setGlobalSearch }} />
        </div>
        <footer className="w-full pt-6 lg:pb-6 pb-21 mt-6 pl-8 pr-4 border-t border-divider bg-accent text-accent-foreground">
          <div className="flex flex-col gap-6 w-full">
            {/* Upper section: Branding and Tagline */}
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

            {/* Lower section: Copyright and Links (Disabled) */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-accent-foreground/70 text-center sm:text-left">
                © {new Date().getFullYear()} Ovniticket. Todos los derechos
                reservados.
              </p>

              <div className="flex flex-wrap justify-center sm:justify-end gap-6 text-sm">
                <Button
                  variant="link"
                  isDisabled
                  title="Página no disponible"
                  className="text-accent-foreground/60 opacity-60 cursor-not-allowed"
                >
                  Términos y Condiciones
                </Button>
                <Button
                  variant="link"
                  isDisabled
                  title="Página no disponible"
                  className="text-accent-foreground/60 opacity-60 cursor-not-allowed"
                >
                  Aviso de Privacidad
                </Button>
                <Button
                  variant="link"
                  isDisabled
                  title="Página no disponible"
                  className="text-accent-foreground/60 opacity-60 cursor-not-allowed"
                >
                  Soporte
                </Button>
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
