import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import {
  Button,
  Checkbox,
  Chip,
  Input,
  Label,
  Pagination,
  Spinner,
  Table,
  Switch,
  toast,
  Drawer,
  AlertDialog,
} from "@heroui/react";
import {
  Eye,
  Pencil,
  Plus,
  TrashBin,
  ChevronLeft,
  SquareCheck,
  SquareMinus,
  LayoutHeaderColumns,
  ArrowShapeTurnUpLeft,
} from "@gravity-ui/icons";
import ContenedorIcono from "../components/ContenedorIcono";
import { EditorCanvas } from "../components/editorLayout";
import { normalizeLayoutZones } from "../components/editorLayout/layoutModel";
import { getVenue } from "../services/lugares.api";
import {
  getLayoutsByVenue,
  getLayout,
  deactivateLayout,
} from "../services/layouts.api";

const ROWS_PER_PAGE = 10;

const STATUS_COLOR = {
  BORRADOR: "warning",
  PUBLICADO: "accent",
};

const formatReadableDate = (dateString) => {
  if (!dateString) return null;
  const isDatetime = dateString.includes("T");
  const dateWithTime = isDatetime ? dateString : dateString + "T12:00:00";
  const date = new Date(dateWithTime);
  const options = isDatetime
    ? {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    : { day: "numeric", month: "long", year: "numeric" };
  return date.toLocaleDateString("es-MX", options);
};

export default function PaginaLayouts() {
  const navigate = useNavigate();
  const { idLugar } = useParams();

  const [venue, setVenue] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusChangingItem, setStatusChangingItem] = useState(null);
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const outletContext = useOutletContext();
  const globalSearch = outletContext?.globalSearch || "";

  useEffect(() => {
    setCurrentPage(1);
  }, [globalSearch]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const [deletingRecord, setDeletingRecord] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    async function loadVenue() {
      try {
        const data = await getVenue(idLugar);
        setVenue(data);
      } catch {
        toast.danger("Error al cargar el lugar", {
          description: "No se pudo obtener la información del lugar.",
        });
      }
    }
    loadVenue();
  }, [idLugar]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getLayoutsByVenue(idLugar);
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      toast.danger("Error al cargar los datos", {
        description: "No se pudieron obtener los layouts del servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [idLugar]);

  const filteredRecords = useMemo(() => {
    const q = globalSearch.toLowerCase();
    if (!q) return records;
    return records.filter(
      (it) =>
        it.id_layout?.toString().includes(q) ||
        it.version?.toString().includes(q) ||
        it.estatus?.toLowerCase().includes(q),
    );
  }, [records, globalSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / ROWS_PER_PAGE),
  );
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredRecords.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  const handleViewDetail = async (item) => {
    setDetailRecord(null);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const data = await getLayout(item.id_layout);
      setDetailRecord(data);
    } catch {
      toast.danger("Error al obtener los detalles del layout", {
        description:
          "No se pudo consultar la información del layout seleccionado.",
      });
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteConfirm = (item) => {
    setDeletingRecord(item);
    setDeleteConfirmed(false);
    setDeleteModalOpen(true);
  };

  const handleToggleStatus = (item) => {
    setStatusChangingItem(item);
    setStatusConfirmOpen(true);
  };

  const handleConfirmStatus = async () => {
    setSubmittingStatus(true);
    const action = statusChangingItem.estatus;
    try {
      if (action === "PUBLICADO" || action === "BORRADOR") {
        await deactivateLayout(statusChangingItem.id_layout);
      }
      await fetchData();
      setStatusConfirmOpen(false);
      toast.success("Estatus del layout actualizado correctamente", {
        description: `El layout v${statusChangingItem.version} ha sido actualizado.`,
      });
    } catch {
      toast.danger("No se pudo cambiar el estatus del layout", {
        description:
          "Ocurrió un error al intentar actualizar el estatus. Intenta de nuevo.",
      });
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setSubmitting(true);
    try {
      await deactivateLayout(deletingRecord.id_layout);
      toast.success("Layout desactivado", {
        description: `El layout v${deletingRecord.version} fue desactivado correctamente.`,
      });
      setDeleteModalOpen(false);
      setDeletingRecord(null);
      await fetchData();
    } catch {
      toast.danger("Error al desactivar el layout", {
        description:
          "Ocurrió un error al intentar desactivar. Intenta de nuevo.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToEditor = (item) => {
    navigate(`/lugares/${idLugar}/layouts/${item.id_layout}`);
  };

  const handleCreateLayout = () => {
    navigate(`/lugares/${idLugar}/layouts/0`);
  };

  const getPageNumbers = () => {
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const startItem =
    filteredRecords.length === 0
      ? 0
      : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endItem = Math.min(
    currentPage * ROWS_PER_PAGE,
    filteredRecords.length,
  );

  return (
    <div className="flex flex-col gap-6 pl-8 pr-4 pt-3">
      <div className="flex justify-between items-end shrink-0 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2>
              Layouts{venue ? ` de ${venue.nombre}` : ""}
            </h2>
          </div>
          <p className="text-muted text-sm">
            Administra los layouts del lugar (
            {filteredRecords.length} registros)
          </p>
        </div>
        <div className="flex gap-2">
              <Button
                aria-label="Volver a mis lugares"
                variant="ghost"
              onPress={() => navigate("/lugares")}
              >
                <ArrowShapeTurnUpLeft />
                Regresar
              </Button>
          <Button onPress={handleCreateLayout}>
            <Plus />
            Crear layout
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Tabla de layouts">
              <Table.Header>
                <Table.Column isRowHeader>#</Table.Column>
                <Table.Column>Versión</Table.Column>
                <Table.Column>Cuadrícula</Table.Column>
                <Table.Column>Fecha de creación</Table.Column>
                <Table.Column>Estatus</Table.Column>
                <Table.Column className="flex justify-end">
                  Acciones
                </Table.Column>
              </Table.Header>
              <Table.Body
                items={paginatedRecords}
                renderEmptyState={() => (
                  <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                    {loading ? (
                      <Spinner color="current" size="sm" />
                    ) : (
                      "No se encontraron resultados."
                    )}
                  </div>
                )}
              >
                {(item) => (
                  <Table.Row id={item.id_layout}>
                    <Table.Cell>
                      {(currentPage - 1) * ROWS_PER_PAGE +
                        paginatedRecords.indexOf(item) +
                        1}
                    </Table.Cell>
                    <Table.Cell>
                      <span className="font-medium">v{item.version}</span>
                    </Table.Cell>
                    <Table.Cell>
                      {item.grid_rows} × {item.grid_cols}
                    </Table.Cell>
                    <Table.Cell className="text-muted">
                      {formatReadableDate(item.fecha_creacion)}
                    </Table.Cell>
                    <Table.Cell>
                      <Switch
                        isSelected={item.estatus === "PUBLICADO"}
                        onChange={() => handleToggleStatus(item)}
                        size="sm"
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </Table.Cell>
                    <Table.Cell className="flex justify-end">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          isIconOnly
                          size="sm"
                          onPress={() => handleViewDetail(item)}
                          aria-label="Ver detalles"
                        >
                          <Eye />
                        </Button>
                        <Button
                          variant="ghost"
                          isIconOnly
                          size="sm"
                          onPress={() => handleGoToEditor(item)}
                          aria-label="Editar layout"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          isIconOnly
                          size="sm"
                          onPress={() => handleDeleteConfirm(item)}
                          aria-label="Desactivar"
                        >
                          <TrashBin className="text-danger" />
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>

          {totalPages > 1 && (
            <Table.Footer>
              <div className="flex justify-end w-full">
                <Pagination aria-label="Navegación de páginas">
                  <Pagination.Summary>
                    Mostrando {startItem}-{endItem} de{" "}
                    {filteredRecords.length} resultados
                  </Pagination.Summary>
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous
                        isDisabled={currentPage === 1}
                        onPress={() => setCurrentPage((p) => p - 1)}
                      >
                        <Pagination.PreviousIcon />
                        <span>Anterior</span>
                      </Pagination.Previous>
                    </Pagination.Item>
                    {getPageNumbers().map((p, i) =>
                      p === "ellipsis" ? (
                        <Pagination.Item key={`ellipsis-${i}`}>
                          <Pagination.Ellipsis />
                        </Pagination.Item>
                      ) : (
                        <Pagination.Item key={p}>
                          <Pagination.Link
                            isActive={p === currentPage}
                            onPress={() => setCurrentPage(p)}
                          >
                            {p}
                          </Pagination.Link>
                        </Pagination.Item>
                      ),
                    )}
                    <Pagination.Item>
                      <Pagination.Next
                        isDisabled={currentPage === totalPages}
                        onPress={() => setCurrentPage((p) => p + 1)}
                      >
                        <span>Siguiente</span>
                        <Pagination.NextIcon />
                      </Pagination.Next>
                    </Pagination.Item>
                  </Pagination.Content>
                </Pagination>
              </div>
            </Table.Footer>
          )}
        </Table>
      </div>

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de desactivación de layout">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div>
                      <ContenedorIcono size="md" color="danger">
                        <TrashBin className="size-6 text-danger" />
                      </ContenedorIcono>
                    </div>
                    <AlertDialog.Heading className="flex items-center gap-3">
                      <h3>¿Desactivar layout?</h3>
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de desactivar el layout{" "}
                      <span className="font-bold">
                        v{deletingRecord?.version}
                      </span>
                      . Esta acción lo marcará como inactivo. ¿Desea continuar?
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        isSelected={deleteConfirmed}
                        onChange={setDeleteConfirmed}
                      >
                        <Checkbox.Content>
                          <Label htmlFor="confirmacion-desactivacion">
                            Confirmo que deseo desactivar este layout.
                          </Label>
                        </Checkbox.Content>
                        <Checkbox.Control className="border border-border data-[selected=true]:bg-danger">
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox>
                    </div>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="outline" onPress={close}>
                      Cancelar
                    </Button>
                    <Button
                      variant="danger"
                      onPress={handleDelete}
                      isPending={submitting}
                      isDisabled={submitting || !deleteConfirmed}
                    >
                      {({ isPending }) => (
                        <>
                          {isPending ? (
                            <Spinner color="current" size="sm" />
                          ) : (
                            <TrashBin />
                          )}
                          {isPending ? "Desactivando..." : "Sí, desactivar"}
                        </>
                      )}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={statusConfirmOpen}
          onOpenChange={setStatusConfirmOpen}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de cambio de estatus">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div>
                      <ContenedorIcono
                        size="md"
                        color={
                          statusChangingItem?.estatus === "PUBLICADO"
                            ? "default"
                            : "accent"
                        }
                      >
                        {statusChangingItem?.estatus === "PUBLICADO" ? (
                          <SquareMinus className="size-6 text-muted" />
                        ) : (
                          <SquareCheck className="size-6 text-accent" />
                        )}
                      </ContenedorIcono>
                    </div>
                    <AlertDialog.Heading className="flex items-center gap-3">
                      <h3>
                        {statusChangingItem?.estatus === "PUBLICADO"
                          ? "¿Pasar a borrador?"
                          : "¿Publicar layout?"}
                      </h3>
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted">
                      {statusChangingItem?.estatus === "PUBLICADO" ? (
                        <>
                          Está a punto de desactivar el layout{" "}
                          <span className="font-bold">
                            v{statusChangingItem?.version}
                          </span>
                          . ¿Desea continuar?
                        </>
                      ) : (
                        <>
                          Está a punto de cambiar el estatus del layout{" "}
                          <span className="font-bold">
                            v{statusChangingItem?.version}
                          </span>
                          . ¿Desea continuar?
                        </>
                      )}
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button
                      variant="outline"
                      onPress={close}
                      isDisabled={submittingStatus}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant={
                        statusChangingItem?.estatus === "PUBLICADO"
                          ? "tertiary"
                          : "primary"
                      }
                      onPress={handleConfirmStatus}
                      isPending={submittingStatus}
                      isDisabled={submittingStatus}
                    >
                      {({ isPending }) => (
                        <>
                          {isPending ? (
                            <Spinner color="current" size="sm" />
                          ) : statusChangingItem?.estatus === "PUBLICADO" ? (
                            <SquareMinus />
                          ) : (
                            <SquareCheck />
                          )}
                          {isPending
                            ? "Actualizando..."
                            : statusChangingItem?.estatus === "PUBLICADO"
                              ? "Sí, desactivar"
                              : "Sí, continuar"}
                        </>
                      )}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      <Drawer
        isOpen={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        aria-label="Detalles de layout"
      >
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog>
              {({ close }) => (
                <>
                  <Drawer.CloseTrigger />
                  <Drawer.Header>
                    <Drawer.Heading className="flex items-center gap-3">
                      {detailLoading ? (
                        <></>
                      ) : detailRecord ? (
                        <div className="flex flex-col gap-2">
                          <h3>Detalles del Layout</h3>
                          <p className="text-sm text-muted">
                            Información completa del layout v
                            {detailRecord.version}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <h3>Detalles del Layout</h3>
                        </div>
                      )}
                    </Drawer.Heading>
                  </Drawer.Header>
                  <Drawer.Body className="flex flex-col relative no-scrollbar">
                    {detailLoading ? (
                      <div className="flex justify-center items-center py-20 flex-1">
                        <Spinner color="current" size="sm" />
                      </div>
                    ) : (
                      detailRecord && (
                        <div className="flex flex-col gap-5 w-full pt-6 pb-6">
                          <div className="overflow-hidden rounded-xl border border-divider" style={{ height: 280 }}>
                            <EditorCanvas
                              layout={normalizeLayoutZones(detailRecord?.layout_data || {})}
                              selectedItem={null}
                              onSelectSection={() => {}}
                              onSelectElement={() => {}}
                              onMoveSection={() => {}}
                              onResizeSection={() => {}}
                              onMoveElement={() => {}}
                              onClearSelection={() => {}}
                              onRequestSectionEdit={() => {}}
                            />
                          </div>

                          <div className="flex justify-between items-center">
                            <Label className="text-sm font-medium">
                              Estado del layout:
                            </Label>
                            <Chip
                              color={
                                STATUS_COLOR[detailRecord.estatus] ||
                                "default"
                              }
                              variant="soft"
                            >
                              {detailRecord.estatus === "PUBLICADO" ? (
                                <SquareCheck />
                              ) : (
                                <SquareMinus />
                              )}
                              <Chip.Label className="uppercase">
                                {detailRecord.estatus || "no definido"}
                              </Chip.Label>
                            </Chip>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">ID Layout</Label>
                            <span className="text-sm font-medium">
                              {detailRecord.id_layout}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">Versión</Label>
                            <span className="text-sm">
                              {detailRecord.version}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">Cuadrícula</Label>
                            <span className="text-sm">
                              {detailRecord.grid_rows} ×{" "}
                              {detailRecord.grid_cols}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">
                              Fecha de creación
                            </Label>
                            <span className="text-sm">
                              {detailRecord.fecha_creacion
                                ? formatReadableDate(
                                    detailRecord.fecha_creacion,
                                  )
                                : "—"}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">
                              Última actualización
                            </Label>
                            <span className="text-sm">
                              {detailRecord.fecha_actualizacion
                                ? formatReadableDate(
                                    detailRecord.fecha_actualizacion,
                                  )
                                : "—"}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">ID Dueño</Label>
                            <span className="text-sm">
                              {detailRecord.id_dueno || "—"}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </Drawer.Body>
                  <Drawer.Footer>
                    {detailLoading ? (
                      <></>
                    ) : (
                      <>
                        <Button variant="ghost" onPress={close}>
                          Cerrar
                        </Button>
                        <Button
                          onPress={() => {
                            setDetailModalOpen(false);
                            handleGoToEditor(detailRecord);
                          }}
                          fullWidth
                        >
                          <Pencil />
                          Editar layout
                        </Button>
                      </>
                    )}
                  </Drawer.Footer>
                </>
              )}
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
