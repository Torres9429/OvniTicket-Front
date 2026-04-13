import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Button,
  Checkbox,
  Chip,
  Input,
  Label,
  Pagination,
  Spinner,
  Table,
  TextField,
  Switch,
  toast,
  Drawer,
  FieldError,
  AlertDialog,
  Select,
  ListBox,
} from "@heroui/react";
import {
  Eye,
  Pencil,
  Plus,
  TrashBin,
  PencilToSquare,
  ChevronRight,
  SquareCheck,
  SquareMinus,
  SquareExclamation,
  LayoutHeaderColumns,
} from "@gravity-ui/icons";
import ContenedorIcono from "../components/ContenedorIcono";
import {
  getAllVenues,
  getVenue,
  createVenue,
  updateVenue,
  deactivateVenue,
  reactivateVenue,
} from "../services/lugares.api";
import { getLatestLayoutVersion } from "../services/layouts.api";
import { useAuth } from "../hooks/useAuth";

const ROWS_PER_PAGE = 10;

const EMPTY_FORM = {
  nombre: "",
  ciudad: "",
  pais: "",
  direccion: "",
  estatus: "BORRADOR",
};

const STATUS_COLOR = {
  BORRADOR: "warning",
  PUBLICADO: "accent",
  INHABILITADO: "default",
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

export default function PaginaLugares() { // NOSONAR
  const { usuario: user } = useAuth();
  const navigate = useNavigate();
  const currentOwnerId =
    user?.idUsuario || user?.id_usuario || user?.id || null;

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

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [createConfirmed, setCreateConfirmed] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [layoutSuggestionOpen, setLayoutSuggestionOpen] = useState(false);
  const [recentlyCreatedVenue, setRecentlyCreatedVenue] = useState(null);

  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [serverErrors, setServerErrors] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getAllVenues();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      toast.danger("Error al cargar los datos", {
        description: "No se pudieron obtener los lugares del servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRecords = useMemo(() => {
    const q = globalSearch.toLowerCase();
    if (!q) return records;
    return records.filter(
      (it) =>
        it.nombre?.toLowerCase().includes(q) ||
        it.ciudad?.toLowerCase().includes(q) ||
        it.pais?.toLowerCase().includes(q) ||
        it.direccion?.toLowerCase().includes(q) ||
        it.id_lugar?.toString().includes(q),
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

  const handleCreate = () => {
    setFormLoading(true);
    setEditingRecord(null);
    setForm({ ...EMPTY_FORM });
    setAttemptedSubmit(false);
    setServerErrors({});
    setModalOpen(true);

    setTimeout(() => {
      setFormLoading(false);
    }, 400);
  };

  const handleEdit = async (item) => {
    setFormLoading(true);
    setEditingRecord(null);
    setAttemptedSubmit(false);
    setServerErrors({});
    setModalOpen(true);

    try {
      const data = await getVenue(item.id_lugar);
      setForm({
        nombre: data.nombre || "",
        ciudad: data.ciudad || "",
        pais: data.pais || "",
        direccion: data.direccion || "",
        estatus: data.estatus || "BORRADOR",
      });
      setEditingRecord(data);
    } catch {
      toast.danger("No se pudo cargar la información completa del lugar", {
        description:
          "Ocurrió un error al consultar los datos. Intenta de nuevo.",
      });
      setModalOpen(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleViewDetail = async (item) => {
    setDetailRecord(null);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const data = await getVenue(item.id_lugar);
      setDetailRecord(data);
    } catch {
      toast.danger("Error al obtener los detalles del lugar", {
        description:
          "No se pudo consultar la información del lugar seleccionado.",
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
        await deactivateVenue(statusChangingItem.id_lugar);
      } else if (action === "INHABILITADO") {
        await reactivateVenue(statusChangingItem.id_lugar);
      }
      await fetchData();
      setStatusConfirmOpen(false);
      toast.success(
        action === "INHABILITADO"
          ? "Lugar reactivado correctamente"
          : "Lugar inhabilitado correctamente",
        {
          description:
            action === "INHABILITADO"
              ? `El lugar "${statusChangingItem.nombre}" ha sido reactivado.`
              : `El lugar "${statusChangingItem.nombre}" ha sido inhabilitado.`,
        },
      );
    } catch {
      toast.danger("No se pudo cambiar el estatus del lugar", {
        description:
          "Ocurrió un error al intentar actualizar el estatus. Intenta de nuevo.",
      });
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (serverErrors[e.target.name]) {
      setServerErrors((prev) => {
        const updated = { ...prev };
        delete updated[e.target.name];
        return updated;
      });
    }
  };

  const handleSave = async () => {
    setAttemptedSubmit(true);

    if (!form.nombre.trim()) {
      toast.danger("El nombre es obligatorio", {
        description: "Este campo no puede estar vacío.",
      });
      return;
    }
    if (!form.ciudad.trim()) {
      toast.danger("La ciudad es obligatoria", {
        description: "Este campo no puede estar vacío.",
      });
      return;
    }
    if (!form.pais.trim()) {
      toast.danger("El país es obligatorio", {
        description: "Este campo no puede estar vacío.",
      });
      return;
    }
    if (!form.direccion.trim()) {
      toast.danger("La dirección es obligatoria", {
        description: "Este campo no puede estar vacío.",
      });
      return;
    }

    if (!editingRecord) {
      setCreateConfirmed(false);
      setCreateConfirmOpen(true);
      return;
    }
    await executeSubmit();
  };

  const executeSubmit = async () => {
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        nombre: form.nombre,
        ciudad: form.ciudad,
        pais: form.pais,
        direccion: form.direccion,
        estatus: form.estatus || "BORRADOR",
        id_dueno: currentOwnerId,
      };

      if (editingRecord) {
        payload.fecha_actualizacion = now;
        await updateVenue(editingRecord.id_lugar, payload);
        toast.success("Lugar actualizado correctamente", {
          description: "Los cambios se guardaron exitosamente.",
        });
      } else {
        payload.fecha_creacion = now;
        payload.fecha_actualizacion = now;
        const newVenue = await createVenue(payload);
        toast.success("Lugar creado correctamente", {
          description:
            "El nuevo lugar ha sido registrado en el sistema.",
        });
        setRecentlyCreatedVenue(newVenue);
      }

      setModalOpen(false);
      setCreateConfirmOpen(false);
      await fetchData();

      if (!editingRecord) {
        setLayoutSuggestionOpen(true);
      }
    } catch (err) {
      setCreateConfirmOpen(false);
      if (err.response?.data) {
        setServerErrors(err.response.data);
        if (
          typeof err.response.data === "string" ||
          Object.keys(err.response.data).length === 0
        ) {
          toast.danger("Error al guardar: verifique los datos ingresados.", {
            description:
              "El servidor rechazó la solicitud. Revisa los campos.",
          });
        } else {
          toast.danger("Corrige los errores marcados en el formulario", {
            description:
              "Hay campos con errores de validación del servidor.",
          });
        }
      } else {
        toast.danger("Error al guardar el lugar", {
          description:
            "No se pudo conectar con el servidor. Intenta de nuevo.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setSubmitting(true);
    try {
      await deactivateVenue(deletingRecord.id_lugar);
      toast.success("Lugar inhabilitado", {
        description: `El lugar "${deletingRecord.nombre}" fue inhabilitado correctamente.`,
      });
      setDeleteModalOpen(false);
      setDeletingRecord(null);
      await fetchData();
    } catch {
      toast.danger("Error al inhabilitar el lugar", {
        description:
          "Ocurrió un error al intentar inhabilitar. Intenta de nuevo.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToLatestLayout = async (item) => {
    try {
      const data = await getLatestLayoutVersion(item.id_lugar);
      if (data?.id_layout) {
        navigate(`/lugares/${item.id_lugar}/layouts/${data.id_layout}`);
      } else {
        toast.danger("No se encontró un layout para este lugar", {
          description: "El lugar no tiene layouts registrados aún.",
        });
      }
    } catch {
      toast.danger("Error al obtener el último layout", {
        description: "No se pudo consultar el layout. Intenta de nuevo.",
      });
    }
  };

  const handleGoToLayouts = (item) => {
    if (!item?.id_lugar) {
      toast.danger(
        "No se encontró el lugar para ver los layouts",
        { description: "El lugar no tiene un ID válido." },
      );
      return;
    }
    navigate(`/lugares/${item.id_lugar}/layouts`);
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
          <h2>Lugares registrados</h2>
          <p className="text-muted text-sm">
            Administra los lugares del sistema (
            {filteredRecords.length} registros)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onPress={handleCreate}>
            <Plus />
            Registrar
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Tabla de lugares">
              <Table.Header>
                <Table.Column isRowHeader>#</Table.Column>
                <Table.Column>Nombre</Table.Column>
                <Table.Column>Ciudad</Table.Column>
                <Table.Column>País</Table.Column>
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
                  <Table.Row id={item.id_lugar}>
                    <Table.Cell>
                      {(currentPage - 1) * ROWS_PER_PAGE +
                        paginatedRecords.indexOf(item) +
                        1}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.nombre}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {item.direccion}
                        </span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>{item.ciudad}</Table.Cell>
                    <Table.Cell>{item.pais}</Table.Cell>
                    <Table.Cell className="text-muted">
                      {formatReadableDate(item.fecha_creacion)}
                    </Table.Cell>
                    <Table.Cell>
                      <Switch
                        isSelected={item.estatus !== "INHABILITADO"}
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
                          size="sm"
                          isIconOnly
                          onPress={() => handleGoToLayouts(item)}
                          aria-label="Ver layouts"
                        >
                          <LayoutHeaderColumns />
                        </Button>
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
                          onPress={() => handleEdit(item)}
                          aria-label="Editar"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          isIconOnly
                          size="sm"
                          onPress={() => handleDeleteConfirm(item)}
                          aria-label="Inhabilitar"
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

      <Drawer
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        aria-label="Formulario de lugar"
      >
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog>
              {({ close }) => (
                <>
                  <Drawer.CloseTrigger />
                  <Drawer.Header>
                    <Drawer.Heading className="flex items-center gap-3">
                      {formLoading ? (
                        <></>
                      ) : editingRecord ? (
                        <div className="flex flex-col gap-2">
                          <h3>Actualizar lugar</h3>
                          <p className="text-sm text-muted">
                            Actualice la información del lugar y guarde los
                            cambios
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <h3>Registrar lugar</h3>
                          <p className="text-sm text-muted">
                            Registre la información correspondiente del lugar
                            para guardarlo
                          </p>
                        </div>
                      )}
                    </Drawer.Heading>
                  </Drawer.Header>

                  <Drawer.Body className="flex flex-col relative no-scrollbar">
                    {formLoading ? (
                      <div className="flex justify-center items-center py-20 flex-1">
                        <Spinner color="current" size="sm" />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-5 w-full pt-6 pb-6">
                        <TextField
                          name="nombre"
                          aria-label="Nombre del lugar"
                          isRequired
                          fullWidth
                          variant="secondary"
                          isInvalid={
                            (attemptedSubmit && !form.nombre.trim()) ||
                            !!serverErrors.nombre
                          }
                        >
                          <Label>Nombre</Label>
                          <Input
                            placeholder="Nombre del lugar"
                            value={form.nombre}
                            onChange={handleFormChange}
                          />
                          {serverErrors.nombre ? (
                            <FieldError>
                              {serverErrors.nombre[0]}
                            </FieldError>
                          ) : (
                            attemptedSubmit &&
                            !form.nombre.trim() && (
                              <FieldError>
                                El nombre es obligatorio.
                              </FieldError>
                            )
                          )}
                        </TextField>

                          <TextField
                            name="ciudad"
                            aria-label="Ciudad del lugar"
                            isRequired
                            fullWidth
                            variant="secondary"
                            isInvalid={
                              (attemptedSubmit && !form.ciudad.trim()) ||
                              !!serverErrors.ciudad
                            }
                          >
                            <Label>Ciudad</Label>
                            <Input
                              placeholder="Ciudad"
                              value={form.ciudad}
                              onChange={handleFormChange}
                            />
                            {serverErrors.ciudad ? (
                              <FieldError>
                                {serverErrors.ciudad[0]}
                              </FieldError>
                            ) : (
                              attemptedSubmit &&
                              !form.ciudad.trim() && (
                                <FieldError>
                                  La ciudad es obligatoria.
                                </FieldError>
                              )
                            )}
                          </TextField>

                          <TextField
                            name="pais"
                            aria-label="País del lugar"
                            isRequired
                            fullWidth
                            variant="secondary"
                            isInvalid={
                              (attemptedSubmit && !form.pais.trim()) ||
                              !!serverErrors.pais
                            }
                          >
                            <Label>País</Label>
                            <Input
                              placeholder="País"
                              value={form.pais}
                              onChange={handleFormChange}
                            />
                            {serverErrors.pais ? (
                              <FieldError>
                                {serverErrors.pais[0]}
                              </FieldError>
                            ) : (
                              attemptedSubmit &&
                              !form.pais.trim() && (
                                <FieldError>
                                  El país es obligatorio.
                                </FieldError>
                              )
                            )}
                          </TextField>

                        <TextField
                          name="direccion"
                          aria-label="Dirección del lugar"
                          isRequired
                          fullWidth
                          variant="secondary"
                          isInvalid={
                            (attemptedSubmit && !form.direccion.trim()) ||
                            !!serverErrors.direccion
                          }
                        >
                          <Label>Dirección</Label>
                          <Input
                            placeholder="Dirección completa"
                            value={form.direccion}
                            onChange={handleFormChange}
                          />
                          {serverErrors.direccion ? (
                            <FieldError>
                              {serverErrors.direccion[0]}
                            </FieldError>
                          ) : (
                            attemptedSubmit &&
                            !form.direccion.trim() && (
                              <FieldError>
                                La dirección es obligatoria.
                              </FieldError>
                            )
                          )}
                        </TextField>

                        <Select
                          isRequired
                          className="w-full"
                          name="estatus"
                          aria-label="Estatus del lugar"
                          selectedKey={form.estatus}
                          onSelectionChange={(key) =>
                            setForm({ ...form, estatus: key })
                          }
                          variant="secondary"
                        >
                          <Label>Estatus</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item id="BORRADOR" textValue="Borrador">
                                Borrador
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item id="PUBLICADO" textValue="Publicado">
                                Publicado
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item
                                id="INHABILITADO"
                                textValue="Inhabilitado"
                              >
                                Inhabilitado
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            </ListBox>
                          </Select.Popover>
                          <FieldError />
                        </Select>

                        {editingRecord && (
                          <>
                          <div className="flex justify-between">
                            <Label className="text-sm font-medium">
                              Estado del lugar:
                            </Label>

                            <Chip
                              color={
                                STATUS_COLOR[editingRecord.estatus] ||
                                "default"
                              }
                              variant="soft"
                            >
                              {editingRecord.estatus === "INHABILITADO" ? (
                                <SquareMinus />
                              ) : (
                                <SquareCheck />
                              )}
                              <Chip.Label className="uppercase">
                                {editingRecord.estatus || "no definido"}
                              </Chip.Label>
                            </Chip>
                          </div>
                          <div className="flex flex-col items-end gap-5">

                            <Button
                              variant="outline"
                              onPress={() => {
                                setModalOpen(false);
                                handleGoToLatestLayout(editingRecord);
                              }}
                            >
                              <Pencil />
                              Editar última versión de layout
                              <ChevronRight/>
                            </Button>
                            <Button
                              variant="outline"
                              onPress={() => {
                                setModalOpen(false);
                                handleGoToLayouts(editingRecord);
                              }}
                            >
                              <LayoutHeaderColumns />
                              Ver todos los layouts
                              <ChevronRight/>
                            </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </Drawer.Body>

                  <Drawer.Footer className="flex flex-col gap-2">
                    {formLoading ? (
                      <></>
                    ) : (
                      <>
                        <div className="flex gap-2 w-full">
                          <Button variant="ghost" onPress={close}>
                            Cancelar
                          </Button>
                          <Button
                            color="primary"
                            onPress={handleSave}
                            isPending={submitting}
                            isDisabled={submitting}
                            className="font-semibold"
                            fullWidth
                          >
                            {({ isPending }) => (
                              <>
                                {isPending ? (
                                  <Spinner color="current" size="sm" />
                                ) : editingRecord ? (
                                  <PencilToSquare />
                                ) : null}
                                {isPending
                                  ? "Guardando..."
                                  : editingRecord
                                    ? "Actualizar"
                                    : "Continuar"}
                                {!editingRecord && <ChevronRight />}
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </Drawer.Footer>
                </>
              )}
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={createConfirmOpen}
          onOpenChange={setCreateConfirmOpen}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de registro de lugar">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div>
                      <ContenedorIcono size="md">
                        <Plus className="size-6 text-accent" />
                      </ContenedorIcono>
                    </div>
                    <AlertDialog.Heading className="flex items-center gap-3">
                      <h3>¿Registrar lugar?</h3>
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de registrar un nuevo lugar. ¿Desea
                      continuar?
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="confirmacion-creacion"
                        aria-label="Confirmar veracidad de datos"
                        isSelected={createConfirmed}
                        onChange={setCreateConfirmed}
                      >
                        <Checkbox.Content>
                          <Label htmlFor="confirmacion-creacion">
                            Confirmo que los datos son correctos y el lugar
                            será registrado en el sistema.
                          </Label>
                        </Checkbox.Content>
                        <Checkbox.Control className="border border-border">
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
                      color="primary"
                      onPress={executeSubmit}
                      isPending={submitting}
                      isDisabled={submitting || !createConfirmed}
                    >
                      {({ isPending }) => (
                        <>
                          {isPending ? (
                            <Spinner color="current" size="sm" />
                          ) : (
                            <Plus />
                          )}
                          {isPending ? "Registrando..." : "Sí, registrar"}
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
          isOpen={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de inhabilitación de lugar">
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
                      <h3>¿Inhabilitar lugar?</h3>
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de inhabilitar el lugar{" "}
                      <span className="font-bold">
                        &ldquo;{deletingRecord?.nombre}&rdquo;
                      </span>
                      . Esta acción cambiará su estatus a inhabilitado. ¿Desea
                      continuar?
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        isSelected={deleteConfirmed}
                        onChange={setDeleteConfirmed}
                      >
                        <Checkbox.Content>
                          <Label htmlFor="confirmacion-inhabilitacion">
                            Confirmo que deseo inhabilitar este lugar del
                            sistema.
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
                          {isPending ? "Inhabilitando..." : "Sí, inhabilitar"}
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
                          statusChangingItem?.estatus === "INHABILITADO"
                            ? "accent"
                            : "default"
                        }
                      >
                        {statusChangingItem?.estatus === "INHABILITADO" ? (
                          <SquareCheck className="size-6 text-accent" />
                        ) : (
                          <SquareMinus className="size-6 text-muted" />
                        )}
                      </ContenedorIcono>
                    </div>
                    <AlertDialog.Heading className="flex items-center gap-3">
                      <h3>
                        {statusChangingItem?.estatus === "INHABILITADO"
                          ? "¿Reactivar lugar?"
                          : "¿Inhabilitar lugar?"}
                      </h3>
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted">
                      {statusChangingItem?.estatus === "INHABILITADO" ? (
                        <>
                          Está a punto de reactivar el lugar{" "}
                          <span className="font-bold">
                            &ldquo;{statusChangingItem?.nombre}&rdquo;
                          </span>
                          . El lugar volverá a estar disponible. ¿Desea
                          continuar?
                        </>
                      ) : (
                        <>
                          Está a punto de inhabilitar el lugar{" "}
                          <span className="font-bold">
                            &ldquo;{statusChangingItem?.nombre}&rdquo;
                          </span>
                          . El lugar dejará de estar disponible. ¿Desea
                          continuar?
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
                        statusChangingItem?.estatus === "INHABILITADO"
                          ? "primary"
                          : "tertiary"
                      }
                      onPress={handleConfirmStatus}
                      isPending={submittingStatus}
                      isDisabled={submittingStatus}
                    >
                      {({ isPending }) => (
                        <>
                          {isPending ? (
                            <Spinner color="current" size="sm" />
                          ) : statusChangingItem?.estatus ===
                            "INHABILITADO" ? (
                            <SquareCheck />
                          ) : (
                            <SquareMinus />
                          )}
                          {isPending
                            ? "Actualizando..."
                            : statusChangingItem?.estatus === "INHABILITADO"
                              ? "Sí, reactivar"
                              : "Sí, inhabilitar"}
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
          isOpen={layoutSuggestionOpen}
          onOpenChange={setLayoutSuggestionOpen}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Sugerencia de creación de layout">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div>
                      <ContenedorIcono size="md">
                        <LayoutHeaderColumns className="size-6 text-accent" />
                      </ContenedorIcono>
                    </div>
                    <AlertDialog.Heading className="flex items-center gap-3">
                      <h3>¿Crear un layout?</h3>
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted">
                      El lugar{" "}
                      <span className="font-bold">
                        &ldquo;{recentlyCreatedVenue?.nombre}&rdquo;
                      </span>{" "}
                      fue registrado exitosamente. ¿Desea crear un layout para
                      este lugar ahora?
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="outline" onPress={close}>
                      Más tarde
                    </Button>
                    <Button
                      color="primary"
                      onPress={() => {
                        setLayoutSuggestionOpen(false);
                        if (recentlyCreatedVenue?.id_lugar) {
                          navigate(
                            `/lugares/${recentlyCreatedVenue.id_lugar}/layouts/0`,
                          );
                        }
                      }}
                    >
                      <Plus />
                      Crear layout
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
        aria-label="Detalles de lugar"
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
                          <h3>Detalles del Lugar</h3>
                          <p className="text-sm text-muted">
                            Información completa del lugar registrado
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <h3>Detalles del Lugar</h3>
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
                          <div className="flex justify-between items-center">
                            <Label className="text-sm font-medium">
                              Estado del lugar:
                            </Label>
                            <Chip
                              color={
                                STATUS_COLOR[detailRecord.estatus] ||
                                "default"
                              }
                              variant="soft"
                            >
                              {detailRecord.estatus === "INHABILITADO" ? (
                                <SquareMinus />
                              ) : (
                                <SquareCheck />
                              )}
                              <Chip.Label className="uppercase">
                                {detailRecord.estatus || "no definido"}
                              </Chip.Label>
                            </Chip>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">Nombre</Label>
                            <span className="text-sm font-medium">
                              {detailRecord.nombre}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">Ciudad</Label>
                            <span className="text-sm">
                              {detailRecord.ciudad}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">País</Label>
                            <span className="text-sm">
                              {detailRecord.pais}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">Dirección</Label>
                            <span className="text-sm">
                              {detailRecord.direccion}
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
                          <div className="flex flex-col items-end gap-5">
                          <Button
                            variant="outline"
                            onPress={() => {
                              setDetailModalOpen(false);
                              handleGoToLatestLayout(detailRecord);
                            }}
                          >
                            <Pencil />
                            Editar última versión de layout
                            <ChevronRight/>
                          </Button>
                          <Button
                            variant="outline"
                            onPress={() => {
                              setDetailModalOpen(false);
                              handleGoToLayouts(detailRecord);
                            }}
                          >
                            <LayoutHeaderColumns />
                            Ver todos los layouts
                            <ChevronRight/>
                          </Button>
                          </div>
                        </div>
                      )
                    )}
                  </Drawer.Body>
                  <Drawer.Footer className="flex flex-col gap-2">
                    {detailLoading ? (
                      <></>
                    ) : (
                      <>
                        <div className="flex gap-2 w-full">
                          <Button variant="ghost" onPress={close}>
                            Cerrar
                          </Button>
                          <Button
                            onPress={() => {
                              setDetailModalOpen(false);
                              handleEdit(detailRecord);
                            }}
                            fullWidth
                          >
                            <PencilToSquare />
                            Actualizar detalles
                          </Button>
                        </div>
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
