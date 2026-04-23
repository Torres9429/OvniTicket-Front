import { useRef, useState, useEffect, useMemo } from "react";
import PropTypes from 'prop-types';
import { useNavigate, useOutletContext } from "react-router-dom";
import { Button, Card, ScrollShadow, Spinner } from "@heroui/react";
import { normalizeRole } from "../utils/rutasAutorizacion";
import {
  ArrowUpRightFromSquare,
  ChevronLeft,
  ChevronRight,
  MapPin,
  LayoutHeaderSideContent,
  Star,
} from "@gravity-ui/icons";
import { getEvents } from "../services/eventos.api";
import { getVenues } from "../services/lugares.api";
import { useAuth } from "../hooks/useAuth";

/**
 * Reusable horizontal card carousel section.
 * desktopCols: how many cards fit on lg+ screens (3 | 4 | 5)
 * loading: whether events are currently loading
 */
function EventCarousel({ title, scrollRef, desktopCols = 4, eventos = [], loading = false }) {
  const navigate = useNavigate();

  // Responsive widths: calc((100vw - total_padding - gaps) / N)
  // total_padding ≈ 4rem (pl-2 pr-1 + px-3 carousel + px-3 ScrollShadow)
  // gap-4 = 1rem between cards
  const cardSizeClasses = {
    3: [
      "min-w-[calc(100vw_-_4rem)]", // mobile  → 1 tarjeta
      "max-w-[calc(100vw_-_4rem)]",
      "md:min-w-[calc(50vw_-_2.5rem)]", // tablet  → 2 tarjetas
      "md:max-w-[calc(50vw_-_2.5rem)]",
      "xl:min-w-[calc(33.33vw_-_2rem)]", // desktop → 3 tarjetas
      "xl:max-w-[calc(33.33vw_-_2rem)]",
    ].join(" "),
    4: [
      "min-w-[calc(100vw_-_4rem)]",
      "max-w-[calc(100vw_-_4rem)]",
      "md:min-w-[calc(50vw_-_2.5rem)]",
      "md:max-w-[calc(50vw_-_2.5rem)]",
      "lg:min-w-[calc(33.33vw_-_2rem)]", // desktop → 3 tarjetas
      "lg:max-w-[calc(33.33vw_-_2rem)]", // desktop → 3 tarjetas
      "xl:min-w-[calc(25vw_-_1.75rem)]", // desktop → 4 tarjetas
      "xl:max-w-[calc(25vw_-_1.75rem)]",
    ].join(" "),
    5: [
      "min-w-[calc(100vw_-_4rem)]",
      "max-w-[calc(100vw_-_4rem)]",
      "md:min-w-[calc(50vw_-_2.5rem)]",
      "md:max-w-[calc(50vw_-_2.5rem)]",
      "xl:min-w-[calc(20vw_-_1.6rem)]", // desktop → 5 tarjetas
      "xl:max-w-[calc(20vw_-_1.6rem)]",
    ].join(" "),
  };

  const cardClass = cardSizeClasses[desktopCols] ?? cardSizeClasses[4];

  let emptyStateContent = null;
  if (loading) {
    emptyStateContent = (
      <div className="flex items-center justify-center w-full py-12">
        <Spinner size="lg" color="current" />
      </div>
    );
  } else if (eventos.length === 0) {
    emptyStateContent = (
      <p className="text-sm text-muted-foreground px-2">No hay eventos disponibles.</p>
    );
  }

  // Scroll by the visible width of the container (= exactly N cards)
  const scroll = (dir) =>
    scrollRef.current?.scrollBy({
      left: dir * (scrollRef.current.clientWidth),
      behavior: "smooth",
    });

  return (
    <div id="eventos-disponibles" className="flex flex-col w-full gap-3 px-3 scroll-mt-24">
      <div className="flex w-full justify-between items-center">
        <h3 className="pr-3">{title}</h3>
        <div className="flex gap-2">
          <Button variant="outline" isIconOnly onPress={() => scroll(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" isIconOnly onPress={() => scroll(1)}>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            onPress={() =>
              document.getElementById("eventos-disponibles")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            Ver todos
            <ArrowUpRightFromSquare />
          </Button>
        </div>
      </div>
      <ScrollShadow
        size={0}
        ref={scrollRef}
        orientation="horizontal"
        className="w-full px-3 snap-x snap-mandatory flex flex-row gap-4 overflow-x-auto no-scrollbar"
      >
        <div className="flex flex-row gap-4">
          {emptyStateContent}
          {eventos.map((ev) => (
            <Card
              key={`event-card-${ev.id_evento}`}
              className={`flex flex-col gap-3 p-2 group bg-surface snap-start shrink-0 ${cardClass}`}
            >
              <div className="relative w-full aspect-video rounded-xl overflow-hidden shrink-0">
                <img
                  alt={ev.nombre || "Event Cover"}
                  src={ev.foto || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              <div className="flex w-full gap-2 px-2 pb-2">
                <div className="flex flex-col gap-2 text-left w-full min-w-0">
                  <div className="flex flex-col gap-0.5">
                    <Card.Description className="text-xs text-accent font-bold uppercase tracking-wider">
                      {ev.fecha_inicio
                        ? new Date(ev.fecha_inicio).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
                        : ""}
                    </Card.Description>
                    <Card.Title className="text-base font-bold truncate">
                      {ev.nombre}
                    </Card.Title>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin />
                    <span className="text-xs truncate">
                      {ev.lugar || ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-end shrink-0">
                  <Button
                    onPress={() => {
                      const id = ev.id_evento ?? ev.id;
                      if (id != null) navigate(`/eventos/${id}`);
                    }}
                  >
                    Ver
                    <ArrowUpRightFromSquare />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollShadow>
    </div>
  );
}
/**
 * Admin quick actions section
 */
function AdminQuickActions() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col w-full gap-3 px-6">
      <h2 className="px-3 flex items-center gap-2">
        <LayoutHeaderSideContent />
        Panel de Administración
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-3">
        <Card className="p-4 bg-surface flex flex-col gap-2">
          <Card.Title className="text-sm font-bold">
            Gestión de Eventos
          </Card.Title>
          <Card.Description className="text-xs text-muted-foreground">
            Crear, editar y administrar todos los eventos
          </Card.Description>
          <Button size="sm" variant="outline" className="mt-auto" onPress={() => navigate("/eventos")}>
            Ir a Eventos
          </Button>
        </Card>
        <Card className="p-4 bg-surface flex flex-col gap-2">
          <Card.Title className="text-sm font-bold">Usuarios</Card.Title>
          <Card.Description className="text-xs text-muted-foreground">
            Gestionar cuentas y roles de usuarios
          </Card.Description>
          <Button size="sm" variant="outline" className="mt-auto" onPress={() => navigate("/usuarios")}>
            Ir a Usuarios
          </Button>
        </Card>
        <Card className="p-4 bg-surface flex flex-col gap-2">
          <Card.Title className="text-sm font-bold">Lugares</Card.Title>
          <Card.Description className="text-xs text-muted-foreground">
            Administrar sedes y espacios de eventos
          </Card.Description>
          <Button size="sm" variant="outline" className="mt-auto" onPress={() => navigate("/lugares")}>
            Ir a Lugares
          </Button>
        </Card>
      </div>
    </div>
  );
}

/**
 * Client summary section
 */
function ClientSummary() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col w-full gap-3 px-6">
      <h2 className="px-3 flex items-center gap-2">
        <Star />
        Mi Panel de Cliente
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-3">
        <Card className="p-4 bg-surface flex flex-col gap-2">
          <Card.Title className="text-sm font-bold">Mis Eventos</Card.Title>
          <Card.Description className="text-xs text-muted-foreground">
            Revisa el estado de tus eventos publicados
          </Card.Description>
          <Button size="sm" variant="outline" className="mt-auto" onPress={() => navigate("/mis-eventos")}>
            Ver mis eventos
          </Button>
        </Card>
        <Card className="p-4 bg-surface flex flex-col gap-2">
          <Card.Title className="text-sm font-bold">Ventas</Card.Title>
          <Card.Description className="text-xs text-muted-foreground">
            Revisa las ventas de tus eventos
          </Card.Description>
          <Button size="sm" variant="outline" className="mt-auto" onPress={() => navigate("/ventas")}>
            Ver ventas
          </Button>
        </Card>
      </div>
    </div>
  );
}

/**
 * Search results grid — shown when the user types something
 * in the navbar search bar. Each result navigates to `/eventos/:id`.
 */
function SearchResults({ query, events }) {
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return events.filter((ev) => {
      const combined = [
        ev.nombre,
        ev.descripcion,
        ev.estatus,
        String(ev.id_evento ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return combined.includes(q);
    });
  }, [query, events]);

  return (
    <div className="flex flex-col w-full gap-3 px-6">
      <h2 className="px-3">
        Resultados para &quot;{query}&quot;{" "}
        <span className="text-sm text-muted-foreground font-normal">
          ({results.length})
        </span>
      </h2>

      {results.length === 0 ? (
        <Card className="p-8 bg-surface text-center mx-3">
          <p className="text-sm text-muted-foreground">
            No encontramos eventos que coincidan con tu búsqueda.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Intenta con otro término o borra la búsqueda para ver todos los eventos.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-3">
          {results.map((ev) => {
            const id = ev.id_evento ?? ev.id;
            return (
              <Card
                key={`resultado-${id}`}
                className="flex flex-col gap-3 p-2 group bg-surface cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => id != null && navigate(`/eventos/${id}`)}
              >
                <div className="relative w-full aspect-video rounded-xl overflow-hidden shrink-0">
                  <img
                    alt={ev.nombre || "Event Cover"}
                    src={
                      ev.foto ||
                      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop"
                    }
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <div className="flex w-full gap-2 px-2 pb-2">
                  <div className="flex flex-col gap-2 text-left w-full min-w-0">
                    <div className="flex flex-col gap-0.5">
                      <Card.Description className="text-xs text-accent font-bold uppercase tracking-wider">
                        {ev.fecha_inicio
                          ? new Date(ev.fecha_inicio).toLocaleString("es-MX", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : ""}
                      </Card.Description>
                      <Card.Title className="text-base font-bold truncate">
                        {ev.nombre}
                      </Card.Title>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin />
                      <span className="text-xs truncate">{ev.estatus || ""}</span>
                    </div>
                  </div>
                  <div className="flex items-end shrink-0">
                    <Button
                      onPress={() => id != null && navigate(`/eventos/${id}`)}
                    >
                      Ver
                      <ArrowUpRightFromSquare />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * PaginaInicio — Index page, role-adaptive.
 *
 * - Public content visible to all (hero, carousels)
 * - Additional sections based on role (admin, client, user)
 */
export default function PaginaInicio() {
  const { user, isAuthenticated } = useAuth();
  const role = normalizeRole(user?.role);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Consume the global search from the navbar (see Plantilla.jsx::NavSearchBar).
  // When it has text, we show a results grid instead of normal content.
  const outletContext = useOutletContext();
  const globalSearch = outletContext?.globalSearch || "";
  const isSearching = globalSearch.trim().length > 0;

  const scrollRef1 = useRef(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getEvents(), getVenues()])
      .then(([eventsData, venuesData]) => {
        const venueMap = Object.fromEntries(
          (venuesData || []).map((v) => [v.id_lugar ?? v.id, v.nombre])
        );
        const enriched = (eventsData || []).map((ev) => ({
          ...ev,
          lugar: venueMap[ev.id_lugar] ?? "",
        }));
        setEvents(enriched);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Hero — hide when the user is searching to focus on results */}
      {!isSearching && (
        <div className="relative flex flex-col w-full items-center justify-center pl-8 pr-4 lg:py-48 md:py-40 sm:py-32 py-24 overflow-hidden">
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2000&auto=format&fit=crop')",
            }}
          />
          <div className="absolute inset-0 z-10 bg-linear-to-t from-background/0 via-foreground/90 dark:via-background/90 to-transparent" />
          <div className="relative z-20 flex flex-col items-center gap-3">
            <h1 className="text-center text-accent-foreground">
              Tu pase directo a los mejores eventos
            </h1>
            <p className="text-center text-sm text-accent-foreground/80">
              Explora una cartelera actualizada con los mejores conciertos,
              festivales, obras de teatro y eventos exclusivos cerca de ti.
              Selecciona tus lugares, paga de forma 100% segura y recibe la
              confirmación de tu compra. Tú solo preocúpate por disfrutar el show.
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col w-full pl-2 pr-1 pt-9 pb-0 gap-6">
        {isSearching ? (
          <SearchResults query={globalSearch} events={events} />
        ) : (
          <>
            {isAuthenticated && role === "ADMIN" && <AdminQuickActions />}
            {isAuthenticated && (role === "CLIENTE" || role === "CLIENT") && (
              <ClientSummary />
            )}
            <EventCarousel
              title="Eventos disponibles"
              scrollRef={scrollRef1}
              desktopCols={4}
              eventos={events}
              loading={loading}
            />
          </>
        )}
      </div>
    </div>
  );
}

EventCarousel.propTypes = {
  title: PropTypes.string.isRequired,
  scrollRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  desktopCols: PropTypes.oneOf([3, 4, 5]),
  eventos: PropTypes.arrayOf(PropTypes.shape({
    id_evento: PropTypes.number,
    id: PropTypes.number,
    nombre: PropTypes.string,
    descripcion: PropTypes.string,
    estatus: PropTypes.string,
  })),
  loading: PropTypes.bool,
};

SearchResults.propTypes = {
  query: PropTypes.string.isRequired,
  events: PropTypes.arrayOf(PropTypes.shape({
    id_evento: PropTypes.number,
    id: PropTypes.number,
    nombre: PropTypes.string,
    descripcion: PropTypes.string,
    estatus: PropTypes.string,
  })).isRequired,
};
