import { useRef } from "react";
import { Button, Card, ScrollShadow, SearchField, Skeleton } from "@heroui/react";
import { normalizarRol } from "../utils/rutasAutorizacion";
import {
  ArrowUpRightFromSquare,
  ChevronLeft,
  ChevronRight,
  MapPin,
  LayoutHeaderSideContent,
  Star,
} from "@gravity-ui/icons";
import { usarAutenticacion } from "../hooks/usarAutenticacion";

/**
 * Sección de cards tipo carrusel horizontal reutilizable
 */
/**
 * Sección de cards tipo carrusel horizontal reutilizable
 * desktopCols: cuántas tarjetas caben en pantallas lg+ (3 | 4 | 5)
 */
function EventCarousel({ title, scrollRef, desktopCols = 4 }) {
  // Anchos responsivos: calc((100vw - padding_total - gaps) / N)
  // padding_total ≈ 4rem (pl-2 pr-1 + px-3 del carrusel + px-3 del ScrollShadow)
  // gap-4 = 1rem entre tarjetas
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

  // Scroll por el ancho visible del contenedor (= exactamente N tarjetas)
  const scroll = (dir) =>
    scrollRef.current?.scrollBy({
      left: dir * (scrollRef.current.clientWidth),
      behavior: "smooth",
    });

  return (
    <div className="flex flex-col w-full gap-3 px-3">
      <div className="flex w-full justify-between items-center">
        <h3 className="pr-3">{title}</h3>
        <div className="flex gap-2">
          <Button variant="outline" isIconOnly onPress={() => scroll(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" isIconOnly onPress={() => scroll(1)}>
            <ChevronRight />
          </Button>
          <Button variant="outline">
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
          {Array.from({ length: 10 }).map((_, idx) => (
            <Card
              key={`event-card-${idx}`}
              className={`flex flex-col gap-3 p-2 group bg-surface snap-start shrink-0 ${cardClass}`}
            >
              <div className="relative w-full aspect-video rounded-xl overflow-hidden shrink-0">
                <img
                  alt="Event Cover"
                  src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute top-2 right-2 bg-background/70 backdrop-blur-md text-foreground px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">
                  $1,200 MXN
                </div>
              </div>
              <div className="flex w-full gap-2 px-2 pb-2">
                <div className="flex flex-col gap-2 text-left w-full min-w-0">
                  <div className="flex flex-col gap-0.5">
                    <Card.Description className="text-xs text-accent font-bold uppercase tracking-wider">
                      3 de abril 2026 - 8:00 PM
                    </Card.Description>
                    <Card.Title className="text-base font-bold truncate">
                      Nombre del evento
                    </Card.Title>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin />
                    <span className="text-xs truncate">
                      Auditorio Nacional, CDMX
                    </span>
                  </div>
                </div>
                <div className="flex items-end shrink-0">
                  <Button>
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
 * Sección de acciones rápidas para admin
 */
function AdminQuickActions() {
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
          <Button size="sm" variant="outline" className="mt-auto">
            Ir a Eventos
          </Button>
        </Card>
        <Card className="p-4 bg-surface flex flex-col gap-2">
          <Card.Title className="text-sm font-bold">Usuarios</Card.Title>
          <Card.Description className="text-xs text-muted-foreground">
            Gestionar cuentas y roles de usuarios
          </Card.Description>
          <Button size="sm" variant="outline" className="mt-auto">
            Ir a Usuarios
          </Button>
        </Card>
        <Card className="p-4 bg-surface flex flex-col gap-2">
          <Card.Title className="text-sm font-bold">Lugares</Card.Title>
          <Card.Description className="text-xs text-muted-foreground">
            Administrar sedes y espacios de eventos
          </Card.Description>
          <Button size="sm" variant="outline" className="mt-auto">
            Ir a Lugares
          </Button>
        </Card>
      </div>
    </div>
  );
}

/**
 * Sección de resumen para clientes
 */
function ClienteResumen() {
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
          <Button size="sm" variant="outline" className="mt-auto">
            Ver mis eventos
          </Button>
        </Card>
        <Card className="p-4 bg-surface flex flex-col gap-2">
          <Card.Title className="text-sm font-bold">Ventas</Card.Title>
          <Card.Description className="text-xs text-muted-foreground">
            Revisa las ventas de tus eventos
          </Card.Description>
          <Button size="sm" variant="outline" className="mt-auto">
            Ver ventas
          </Button>
        </Card>
      </div>
    </div>
  );
}

/**
 * PaginaInicio — Página index adaptable por rol
 *
 * - Contenido público visible para todos (hero, carruseles)
 * - Secciones adicionales según rol (admin, cliente, usuario)
 */
export default function PaginaInicio() {
  const { usuario, esAutenticado } = usarAutenticacion();
  const rol = normalizarRol(usuario?.rol);

  const scrollRef1 = useRef(null);
  const scrollRef2 = useRef(null);
  const scrollRef3 = useRef(null);
  const scrollRef4 = useRef(null);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="relative flex flex-col w-full items-center justify-center pl-8 pr-4 lg:py-48 md:py-40 sm:py-32 py-24 overflow-hidden">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            // Cambié el w=600 a w=2000 en la URL para que no se vea pixelada en pantallas grandes
            backgroundImage:
              "url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2000&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 z-10 bg-linear-to-t from-background/0 via-foreground/90 dark:via-background/90 to-transparent" />
        {/* Hero Section — siempre visible */}
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

      {/* Contenido principal */}
      <div className="flex flex-col w-full pl-2 pr-1 pt-9 pb-0 gap-6">
        {esAutenticado && rol === "ADMIN" && <AdminQuickActions />}

        {/* Secciones de cliente — solo CLIENTE */}
        {esAutenticado && (rol === "CLIENTE" || rol === "CLIENT") && (
          <ClienteResumen />
        )}

        {/* Carruseles públicos con anchos dinámicos */}
        <EventCarousel
          title="Eventos destacados"
          scrollRef={scrollRef1}
          desktopCols={4}
        />
        <EventCarousel
          title="Próximos eventos"
          scrollRef={scrollRef2}
          desktopCols={3}
        />
        <EventCarousel
          title="Los más vendidos"
          scrollRef={scrollRef3}
          desktopCols={5}
        />
        <EventCarousel
          title="Eventos destacados"
          scrollRef={scrollRef4}
          desktopCols={4}
        />
      </div>
    </div>
  );
}
