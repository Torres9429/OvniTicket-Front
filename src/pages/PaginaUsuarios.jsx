import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Button,
  Checkbox,
  Chip,
  Input,
  Label,
  ListBox,
  Pagination,
  Select,
  Spinner,
  Table,
  TextField,
  Switch,
  toast,
  Drawer,
  DatePicker,
  DateField,
  Calendar,
  FieldError,
  AlertDialog,
  Description,
} from '@heroui/react'
import { parseDate } from '@internationalized/date'
import { Eye, EyeSlash, Pencil, Plus, TrashBin, Check, SquareCheck, SquareMinus, SquareExclamation, PencilToSquare, ChevronRight, PaperPlane } from '@gravity-ui/icons'
import ContenedorIcono from '../components/ContenedorIcono'
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  approveUser,
  deactivateUser,
  reactivateUser,
} from '../services/usuarios.api'
import { getRoles } from '../services/roles.api'

const ROWS_PER_PAGE = 10
const EMPTY_FORM = {
  nombre: '',
  apellidos: '',
  correo: '',
  contrasena: '',
  fecha_nacimiento: '',
  id_rol: '',
  estatus: '-',
}

const formatReadableDate = (dateString) => {
  if (!dateString) return null
  const isDatetime = dateString.includes('T')
  const dateWithTime = isDatetime ? dateString : dateString + 'T12:00:00'
  const date = new Date(dateWithTime)
  const options = isDatetime
    ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' }
  return date.toLocaleDateString('es-MX', options)
}

const parseCalendarDate = (dateString) => {
  if (!dateString) return null
  try {
    const datePart = dateString.split('T')[0]
    return parseDate(datePart)
  } catch {
    return null
  }
}

export default function PaginaUsuarios() { // NOSONAR
  const [records, setRecords] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)
  const [statusChangingItem, setStatusChangingItem] = useState(null)
  const [submittingStatus, setSubmittingStatus] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const outletContext = useOutletContext()
  const globalSearch = outletContext?.globalSearch || ''

  useEffect(() => {
    setCurrentPage(1)
  }, [globalSearch])

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false)
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [createConfirmed, setCreateConfirmed] = useState(false)
  const [approveConfirmed, setApproveConfirmed] = useState(false)
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)
  const [viewRequests, setViewRequests] = useState(false)

  const [editingRecord, setEditingRecord] = useState(null)
  const [deletingRecord, setDeletingRecord] = useState(null)
  const [detailRecord, setDetailRecord] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [showPassword, setShowPassword] = useState(false)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [serverErrors, setServerErrors] = useState({})

  const fetchData = async () => {
    setLoading(true)
    try {
      const [itemsData, rolesData] = await Promise.all([
        getUsers(),
        getRoles(),
      ])
      setRecords(Array.isArray(itemsData) ? itemsData : [])
      setRoles(Array.isArray(rolesData) ? rolesData : [])
    } catch {
      toast.danger('Error al cargar los datos', { description: 'No se pudieron obtener los usuarios y roles del servidor.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredRecords = useMemo(() => {
    let data = records
    if (viewRequests) {
      data = data.filter((it) => it.estatus === 'pendiente')
    } else {
      data = data.filter((it) => it.estatus !== 'pendiente')
    }
    const q = globalSearch.toLowerCase()
    if (!q) return data
    return data.filter((it) =>
      it.nombre?.toLowerCase().includes(q) ||
      it.apellidos?.toLowerCase().includes(q) ||
      it.correo?.toLowerCase().includes(q) ||
      it.id_usuario?.toString().includes(q)
    )
  }, [records, globalSearch, viewRequests])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ROWS_PER_PAGE))
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return filteredRecords.slice(start, start + ROWS_PER_PAGE)
  }, [filteredRecords, currentPage])

  const handleCreate = () => {
    setFormLoading(true)
    setEditingRecord(null)
    setForm({ ...EMPTY_FORM })
    setShowPassword(false)
    setAttemptedSubmit(false)
    setServerErrors({})
    setModalOpen(true)

    setTimeout(() => {
      setFormLoading(false)
    }, 400)
  }

  const handleEdit = async (item) => {
    setFormLoading(true)
    setEditingRecord(null)
    setShowPassword(false)
    setAttemptedSubmit(false)
    setServerErrors({})
    setModalOpen(true)

    try {
      const data = await getUser(item.id_usuario)
      setForm({
        nombre: data.nombre || '',
        apellidos: data.apellidos || '',
        correo: data.correo || '',
        fecha_nacimiento: data.fecha_nacimiento || '',
        id_rol: data.id_rol ? String(data.id_rol) : '',
        estatus: data.estatus || '-',
      })
      setEditingRecord(data)
    } catch {
      toast.danger('No se pudo cargar la información completa del usuario', { description: 'Ocurrió un error al consultar los datos. Intenta de nuevo.' })
      setModalOpen(false)
    } finally {
      setFormLoading(false)
    }
  }

  const handleViewDetail = async (item) => {
    setDetailRecord(null)
    setDetailModalOpen(true)
    setDetailLoading(true)
    try {
      const data = await getUser(item.id_usuario)
      setDetailRecord(data)
    } catch {
      toast.danger('Error al obtener los detalles del usuario', { description: 'No se pudo consultar la información del usuario seleccionado.' })
      setDetailModalOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDeleteConfirm = (item) => {
    setDeletingRecord(item)
    setDeleteConfirmed(false)
    setDeleteModalOpen(true)
  }

  const handleApprove = (item) => {
    setEditingRecord(item)
    setApproveConfirmed(false)
    setApproveConfirmOpen(true)
  }

  const handleConfirmApprove = async () => {
    if (!editingRecord) return
    setSubmitting(true)
    try {
      await approveUser(editingRecord.id_usuario)
      await fetchData()
      setApproveConfirmOpen(false)
      setModalOpen(false)
      toast.success('Usuario aprobado correctamente', { description: `El usuario "${editingRecord.nombre} ${editingRecord.apellidos}" ha sido aprobado y su cuenta activada.` })
    } catch {
      toast.danger('No se pudo aprobar el usuario', { description: 'Ocurrió un error al intentar aprobar la cuenta. Intenta de nuevo.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = (item) => {
    setStatusChangingItem(item)
    setStatusConfirmOpen(true)
  }

  const handleConfirmStatus = async () => {
    setSubmittingStatus(true)
    const action = statusChangingItem.estatus
    try {
      if (action === 'activo') {
        await deactivateUser(statusChangingItem.id_usuario)
      } else if (action === 'inactivo') {
        await reactivateUser(statusChangingItem.id_usuario)
      }
      await fetchData()
      setStatusConfirmOpen(false)
      toast.success(
        action === 'activo' ? 'Usuario desactivado correctamente' : 'Usuario reactivado correctamente',
        {
          description: action === 'activo'
            ? `El usuario "${statusChangingItem.nombre} ${statusChangingItem.apellidos}" ya no podrá acceder al sistema.`
            : `El usuario "${statusChangingItem.nombre} ${statusChangingItem.apellidos}" puede volver a acceder al sistema.`
        },
      )
    } catch {
      toast.danger('No se pudo cambiar el estatus del usuario', { description: 'Ocurrió un error al intentar actualizar el estatus. Intenta de nuevo.' })
    } finally {
      setSubmittingStatus(false)
    }
  }

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

  const handleSave = async () => {
    setAttemptedSubmit(true)
    const isEmailValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.correo)

    if (!form.nombre.trim()) { toast.danger('El nombre es obligatorio', { description: 'Este campo no puede estar vacío.' }); return }
    if (!form.apellidos.trim()) { toast.danger('Los apellidos son obligatorios', { description: 'Este campo no puede estar vacío.' }); return }
    if (!form.correo.trim() || !isEmailValid) { toast.danger('Ingresa un correo electrónico válido', { description: 'El formato del correo no es correcto.' }); return }
    if (!form.fecha_nacimiento) { toast.danger('La fecha de nacimiento es obligatoria', { description: 'Selecciona una fecha válida.' }); return }
    if (!form.id_rol) { toast.danger('Selecciona un rol', { description: 'Debes asignar un rol al usuario.' }); return }
    if (!editingRecord && !form.contrasena.trim()) { toast.danger('La contraseña es obligatoria', { description: 'Debes asignar una contraseña al nuevo usuario.' }); return }

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
        apellidos: form.apellidos,
        correo: form.correo,
        fecha_nacimiento: form.fecha_nacimiento,
        id_rol: Number(form.id_rol),
      }

      if (editingRecord) {
        payload.fecha_actualizacion = now
        payload.estatus = form.estatus
        await updateUser(editingRecord.id_usuario, payload)
        toast.success('Usuario actualizado correctamente', { description: 'Los cambios se guardaron exitosamente.' })
      } else {
        payload.contrasena = form.contrasena
        payload.fecha_creacion = now
        payload.fecha_actualizacion = now
        await createUser(payload)
        toast.success('Usuario creado correctamente', { description: 'El nuevo usuario ha sido registrado en el sistema.' })
      }

      setModalOpen(false)
      setCreateConfirmOpen(false)
      await fetchData()
    } catch (err) {
      setCreateConfirmOpen(false)
      if (err.response?.data) {
        setServerErrors(err.response.data)
        if (typeof err.response.data === 'string' || Object.keys(err.response.data).length === 0) {
          toast.danger('Error al guardar: verifique los datos ingresados.', { description: 'El servidor rechazó la solicitud. Revisa los campos.' })
        } else {
          toast.danger('Corrige los errores marcados en el formulario', { description: 'Hay campos con errores de validación del servidor.' })
        }
      } else {
        toast.danger('Error al guardar el usuario', { description: 'No se pudo conectar con el servidor. Intenta de nuevo.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingRecord) return
    setSubmitting(true)
    try {
      await deleteUser(deletingRecord.id_usuario)
      toast.success('Usuario eliminado', { description: `El usuario "${deletingRecord.nombre} ${deletingRecord.apellidos}" fue eliminado permanentemente.` })
      setDeleteModalOpen(false)
      setDeletingRecord(null)
      await fetchData()
    } catch {
      toast.danger('Error al eliminar el usuario', { description: 'Ocurrió un error al intentar eliminar. Intenta de nuevo.' })
    } finally {
      setSubmitting(false)
    }
  }

  const getRoleName = (id) => {
    const role = roles.find((r) => r.id_rol === id)
    return role ? role.nombre : `ID: ${id}`
  }

  const getPageNumbers = () => {
    const pages = []

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis')
      }

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }

      pages.push(totalPages)
    }

    return pages
  }

  const startItem = filteredRecords.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ROWS_PER_PAGE, filteredRecords.length)

  return (
    <div className="flex flex-col gap-6 pl-8 pr-4 pt-3">
      <div className="flex justify-between items-end shrink-0 gap-4">
        <div>
          <h2>{viewRequests ? "Usuarios por aprobar" : "Usuarios registrados"}</h2>
          <p className="text-muted text-sm">
            {viewRequests
              ? `Usuarios pendientes de aprobación (${filteredRecords.length} pendientes)`
              : `Administra los usuarios del sistema (${filteredRecords.length} registros)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onPress={() => {
              setViewRequests(!viewRequests);
              setCurrentPage(1);
            }}
            variant="ghost"
          >
            {viewRequests ? <SquareMinus /> : <PaperPlane />}
            {viewRequests ? "Ver todos" : "Ver solicitudes"}
          </Button>
          <Button onPress={handleCreate}>
            <Plus />
            Registrar
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label={
                viewRequests ? "Tabla de solicitudes" : "Tabla de usuarios"
              }
            >
              <Table.Header>
                <Table.Column isRowHeader>#</Table.Column>
                <Table.Column>Nombre</Table.Column>
                <Table.Column>Correo</Table.Column>
                <Table.Column>Rol</Table.Column>
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
                    ) : viewRequests ? (
                      "No hay solicitudes pendientes."
                    ) : (
                      "No se encontraron resultados."
                    )}
                  </div>
                )}
              >
                {(item) => (
                  <Table.Row id={item.id_usuario}>
                    <Table.Cell>
                      {(currentPage - 1) * ROWS_PER_PAGE +
                        paginatedRecords.indexOf(item) +
                        1}
                    </Table.Cell>
                    <Table.Cell>
                      <span className="font-medium">
                        {item.nombre} {item.apellidos}
                      </span>
                    </Table.Cell>
                    <Table.Cell>{item.correo}</Table.Cell>
                    <Table.Cell>
                      <Chip
                        color="accent"
                        variant="soft"
                        className='uppercase'
                      >
                          {getRoleName(item.id_rol)}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell className="text-muted">
                      {formatReadableDate(item.fecha_creacion)}
                    </Table.Cell>
                    <Table.Cell>
                      {item.estatus === "pendiente" ? (
                        <Chip
                          color="warning"
                          variant="soft"
                        >
                          <SquareExclamation  />
                          {" "}PENDIENTE
                        </Chip>
                      ) : (
                        <Switch
                          isSelected={item.estatus === "activo"}
                          onChange={() => handleToggleStatus(item)}
                          size="sm"
                        >
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch>
                      )}
                    </Table.Cell>
                    <Table.Cell className="flex justify-end">
                      <div className="flex gap-1">{viewRequests && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onPress={() => handleApprove(item)}
                            aria-label="Aprobar"
                            className="text-success"
                          >
                            <Check />
                            Aprobar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          isIconOnly
                          size="sm"
                          onPress={() => handleViewDetail(item)}
                          aria-label="Ver detalles"
                        >
                          <Eye />
                        </Button>
                          <>
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
                              aria-label="Eliminar"
                            >
                              <TrashBin className="text-danger" />
                            </Button>
                          </>
                        
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
        aria-label="Formulario de usuario"
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
                          <h3>Actualizar usuario</h3>
                          <p className="text-sm text-muted">
                            Actualice la información del usuario y guarde los
                            cambios
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <h3>Registrar usuario</h3>
                          <p className="text-sm text-muted">
                            Registre la información correspondiente del usuario
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
                        <div className="flex gap-3">
                          <TextField
                            name="nombre"
                            aria-label="Nombre del usuario"
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
                              placeholder="Nombre"
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
                            name="apellidos"
                            aria-label="Apellidos del usuario"
                            fullWidth
                            variant="secondary"
                            isRequired
                            isInvalid={
                              !!serverErrors.apellidos ||
                              (attemptedSubmit && !form.apellidos.trim())
                            }
                          >
                            <Label>Apellidos</Label>
                            <Input
                              placeholder="Apellidos"
                              value={form.apellidos}
                              onChange={handleFormChange}
                            />
                            {serverErrors.apellidos ? (
                              <FieldError>
                                {serverErrors.apellidos[0]}
                              </FieldError>
                            ) : (
                              attemptedSubmit &&
                              !form.apellidos.trim() && (
                                <FieldError>
                                  Los apellidos son obligatorios.
                                </FieldError>
                              )
                            )}
                          </TextField>
                        </div>

                        
                        <DatePicker
                          aria-label="Fecha de nacimiento"
                          isRequired
                          granularity="day"
                          isInvalid={
                            (attemptedSubmit && !form.fecha_nacimiento) ||
                            !!serverErrors.fecha_nacimiento
                          }
                          value={
                            form.fecha_nacimiento
                              ? parseDate(form.fecha_nacimiento.split("T")[0])
                              : null
                          }
                          onChange={(val) =>
                            handleFormChange({
                              target: {
                                name: "fecha_nacimiento",
                                value: val ? val.toString() : "",
                              },
                            })
                          }
                        >
                          <Label>Fecha de Nacimiento</Label>
                          <DateField.Group variant="secondary">
                            <DateField.Input>
                              {(segment) => (
                                <DateField.Segment segment={segment} />
                              )}
                            </DateField.Input>
                            <DateField.Suffix>
                              <DatePicker.Trigger>
                                <DatePicker.TriggerIndicator />
                              </DatePicker.Trigger>
                            </DateField.Suffix>
                          </DateField.Group>
                          <Description className="text-xs text-muted">
                            {form.fecha_nacimiento
                              ? formatReadableDate(form.fecha_nacimiento)
                              : "Selecciona una fecha"}
                          </Description>
                          <DatePicker.Popover placement='bottom'>
                            <Calendar aria-label="Escoger fecha">
                              <Calendar.Header>
                                <Calendar.YearPickerTrigger>
                                  <Calendar.YearPickerTriggerHeading />
                                  <Calendar.YearPickerTriggerIndicator />
                                </Calendar.YearPickerTrigger>
                                <Calendar.NavButton slot="previous" />
                                <Calendar.NavButton slot="next" />
                              </Calendar.Header>
                              <Calendar.Grid>
                                <Calendar.GridHeader>
                                  {(day) => (
                                    <Calendar.HeaderCell>
                                      {day}
                                    </Calendar.HeaderCell>
                                  )}
                                </Calendar.GridHeader>
                                <Calendar.GridBody>
                                  {(date) => <Calendar.Cell date={date} />}
                                </Calendar.GridBody>
                              </Calendar.Grid>
                              <Calendar.YearPickerGrid>
                                <Calendar.YearPickerGridBody>
                                  {({ year }) => (
                                    <Calendar.YearPickerCell year={year} />
                                  )}
                                </Calendar.YearPickerGridBody>
                              </Calendar.YearPickerGrid>
                            </Calendar>
                          </DatePicker.Popover>
                          {serverErrors.fecha_nacimiento ? (
                            <FieldError>
                              {serverErrors.fecha_nacimiento[0]}
                            </FieldError>
                          ) : (
                            attemptedSubmit &&
                            !form.fecha_nacimiento && (
                              <FieldError>
                                La fecha de nacimiento es obligatoria.
                              </FieldError>
                            )
                          )}
                        </DatePicker>

                        <TextField
                          name="correo"
                          aria-label="Correo electrónico del usuario"
                          isRequired
                          fullWidth
                          variant="secondary"
                          isInvalid={
                            (attemptedSubmit &&
                              (!form.correo.trim() ||
                                !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
                                  form.correo,
                                ))) ||
                            !!serverErrors.correo
                          }
                        >
                          <Label>Correo electrónico</Label>
                          <Input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={form.correo}
                            onChange={handleFormChange}
                          />
                          {serverErrors.correo ? (
                            <FieldError>{serverErrors.correo[0]}</FieldError>
                          ) : (
                            attemptedSubmit &&
                            (!form.correo.trim() ||
                              !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
                                form.correo,
                              )) && (
                              <FieldError>
                                Ingresa un formato de correo electrónico válido.
                              </FieldError>
                            )
                          )}
                        </TextField>

                        {!editingRecord && (
                          <TextField
                            name="contrasena"
                            aria-label="Contraseña del usuario"
                            isRequired
                            fullWidth
                            variant="secondary"
                            isInvalid={
                              (attemptedSubmit &&
                                !editingRecord &&
                                !form.contrasena.trim()) ||
                              !!serverErrors.contrasena
                            }
                          >
                            <Label>Contraseña</Label>
                            <div className="relative flex items-center">
                              <Input
                                name="contrasena"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={form.contrasena}
                                onChange={handleFormChange}
                                className="pr-10 w-full"
                              />
                              <Button
                                isIconOnly
                                size="sm"
                                variant="ghost"
                                type="button"
                                className="absolute right-1"
                                onPress={() =>
                                  setShowPassword(!showPassword)
                                }
                                aria-label={
                                  showPassword ? "Ocultar" : "Mostrar"
                                }
                              >
                                {showPassword ? <EyeSlash /> : <Eye />}
                              </Button>
                            </div>
                            {serverErrors.contrasena ? (
                              <FieldError>
                                {serverErrors.contrasena[0]}
                              </FieldError>
                            ) : (
                              attemptedSubmit &&
                              !editingRecord &&
                              !form.contrasena.trim() && (
                                <FieldError>
                                  La contraseña es obligatoria.
                                </FieldError>
                              )
                            )}
                          </TextField>
                        )}

                        <Select
                          isRequired
                          className="w-full"
                          name="id_rol"
                          aria-label="Rol del usuario"
                          selectedKey={form.id_rol ? String(form.id_rol) : null}
                          onSelectionChange={(key) => {
                            setForm({ ...form, id_rol: key });
                            if (serverErrors.id_rol) {
                              setServerErrors((prev) => {
                                const updated = { ...prev };
                                delete updated.id_rol;
                                return updated;
                              });
                            }
                          }}
                          variant="secondary"
                          isInvalid={
                            (attemptedSubmit && !form.id_rol) ||
                            !!serverErrors.id_rol
                          }
                        >
                          <Label>Rol</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {roles.map((rol) => (
                                <ListBox.Item
                                  id={String(rol.id_rol)}
                                  key={String(rol.id_rol)}
                                  textValue={rol.nombre}
                                >
                                  {rol.nombre}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                          {serverErrors.id_rol ? (
                            <FieldError>{serverErrors.id_rol[0]}</FieldError>
                          ) : (
                            attemptedSubmit &&
                            !form.id_rol && (
                              <FieldError>
                                Selecciona un rol de la lista.
                              </FieldError>
                            )
                          )}
                        </Select>
                        {editingRecord && (
                          <div className="flex justify-between">
                            <Label className="text-sm font-medium">
                              Estado de la cuenta:
                            </Label>

                            <Chip
                              color={
                                editingRecord.estatus === "activo"
                                  ? "accent"
                                  : editingRecord.estatus === "inactivo"
                                    ? "default"
                                    : "warning"
                              }
                              variant="soft"
                            >
                              {editingRecord.estatus === "activo" ? (
                                <SquareCheck />
                              ) : editingRecord.estatus === "inactivo" ? (
                                <SquareMinus />
                              ) : (
                                <SquareExclamation />
                              )}
                              <Chip.Label className="uppercase">
                                {editingRecord.estatus || "no definido"}
                              </Chip.Label>
                            </Chip>
                          </div>
                        )}
                      </div>
                    )}
                  </Drawer.Body>

                  <Drawer.Footer>
                    {formLoading ? (
                      <></>
                    ) : (
                      <>
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
            <AlertDialog.Dialog aria-label="Confirmación de registro de usuario">
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
                      <h3>¿Registrar usuario?</h3>
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de registrar un nuevo usuario. ¿Desea
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
                            Confirmo que los datos son correctos y el usuario
                            tendrá acceso al sistema.
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
            <AlertDialog.Dialog aria-label="Confirmación de eliminación de usuario">
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
                      <h3>¿Eliminar usuario?</h3>
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de eliminar al usuario{" "}
                      <span className="font-bold">
                        &ldquo;{deletingRecord?.nombre}{" "}
                        {deletingRecord?.apellidos}&rdquo;
                      </span>
                      . Esta acción no se puede deshacer. ¿Desea continuar?
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        isSelected={deleteConfirmed}
                        onChange={setDeleteConfirmed}
                      >
                        <Checkbox.Content>
                          <Label htmlFor="confirmacion-eliminacion">
                            Confirmo que deseo eliminar este usuario
                            permanentemente del sistema.
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
                          {isPending ? "Eliminando..." : "Sí, eliminar"}
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
                          statusChangingItem?.estatus === "activo"
                            ? "default"
                            : "accent"
                        }
                      >
                        {statusChangingItem?.estatus === "activo" ? (
                          <SquareMinus className="size-6 text-muted" />
                        ) : (
                          <SquareCheck className="size-6 text-accent" />
                        )}
                      </ContenedorIcono>
                    </div>
                    <AlertDialog.Heading className="flex items-center gap-3">
                      <h3>
                        {statusChangingItem?.estatus === "activo"
                          ? "¿Desactivar usuario?"
                          : "¿Reactivar usuario?"}
                      </h3>
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted">
                      {statusChangingItem?.estatus === "activo" ? (
                        <>
                          Está a punto de desactivar al usuario{" "}
                          <span className="font-bold">
                            &ldquo;{statusChangingItem?.nombre}{" "}
                            {statusChangingItem?.apellidos}&rdquo;
                          </span>
                          . El usuario no podrá acceder al sistema. ¿Desea
                          continuar?
                        </>
                      ) : (
                        <>
                          Está a punto de reactivar al usuario{" "}
                          <span className="font-bold">
                            &ldquo;{statusChangingItem?.nombre}{" "}
                            {statusChangingItem?.apellidos}&rdquo;
                          </span>
                          . El usuario podrá volver a acceder al sistema. ¿Desea
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
                        statusChangingItem?.estatus === "activo"
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
                          ) : statusChangingItem?.estatus === "activo" ? (
                            <SquareMinus />
                          ) : (
                            <SquareCheck />
                          )}
                          {isPending
                            ? "Actualizando..."
                            : statusChangingItem?.estatus === "activo"
                              ? "Sí, desactivar"
                              : "Sí, reactivar"}
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
          isOpen={approveConfirmOpen}
          onOpenChange={setApproveConfirmOpen}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de aprobación de usuario">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div>
                      <ContenedorIcono size="md" color="success">
                        <SquareCheck className="size-6 text-success" />
                      </ContenedorIcono>
                    </div>
                    <AlertDialog.Heading className="flex items-center gap-3">
                      <h3>¿Aprobar usuario?</h3>
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de aprobar al usuario{" "}
                      <span className="font-bold">
                        &ldquo;{editingRecord?.nombre}{" "}
                        {editingRecord?.apellidos}&rdquo;
                      </span>
                      . El usuario podrá acceder al sistema y crear eventos.
                      ¿Desea continuar?
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        isSelected={approveConfirmed}
                        onChange={setApproveConfirmed}
                      >
                        <Checkbox.Content>
                          <Label htmlFor="confirmacion-aprobacion">
                            Confirmo que deseo aprobar a este usuario y activar
                            su cuenta en el sistema.
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
                      onPress={handleConfirmApprove}
                      isPending={submitting}
                      isDisabled={submitting || !approveConfirmed}
                      className="bg-success text-success-foreground"
                    >
                      {({ isPending }) => (
                        <>
                          {isPending ? (
                            <Spinner color="current" size="sm" />
                          ) : (
                            <SquareCheck />
                          )}
                          {isPending ? "Aprobando..." : "Sí, aprobar"}
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
        aria-label="Detalles de usuario"
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
                          <h3>Detalles del Usuario</h3>
                          <p className="text-sm text-muted">
                            Información completa del usuario registrado
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <h3>Detalles del Usuario</h3>
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
                              Estado de la cuenta:
                            </Label>
                            <Chip
                              color={
                                detailRecord.estatus === "activo"
                                  ? "accent"
                                  : detailRecord.estatus === "pendiente"
                                    ? "warning"
                                    : "default"
                              }
                              variant="soft"
                            >
                              {detailRecord.estatus === "activo" ? (
                                <SquareCheck />
                              ) : detailRecord.estatus === "pendiente" ? (
                                <SquareExclamation />
                              ) : (
                                <SquareMinus />
                              )}
                              <Chip.Label className="uppercase">
                                {detailRecord.estatus || "no definido"}
                              </Chip.Label>
                            </Chip>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">Nombre completo</Label>
                            <span className="text-sm font-medium">
                              {detailRecord.nombre}
                              {detailRecord.apellidos
                                ? ` ${detailRecord.apellidos}`
                                : ""}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">
                              Correo electrónico
                            </Label>
                            <span className="text-sm">
                              {detailRecord.correo}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">Rol</Label>
                            <span className="text-sm font-medium">
                              <span className="uppercase">
                                {getRoleName(detailRecord.id_rol)}
                              </span>
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm">Fecha de creación</Label>
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

                          <div className="flex flex-col gap-2">
                            <Label className="text-sm">
                              Fecha de nacimiento
                            </Label>
                            {detailRecord.fecha_nacimiento && (
                              <div className="flex flex-col gap-2">
                                <span className="text-sm pb-2">
                                  {formatReadableDate(
                                    detailRecord.fecha_nacimiento,
                                  )}
                                </span>

                                <Calendar
                                  isReadOnly
                                  aria-label="Fecha de nacimiento"
                                  value={parseCalendarDate(
                                    detailRecord.fecha_nacimiento,
                                  )}
                                  className="w-full"
                                >
                                  <Calendar.Grid>
                                    <Calendar.GridHeader>
                                      {(day) => (
                                        <Calendar.HeaderCell>
                                          {day}
                                        </Calendar.HeaderCell>
                                      )}
                                    </Calendar.GridHeader>
                                    <Calendar.GridBody>
                                      {(date) => <Calendar.Cell date={date} />}
                                    </Calendar.GridBody>
                                  </Calendar.Grid>
                                </Calendar>
                              </div>
                            )}
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
                            handleEdit(detailRecord);
                          }}
                          fullWidth
                        >
                          <PencilToSquare />
                          Actualizar detalles
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
