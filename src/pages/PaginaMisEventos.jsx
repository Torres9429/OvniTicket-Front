import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Autocomplete,
  Button,
  Checkbox,
  Chip,
  Input,
  Label,
  ListBox,
  Pagination,
  SearchField,
  Spinner,
  Table,
  TextField,
  toast,
  Drawer,
  FieldError,
  AlertDialog,
} from '@heroui/react'
import {
  Pencil,
  Plus,
  TrashBin,
  PencilToSquare,
  ChevronRight,
  ArrowRotateLeft,
} from '@gravity-ui/icons'
import ContenedorIcono from '../components/ContenedorIcono'
import ImageUploader from '../components/ImageUploader'
import {
  getAllEvents,
  getEvent,
  createEvent,
  updateEvent,
  deactivateEvent,
  reactivateEvent,
  getEventsByUser,
} from '../services/eventos.api'
import { getVenues } from '../services/lugares.api'
import { getLayout, getAllLayouts } from '../services/layouts.api'
import { useAuth } from '../hooks/useAuth'

/* ─── constantes ─── */
const ROWS_PER_PAGE = 10

const EMPTY_FORM = {
  nombre: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
  tiempo_espera: 0,
  foto: '',
  id_lugar: '',
  id_version: '',
  estatus: 'BORRADOR',
}

const STATUS_OPTIONS = ['BORRADOR', 'PUBLICADO', 'CANCELADO', 'FINALIZADO']

const range = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i)

/* ─── componente principal ─── */
export default function PaginaMisEventos() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentClientId = user?.userId || null

  /* ─── datos ─── */
  const [records, setRecords] = useState([])
  const [venues, setVenues] = useState([])
  const [layouts, setLayouts] = useState([])
  const [loading, setLoading] = useState(true)

  /* ─── paginación ─── */
  const [currentPage, setCurrentPage] = useState(1)

  /* ─── global layout context ─── */
  const outletContext = useOutletContext()
  const globalSearch = outletContext?.globalSearch || ''

  useEffect(() => { setCurrentPage(1) }, [globalSearch])

  /* ─── modales ─── */
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false)

  /* ─── edición / eliminación ─── */
  const [editingRecord, setEditingRecord] = useState(null)
  const [deletingRecord, setDeletingRecord] = useState(null)

  /* ─── formulario ─── */
  const [submitting, setSubmitting] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [serverErrors, setServerErrors] = useState({})
  const [createConfirmed, setCreateConfirmed] = useState(false)
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)

  /* ─── fetch ─── */
  const fetchData = async () => {
    setLoading(true)
    try {
      /* Si es admin, obtiene todos los eventos; si no, solo los del usuario/organizador actual */
      const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'administrador'
      const eventsData = isAdmin
        ? await getAllEvents()
        : await getEventsByUser(currentClientId || 0).catch(() => [])

      const [venuesData, layoutsData] = await Promise.all([
        getVenues(),
        getAllLayouts().catch(() => []),
      ])
      setRecords(Array.isArray(eventsData) ? eventsData : [])
      setVenues(Array.isArray(venuesData) ? venuesData : [])
      setLayouts(Array.isArray(layoutsData) ? layoutsData : [])
    } catch (err) {
      console.error('Error cargando datos:', err)
      toast.danger('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  /* Layouts filtrados por el lugar seleccionado en el formulario.
     Devuelve sólo los layouts PUBLICADO asociados al `form.id_lugar`. */
  const availableLayouts = useMemo(() => {
    if (!form.id_lugar) return []
    return layouts
      .filter((l) => Number(l.id_lugar) === Number(form.id_lugar))
      .filter((l) => !l.estatus || l.estatus === 'PUBLICADO')
      .sort((a, b) => Number(b.version || 0) - Number(a.version || 0))
  }, [layouts, form.id_lugar])

  useEffect(() => { 
    if (user?.userId) {
      fetchData()
    }
  }, [user?.userId])

  /* ─── helper nombre lugar ─── */
  const getVenueName = (id) => {
    const venue = venues.find((l) => Number(l.id_lugar) === Number(id))
    return venue ? venue.nombre : `ID: ${id}`
  }

  const getEventVenueId = (event) => {
    const candidate =
      event?.id_lugar ??
      event?.lugar?.id_lugar ??
      event?.lugar ??
      event?.idLugar ??
      null

    const id = Number(candidate)
    return Number.isFinite(id) && id > 0 ? id : null
  }

  const getEventVenueName = (event) => {
    if (event?.nombre_lugar) return event.nombre_lugar
    if (event?.lugar_nombre) return event.lugar_nombre
    if (event?.lugar?.nombre) return event.lugar.nombre

    const venueId = getEventVenueId(event)
    return venueId ? getVenueName(venueId) : 'Sin lugar'
  }

  /* ─── datos filtrados y paginados ─── */
  const filteredRecords = useMemo(() => {
    const q = globalSearch.toLowerCase()
    if (!q) return records
    return records.filter((it) =>
      it.nombre?.toLowerCase().includes(q) ||
      it.descripcion?.toLowerCase().includes(q) ||
      it.id_evento?.toString().includes(q)
    )
  }, [records, globalSearch])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ROWS_PER_PAGE))
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return filteredRecords.slice(start, start + ROWS_PER_PAGE)
  }, [filteredRecords, currentPage])

  /* ─── abrir modal crear ─── */
  const handleCreate = () => {
    setFormLoading(true)
    setEditingRecord(null)
    setForm({ ...EMPTY_FORM })
    setAttemptedSubmit(false)
    setServerErrors({})
    setModalOpen(true)
    setTimeout(() => setFormLoading(false), 400)
  }

  /* ─── abrir modal editar ─── */
  const handleEdit = async (item) => {
    setFormLoading(true)
    setEditingRecord(null)
    setAttemptedSubmit(false)
    setServerErrors({})
    setModalOpen(true)
    try {
      const data = await getEvent(item.id_evento)
      setForm({
        nombre: data.nombre || '',
        descripcion: data.descripcion || '',
        fecha_inicio: data.fecha_inicio ? data.fecha_inicio.slice(0, 16) : '',
        fecha_fin: data.fecha_fin ? data.fecha_fin.slice(0, 16) : '',
        tiempo_espera: data.tiempo_espera || 0,
        foto: data.foto || '',
        id_lugar: data.id_lugar ? String(data.id_lugar) : '',
        id_version: data.id_version ? String(data.id_version) : '',
        estatus: data.estatus || 'BORRADOR',
      })
      setEditingRecord(data)
    } catch (err) {
      console.error('Error al consultar datos:', err)
      toast.danger('No se pudo cargar la información del evento')
      setModalOpen(false)
    } finally {
      setFormLoading(false)
    }
  }

  /* ─── abrir confirmación de eliminar ─── */
  const handleDeleteConfirm = (item) => {
    setDeletingRecord(item)
    setDeleteConfirmed(false)
    setDeleteModalOpen(true)
  }

  /* ─── cambio de campo ─── */
  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (serverErrors[e.target.name]) {
      setServerErrors((prev) => {
        const updated = { ...prev }
        delete updated[e.target.name]
        return updated
      })
    }
  }

  const getFieldError = (fieldName) => {
    if (serverErrors[fieldName]) return serverErrors[fieldName][0];
    if (!attemptedSubmit) return null;

    switch (fieldName) {
      case 'nombre': return form.nombre.trim() ? null : 'El nombre es obligatorio.';
      case 'id_lugar': return form.id_lugar ? null : 'Selecciona un lugar.';
      case 'fecha_inicio': return form.fecha_inicio ? null : 'La fecha de inicio es obligatoria.';
      case 'fecha_fin': return form.fecha_fin ? null : 'La fecha de fin es obligatoria.';
      case 'id_version': return form.id_version ? null : 'Selecciona un layout.';
      default: return null;
    }
  };

  /* ─── guardar (crear o actualizar) ─── */
  const handleSave = async () => {
    setAttemptedSubmit(true)
    if (!form.nombre.trim()) { toast.danger('El nombre es obligatorio'); return }
    if (!form.id_lugar) { toast.danger('Selecciona un lugar'); return }
    if (!form.fecha_inicio) { toast.danger('La fecha de inicio es obligatoria'); return }
    if (!form.fecha_fin) { toast.danger('La fecha de fin es obligatoria'); return }

    if (!editingRecord) {
      setCreateConfirmed(false)
      setCreateConfirmOpen(true)
      return
    }
    await executeSubmit()
  }

  const executeSubmit = async () => {
    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        tiempo_espera: Number(form.tiempo_espera),
        foto: form.foto,
        id_lugar: Number(form.id_lugar),
        // id_version contains the id_layout (PK) of the chosen layout in the
        // dropdown, which is already filtered by venue.
        id_version: Number(form.id_version),
        estatus: form.estatus || 'BORRADOR',
      }

      if (editingRecord) {
        await updateEvent(editingRecord.id_evento, payload)
        toast.success('Evento actualizado correctamente')
      } else {
        payload.fecha_creacion = now
        payload.fecha_actualizacion = now
        await createEvent(payload)
        toast.success('Evento creado correctamente')
      }

      setModalOpen(false)
      setCreateConfirmOpen(false)
      await fetchData()
    } catch (err) {
      console.error('Error guardando:', err)
      setCreateConfirmOpen(false)
      if (err.response?.data) {
        setServerErrors(err.response.data)
        toast.danger('Corrige los errores marcados en el formulario')
      } else {
        toast.danger('Error al guardar el evento')
      }
    } finally {
      setSubmitting(false)
    }
  }

  /* ─── desactivar ─── */
  const handleDelete = async () => {
    if (!deletingRecord) return
    setSubmitting(true)
    try {
      await deactivateEvent(deletingRecord.id_evento)
      toast.success('Evento desactivado correctamente')
      setDeleteModalOpen(false)
      setDeletingRecord(null)
      await fetchData()
    } catch (err) {
      console.error('Error desactivando:', err)
      toast.danger('Error al desactivar el evento')
    } finally {
      setSubmitting(false)
    }
  }

  /* ─── reactivar ─── */
  const handleReactivate = async (item) => {
    try {
      await reactivateEvent(item.id_evento)
      toast.success('Evento reactivado correctamente')
      await fetchData()
    } catch {
      toast.danger('Error al reactivar el evento')
    }
  }

  const handleGoToSeatSelection = async (item) => {
    if (!item?.id_evento) {
      toast.danger('No se encontró el ID del evento para abrir el mapa de asientos')
      return
    }

    let sourceEvent = item
    try {
      const detail = await getEvent(item.id_evento)
      if (detail) sourceEvent = detail
    } catch {
      // If detail fails, we continue with the row data.
    }

    let layoutId = Number(
      sourceEvent?.id_layout ??
      sourceEvent?.layout?.id_layout ??
      0
    ) || null

    const venueId = getEventVenueId(sourceEvent)
    const versionId = Number(
      sourceEvent?.id_version ??
      sourceEvent?.version_layout ??
      sourceEvent?.layout_version ??
      0
    ) || null

    // If the event doesn't have a usable id_layout, we try to resolve it by venue and version.
    if (!layoutId && venueId) {
      try {
        const layouts = await getAllLayouts()
        const venueLayouts = (layouts || []).filter(
          (l) => Number(l.id_lugar) === Number(venueId)
        )

        const layoutByVersion = versionId
          ? venueLayouts.find((l) => Number(l.id_version) === Number(versionId))
          : null

        const chosenLayout =
          layoutByVersion ||
          venueLayouts
            .slice()
            .sort((a, b) => Number(b.id_layout || 0) - Number(a.id_layout || 0))[0]

        layoutId = chosenLayout?.id_layout || null
      } catch {
        // Continue with final validation and error message to the user.
      }
    }

    if (!layoutId) {
      toast.danger('El evento no tiene layout asociado para mostrar el mapa de asientos')
      return
    }

    try {
      await getLayout(layoutId)
      navigate(`/eventos/${item.id_evento}/layout/${layoutId}/asientos`)
    } catch {
      toast.danger('No se pudo cargar el layout del evento. Verifica la configuración del lugar')
    }
  }

  /* ─── paginación ─── */
  const getPageNumbers = () => {
    if (totalPages <= 5) return range(1, totalPages)
    if (currentPage <= 3) return [1, 2, 3, 4, 'ellipsis', totalPages]
    if (currentPage >= totalPages - 2) return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages]
  }

  const startItem = filteredRecords.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ROWS_PER_PAGE, filteredRecords.length)

  /* ─── render ─── */
  return (
    <div className="flex flex-col gap-6 pl-8 pr-4 pt-3">
      {/* ─── Header ─── */}
      <div className="flex justify-between items-end shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Eventos</h2>
          <p className="text-muted text-sm">
            Administra los eventos del sistema ({filteredRecords.length} registros)
          </p>
        </div>
        <Button onPress={handleCreate} size="lg" className="font-semibold shadow-lg hover:shadow-xl transition-shadow">
          <Plus />
          Registrar
        </Button>
      </div>

      {/* ─── Tabla ─── */}
      <div className="flex-1 flex flex-col">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Tabla de eventos">
              <Table.Header>
                <Table.Column isRowHeader>ID</Table.Column>
                <Table.Column>Nombre</Table.Column>
                <Table.Column>Lugar</Table.Column>
                <Table.Column>Fecha Inicio</Table.Column>
                <Table.Column>Estatus</Table.Column>
                <Table.Column className="flex justify-end">Acciones</Table.Column>
              </Table.Header>
              <Table.Body
                items={paginatedRecords}
                renderEmptyState={() => (
                  <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                    {loading ? <Spinner color="current" size="sm" /> : 'No se encontraron resultados.'}
                  </div>
                )}
              >
                {(item) => (
                  <Table.Row id={item.id_evento}>
                    <Table.Cell>{item.id_evento}</Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.nombre}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{item.descripcion}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-medium">
                        {getEventVenueName(item)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      {item.fecha_inicio
                        ? new Date(item.fecha_inicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </Table.Cell>
                    <Table.Cell>
                      {item.estatus === 'CANCELADO' ? (
                        <Chip color="default" variant="soft" className="font-medium text-xs px-3 py-1">{item.estatus}</Chip>
                      ) : (
                        <Chip color="success" variant="soft" className="font-medium text-xs px-3 py-1">{item.estatus}</Chip>
                      )}
                    </Table.Cell>
                    <Table.Cell className="flex justify-end">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={() => handleGoToSeatSelection(item)}
                          aria-label="Ir a seleccion de asientos"
                        >
                          Asientos
                          <ChevronRight />
                        </Button>
                        <Button variant="ghost" isIconOnly size="sm" onPress={() => handleEdit(item)} aria-label="Editar">
                          <Pencil />
                        </Button>
                        {item.estatus === 'CANCELADO' ? (
                          <Button variant="ghost" isIconOnly size="sm" onPress={() => handleReactivate(item)} aria-label="Reactivar">
                            <ArrowRotateLeft />
                          </Button>
                        ) : (
                          <Button variant="ghost" isIconOnly size="sm" onPress={() => handleDeleteConfirm(item)} aria-label="Desactivar">
                            <TrashBin />
                          </Button>
                        )}
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
                  <Pagination.Summary>Mostrando {startItem}-{endItem} de {filteredRecords.length} resultados</Pagination.Summary>
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous 
                        isDisabled={currentPage === 1} 
                        onPress={() => setCurrentPage((p) => p - 1)}
                      />
                    </Pagination.Item>
                    {getPageNumbers().map((p) =>
                      p === 'ellipsis' ? (
                        <Pagination.Item key={`ellipsis-${p}`}><Pagination.Ellipsis /></Pagination.Item>
                      ) : (
                        <Pagination.Item key={p}>
                          <Pagination.Link 
                            isActive={p === currentPage} 
                            onPress={() => setCurrentPage(p)}
                          >
                            {p}
                          </Pagination.Link>
                        </Pagination.Item>
                      )
                    )}
                    <Pagination.Item>
                      <Pagination.Next 
                        isDisabled={currentPage === totalPages} 
                        onPress={() => setCurrentPage((p) => p + 1)}
                      />
                    </Pagination.Item>
                  </Pagination.Content>
                </Pagination>
              </div>
            </Table.Footer>
          )}
        </Table>
      </div>

      {/* ─── Drawer Crear/Editar ─── */}
      <Drawer isOpen={modalOpen} onOpenChange={setModalOpen} aria-label="Formulario de evento">
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog>
              {() => {
                const errorNombre = getFieldError('nombre');
                const errorDescripcion = getFieldError('descripcion');
                const errorLugar = getFieldError('id_lugar');
                const errorFechaInicio = getFieldError('fecha_inicio');
                const errorFechaFin = getFieldError('fecha_fin');
                const errorTiempo = getFieldError('tiempo_espera');
                const errorFoto = getFieldError('foto');
                const errorVersion = getFieldError('id_version');

                return (
                <>
                  <Drawer.CloseTrigger />
                  <Drawer.Header>
                    <Drawer.Heading className="flex items-center gap-3">
                      {formLoading ? <></> : (
                        <div className="flex flex-col gap-2">
                          <h3 className="text-xl font-semibold">{editingRecord ? 'Actualizar evento' : 'Registrar evento'}</h3>
                          <p className="text-sm text-muted">{editingRecord ? 'Actualice la información del evento y guarde los cambios' : 'Registre la información correspondiente del evento'}</p>
                        </div>
                      )}
                    </Drawer.Heading>
                  </Drawer.Header>

                  <Drawer.Body className="flex flex-col relative no-scrollbar">
                    {formLoading ? (
                      <div className="flex justify-center items-center py-20 flex-1"><Spinner color="current" size="sm" /></div>
                    ) : (
                      <div className="flex flex-col gap-5 w-full pt-6 pb-6">
                        <TextField name="nombre" aria-label="Nombre del evento" isRequired fullWidth variant="secondary" isInvalid={!!errorNombre}>
                          <Label>Nombre</Label>
                          <Input placeholder="Nombre del evento" value={form.nombre} onChange={handleFormChange} />
                          {errorNombre && <FieldError>{errorNombre}</FieldError>}
                        </TextField>

                        <TextField name="descripcion" aria-label="Descripción" fullWidth variant="secondary" isInvalid={!!errorDescripcion}>
                          <Label>Descripción</Label>
                          <Input placeholder="Descripción breve" value={form.descripcion} onChange={handleFormChange} />
                          {errorDescripcion && <FieldError>{errorDescripcion}</FieldError>}
                        </TextField>

                        <div className="flex flex-col gap-1 w-full">
                          <Label isRequired>Lugar</Label>
                          <Autocomplete
                            aria-label="Lugar del evento"
                            isRequired
                            value={form.id_lugar ? String(form.id_lugar) : null}
                            onChange={(val) => {
                              // Al cambiar de lugar, limpiamos el layout seleccionado
                              // porque pertenece al lugar anterior.
                              setForm({ ...form, id_lugar: val, id_version: '' })
                              if (serverErrors.id_lugar) {
                                setServerErrors((prev) => { const updated = { ...prev }; delete updated.id_lugar; return updated })
                              }
                              if (serverErrors.id_version) {
                                setServerErrors((prev) => { const updated = { ...prev }; delete updated.id_version; return updated })
                              }
                            }}
                            variant="secondary"
                            isInvalid={!!errorLugar}
                          >
                            <Autocomplete.Trigger>
                              <Autocomplete.Value placeholder="Buscar lugar..." />
                              <Autocomplete.ClearButton />
                              <Autocomplete.Indicator />
                            </Autocomplete.Trigger>
                            <Autocomplete.Popover>
                              <Autocomplete.Filter>
                                <SearchField>
                                  <SearchField.Group>
                                    <SearchField.SearchIcon />
                                    <SearchField.Input placeholder="Escribe para filtrar..." />
                                  </SearchField.Group>
                                </SearchField>
                                <ListBox>
                                  {venues.map((venue) => (
                                    <ListBox.Item id={String(venue.id_lugar)} key={String(venue.id_lugar)} textValue={`${venue.nombre} — ${venue.ciudad}`}>
                                      {venue.nombre} — {venue.ciudad}
                                    </ListBox.Item>
                                  ))}
                                </ListBox>
                              </Autocomplete.Filter>
                            </Autocomplete.Popover>
                          </Autocomplete>
                          {errorLugar && <FieldError className="text-danger-500 text-xs">{errorLugar}</FieldError>}
                        </div>

                        <TextField name="fecha_inicio" aria-label="Fecha inicio" isRequired fullWidth variant="secondary" isInvalid={!!errorFechaInicio}>
                          <Label>Fecha Inicio</Label>
                          <Input type="datetime-local" value={form.fecha_inicio} onChange={handleFormChange} />
                          {errorFechaInicio && <FieldError>{errorFechaInicio}</FieldError>}
                        </TextField>

                        <TextField name="fecha_fin" aria-label="Fecha fin" isRequired fullWidth variant="secondary" isInvalid={!!errorFechaFin}>
                          <Label>Fecha Fin</Label>
                          <Input type="datetime-local" value={form.fecha_fin} onChange={handleFormChange} />
                          {errorFechaFin && <FieldError>{errorFechaFin}</FieldError>}
                        </TextField>

                        <TextField name="tiempo_espera" aria-label="Tiempo espera" fullWidth variant="secondary" isInvalid={!!errorTiempo}>
                          <Label>Tiempo Espera (min)</Label>
                          <Input type="number" min="0" value={String(form.tiempo_espera)} onChange={handleFormChange} />
                          {errorTiempo && <FieldError>{errorTiempo}</FieldError>}
                        </TextField>

                        <ImageUploader
                          value={form.foto}
                          onChange={(url) => setForm((prev) => ({ ...prev, foto: url }))}
                          isInvalid={!!errorFoto}
                          error={errorFoto}
                        />

                        <div className="flex flex-col gap-1 w-full">
                          <Label isRequired>Layout del lugar</Label>
                          <Autocomplete
                            aria-label="Layout del evento"
                            isRequired
                            isDisabled={!form.id_lugar}
                            value={form.id_version ? String(form.id_version) : null}
                            onChange={(val) => {
                              setForm({ ...form, id_version: val })
                              if (serverErrors.id_version) {
                                setServerErrors((prev) => { const updated = { ...prev }; delete updated.id_version; return updated })
                              }
                            }}
                            variant="secondary"
                            isInvalid={!!errorVersion}
                          >
                            <Autocomplete.Trigger>
                              <Autocomplete.Value
                                placeholder={(() => {
                                  if (!form.id_lugar) return 'Primero elige un lugar';
                                  if (availableLayouts.length === 0) return 'Este lugar no tiene layouts publicados';
                                  return 'Selecciona un layout...';
                                })()}
                              />
                              <Autocomplete.ClearButton />
                              <Autocomplete.Indicator />
                            </Autocomplete.Trigger>
                            <Autocomplete.Popover>
                              <Autocomplete.Filter>
                                <SearchField>
                                  <SearchField.Group>
                                    <SearchField.SearchIcon />
                                    <SearchField.Input placeholder="Buscar por versión..." />
                                  </SearchField.Group>
                                </SearchField>
                                <ListBox>
                                  {availableLayouts.map((layout) => {
                                    const label = `Versión ${layout.version} (id_layout=${layout.id_layout})`
                                    return (
                                      <ListBox.Item
                                        id={String(layout.id_layout)}
                                        key={String(layout.id_layout)}
                                        textValue={label}
                                      >
                                        {label}
                                      </ListBox.Item>
                                    )
                                  })}
                                </ListBox>
                              </Autocomplete.Filter>
                            </Autocomplete.Popover>
                          </Autocomplete>
                          {errorVersion && <FieldError className="text-danger-500 text-xs">{errorVersion}</FieldError>}
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-1 block">Estatus</Label>
                          <select
                            name="estatus"
                            value={form.estatus}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2 border rounded border-default-300 bg-transparent text-sm"
                          >
                            {STATUS_OPTIONS.map((op) => (
                              <option key={op} value={op}>{op}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </Drawer.Body>

                  <Drawer.Footer>
                    {formLoading ? null : (
                      <Button color="primary" onPress={handleSave} isPending={submitting} isDisabled={submitting} className="font-semibold">
                        {({ isPending }) => {
                          let icon = null;
                          let label = 'Continuar';
                          if (isPending) {
                            icon = <Spinner color="current" size="sm" />;
                            label = 'Guardando...';
                          } else if (editingRecord) {
                            icon = <PencilToSquare />;
                            label = 'Actualizar';
                          }
                          return (
                            <>
                              {icon}
                              {label}
                              {!editingRecord && <ChevronRight />}
                            </>
                          );
                        }}
                      </Button>
                    )}
                  </Drawer.Footer>
                </>
              );
              }}
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      {/* ─── Modal de confirmación de creación ─── */}
      <AlertDialog>
        <AlertDialog.Backdrop isOpen={createConfirmOpen} onOpenChange={setCreateConfirmOpen}>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de registro de evento">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div><ContenedorIcono size="md"><Plus className="size-6 text-accent" /></ContenedorIcono></div>
                    <AlertDialog.Heading className="flex items-center gap-3"><h3>¿Registrar evento?</h3></AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">Está a punto de registrar un nuevo evento. ¿Desea continuar?</p>
                    <div className="flex items-center gap-3">
                      <Checkbox id="confirmacion-creacion-evento" aria-label="Confirmar" isSelected={createConfirmed} onChange={setCreateConfirmed}>
                        <Checkbox.Content><Label htmlFor="confirmacion-creacion-evento">Confirmo que los datos son correctos.</Label></Checkbox.Content>
                        <Checkbox.Control className="border border-border"><Checkbox.Indicator /></Checkbox.Control>
                      </Checkbox>
                    </div>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="outline" onPress={close}>Cancelar</Button>
                    <Button color="primary" onPress={executeSubmit} isPending={submitting} isDisabled={submitting || !createConfirmed}>
                      {({ isPending }) => (
                        <>{isPending ? <Spinner color="current" size="sm" /> : <Plus />}{isPending ? 'Registrando...' : 'Sí, registrar'}</>
                      )}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      {/* ─── Modal confirmación desactivar ─── */}
      <AlertDialog>
        <AlertDialog.Backdrop isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de desactivación">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div><ContenedorIcono size="md" color="danger"><TrashBin className="size-6 text-danger" /></ContenedorIcono></div>
                    <AlertDialog.Heading className="flex items-center gap-3"><h3>¿Desactivar evento?</h3></AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de desactivar el evento <span className="font-bold">&ldquo;{deletingRecord?.nombre}&rdquo;</span>. ¿Desea continuar?
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox isSelected={deleteConfirmed} onChange={setDeleteConfirmed}>
                        <Checkbox.Content><Label>Confirmo que deseo desactivar este evento.</Label></Checkbox.Content>
                        <Checkbox.Control className="border border-border"><Checkbox.Indicator /></Checkbox.Control>
                      </Checkbox>
                    </div>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="outline" onPress={close}>Cancelar</Button>
                    <Button variant="danger" onPress={handleDelete} isPending={submitting} isDisabled={submitting || !deleteConfirmed}>
                      {({ isPending }) => (
                        <>
                          {isPending ? <Spinner color="current" size="sm" /> : <TrashBin />}
                          {isPending ? 'Desactivando...' : 'Sí, desactivar'}
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
    </div>
  )
}
