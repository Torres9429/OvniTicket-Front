import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
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
import { Eye, EyeSlash, Pencil, Plus, TrashBin, Check, SquareCheck, SquareMinus, SquareExclamation, PencilToSquare, ChevronRight } from '@gravity-ui/icons'
import ContenedorIcono from '../components/ContenedorIcono'
import {
  obtenerUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  aprobarUsuario,
  desactivarUsuario,
} from '../services/usuarios.api'
import { obtenerRoles } from '../services/roles.api'

/* ─── constantes ─── */
const FILAS_POR_PAGINA = 10

const FORMULARIO_VACIO = {
  nombre: '',
  apellidos: '',
  correo: '',
  contrasena: '',
  fecha_nacimiento: '',
  id_rol: '',
  estatus: '-',
}

/* ─── función de rango de páginas ─── */
const range = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i)

/* ─── función para formatear fechas de manera legible (corrige desfase de zona horaria) ─── */
const formatearFechaLegible = (fechaString) => {
  if (!fechaString) return null
  // Detectar si es datetime (tiene T) o solo fecha
  const esDatetime = fechaString.includes('T')
  // Si ya tiene T, usar directamente; si no, agregar T12:00:00
  const fechaConHora = esDatetime ? fechaString : fechaString + 'T12:00:00'
  const fecha = new Date(fechaConHora)
  // Si es datetime, mostrar fecha y hora; si solo es fecha, mostrar solo fecha
  const opciones = esDatetime
    ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' }
  return fecha.toLocaleDateString('es-MX', opciones)
}

/* ─── función para parsear fecha a CalendarDate para HeroUI ─── */
const parseCalendarDate = (fechaString) => {
  if (!fechaString) return null
  try {
    // Usar parseDate de @internationalized/date para crear un CalendarDate válido
    // Tomar solo la parte YYYY-MM-DD de la fecha
    const fechaParte = fechaString.split('T')[0]
    return parseDate(fechaParte)
  } catch {
    return null
  }
}

/* ─── componente principal ─── */
export default function PaginaUsuarios() {
  /* ─── datos ─── */
  const [registros, setRegistros] = useState([])
  const [roles, setRoles] = useState([])
  const [cargando, setcargando] = useState(true)

  /* ─── paginación ─── */
  const [paginaActual, setPaginaActual] = useState(1)

  /* ─── contexto del layout global ─── */
  const contextoGlobal = useOutletContext()
  const busquedaGlobal = contextoGlobal?.busquedaGlobal || ''

  useEffect(() => {
    setPaginaActual(1)
  }, [busquedaGlobal])

  /* ─── modales ─── */
  const [modalAbierto, setmodalAbierto] = useState(false)
  const [deletemodalAbierto, setDeletemodalAbierto] = useState(false)
  const [detailmodalAbierto, setDetailmodalAbierto] = useState(false)
  const [confirmacionCrearAbierta, setconfirmacionCrearAbierta] = useState(false)
  const [confirmacionAprobarAbierta, setconfirmacionAprobarAbierta] = useState(false)
  const [creacionConfirmada, setcreacionConfirmada] = useState(false);
  const [aprobacionConfirmada, setaprobacionConfirmada] = useState(false);
  const [eliminacionConfirmada, seteliminacionConfirmada] = useState(false);
  const [verSolicitudes, setVerSolicitudes] = useState(false)

  /* ─── edición / eliminación ─── */
  const [registroEnEdicion, setregistroEnEdicion] = useState(null)
  const [registroBorrando, setregistroBorrando] = useState(null)
  const [registroDetalle, setregistroDetalle] = useState(null)

  /* ─── formulario ─── */
  const [enviando, setenviando] = useState(false)
  const [formCargando, setformCargando] = useState(false)
  const [detailcargando, setDetailcargando] = useState(false)
  const [form, setForm] = useState({ ...FORMULARIO_VACIO })
  const [mostrarContrasena, setmostrarContrasena] = useState(false)
  const [intentadoEnviar, setintentadoEnviar] = useState(false)
  const [erroresServidor, seterroresServidor] = useState({})

  /* ─── fetch ─── */
  const fetchData = async () => {
    setcargando(true)
    try {
      const [itemsData, rolesData] = await Promise.all([
        obtenerUsuarios(),
        obtenerRoles(),
      ])
      setRegistros(Array.isArray(itemsData) ? itemsData : [])
      setRoles(Array.isArray(rolesData) ? rolesData : [])
    } catch (err) {
      console.error('Error cargando datos:', err)
      toast.danger('Error al cargar los datos')
    } finally {
      setcargando(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  /* ─── datos filtrados y paginados ─── */
  const registrosFiltrados = useMemo(() => {
    let datos = registros
    if (verSolicitudes) {
      datos = datos.filter((it) => it.estatus === 'pendiente')
    }
    const q = busquedaGlobal.toLowerCase()
    if (!q) return datos
    return datos.filter((it) =>
      it.nombre?.toLowerCase().includes(q) ||
      it.apellidos?.toLowerCase().includes(q) ||
      it.correo?.toLowerCase().includes(q) ||
      it.id_usuario?.toString().includes(q)
    )
  }, [registros, busquedaGlobal, verSolicitudes])

  const paginasTotales = Math.max(1, Math.ceil(registrosFiltrados.length / FILAS_POR_PAGINA))
  const registrosPaginados = useMemo(() => {
    const start = (paginaActual - 1) * FILAS_POR_PAGINA
    return registrosFiltrados.slice(start, start + FILAS_POR_PAGINA)
  }, [registrosFiltrados, paginaActual])

  /* ─── abrir modal crear ─── */
  const handleCreate = () => {
    // Set loading state and open drawer immediately
    setformCargando(true)
    setregistroEnEdicion(null)
    setForm({ ...FORMULARIO_VACIO })
    setmostrarContrasena(false)
    setintentadoEnviar(false)
    seterroresServidor({})
    setmodalAbierto(true)
    // Show inputs after 1 second
    setTimeout(() => {
      setformCargando(false)
    }, 400)
  }

  /* ─── abrir modal editar ─── */
  const handleEdit = async (item) => {
    // Set loading state first before opening modal
    setformCargando(true)
    setregistroEnEdicion(null) // Clear previous data
    setmostrarContrasena(false)
    setintentadoEnviar(false)
    seterroresServidor({})
    setmodalAbierto(true)

    try {
      const data = await obtenerUsuario(item.id_usuario)
      setForm({
        nombre: data.nombre || '',
        apellidos: data.apellidos || '',
        correo: data.correo || '',
        contrasena: '',
        fecha_nacimiento: data.fecha_nacimiento || '',
        id_rol: data.id_rol ? String(data.id_rol) : '',
        estatus: data.estatus || '-',
      })
      setregistroEnEdicion(data)
    } catch (err) {
      console.error('Error al consultar datos:', err)
      toast.danger('No se pudo cargar la información completa del usuario')
      setmodalAbierto(false)
    } finally {
      setformCargando(false)
    }
  }

  /* ─── ver detalles (fetch individual) ─── */
  const handleViewDetail = async (item) => {
    setregistroDetalle(null)
    setDetailmodalAbierto(true)
    setDetailcargando(true)
    try {
      const data = await obtenerUsuario(item.id_usuario)
      setregistroDetalle(data)
    } catch (err) {
      console.error('Error obteniendo detalles:', err)
      toast.danger('Error al obtener los detalles del usuario')
      setDetailmodalAbierto(false)
    } finally {
      setDetailcargando(false)
    }
  }

  /* ─── abrir confirmación de eliminar ─── */
  const handleDeleteConfirm = (item) => {
    setregistroBorrando(item)
    seteliminacionConfirmada(false)
    setDeletemodalAbierto(true)
  }

  /* ─── aprobar usuario ─── */
  const handleAprobar = (item) => {
    setregistroEnEdicion(item)
    setaprobacionConfirmada(false)
    setconfirmacionAprobarAbierta(true)
  }

  /* ─── toggle switch estatus ─── */
  const handleToggleEstatus = async (item) => {
    try {
      if (item.estatus === 'activo') {
        await desactivarUsuario(item.id_usuario)
        toast.success('Usuario desactivado correctamente')
      } else {
        await aprobarUsuario(item.id_usuario)
        toast.success('Usuario activado correctamente')
      }
      await fetchData()
    } catch {
      toast.danger('No se pudo cambiar el estatus del usuario')
    }
  }

  /* ─── cambio de campo ─── */
  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (erroresServidor[e.target.name]) {
      seterroresServidor((prev) => {
        const nuevo = { ...prev }
        delete nuevo[e.target.name]
        return nuevo
      })
    }
  }

  /* ─── guardar (crear o actualizar) ─── */
  const handleSave = async () => {
    setintentadoEnviar(true)
    const correoEsValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)

    if (!form.nombre.trim()) { toast.danger('El nombre es obligatorio'); return }
    if (!form.correo.trim() || !correoEsValido) { toast.danger('Ingresa un correo electrónico válido'); return }
    if (!form.fecha_nacimiento) { toast.danger('La fecha de nacimiento es obligatoria'); return }
    if (!form.id_rol) { toast.danger('Selecciona un rol'); return }
    if (!registroEnEdicion && !form.contrasena.trim()) { toast.danger('La contraseña es obligatoria'); return }

    if (!registroEnEdicion) {
      setcreacionConfirmada(false)
      setconfirmacionCrearAbierta(true)
      return
    }
    await executeSubmit()
  }

  const executeSubmit = async () => {
    setenviando(true)
    try {
      const now = new Date().toISOString()
      const payload = {
        nombre: form.nombre,
        apellidos: form.apellidos,
        correo: form.correo,
        fecha_nacimiento: form.fecha_nacimiento,
        id_rol: Number(form.id_rol),
      }

      if (registroEnEdicion) {
        payload.fecha_actualizacion = now
        payload.estatus = form.estatus
        await actualizarUsuario(registroEnEdicion.id_usuario, payload)
        toast.success('Usuario actualizado correctamente')
      } else {
        payload.contrasena = form.contrasena
        payload.fecha_creacion = now
        payload.fecha_actualizacion = now
        await crearUsuario(payload)
        toast.success('Usuario creado correctamente')
      }

      setmodalAbierto(false)
      setconfirmacionCrearAbierta(false)
      await fetchData()
    } catch (err) {
      console.error('Error guardando:', err)
      setconfirmacionCrearAbierta(false)
      
      if (err.response?.data) {
        seterroresServidor(err.response.data)
        if (typeof err.response.data === 'string' || Object.keys(err.response.data).length === 0) {
          toast.danger('Error al guardar: verifique los datos ingresados.')
        } else {
          toast.danger('Corrige los errores marcados en el formulario')
        }
      } else {
        toast.danger('Error al guardar el usuario')
      }
    } finally {
      setenviando(false)
    }
  }

  /* ─── eliminar ─── */
  const handleDelete = async () => {
    if (!registroBorrando) return
    setenviando(true)
    try {
      await eliminarUsuario(registroBorrando.id_usuario)
      toast.success('Usuario eliminado')
      setDeletemodalAbierto(false)
      setregistroBorrando(null)
      await fetchData()
    } catch (err) {
      console.error('Error eliminando:', err)
      toast.danger('Error al eliminar el usuario')
    } finally {
      setenviando(false)
    }
  }

  /* ─── helpers ─── */
  const getRolNombre = (id) => {
    const rol = roles.find((r) => r.id_rol === id)
    return rol ? rol.nombre : `ID: ${id}`
  }

  /* ─── paginación ─── */
  const getPageNumbers = () => {
    const pages = []

    if (paginasTotales <= 7) {
      for (let i = 1; i <= paginasTotales; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)

      if (paginaActual > 3) {
        pages.push('ellipsis')
      }

      const start = Math.max(2, paginaActual - 1)
      const end = Math.min(paginasTotales - 1, paginaActual + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (paginaActual < paginasTotales - 2) {
        pages.push('ellipsis')
      }

      pages.push(paginasTotales)
    }

    return pages
  }

  const startItem = registrosFiltrados.length === 0 ? 0 : (paginaActual - 1) * FILAS_POR_PAGINA + 1
  const endItem = Math.min(paginaActual * FILAS_POR_PAGINA, registrosFiltrados.length)

  /* ─── render ─── */
  return (
    <div className="flex flex-col gap-6 pl-8 pr-4 pt-3">
      {/* ─── Header ─── */}
      <div className="flex justify-between items-end shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {verSolicitudes ? 'Solicitudes de Aprobación' : 'Usuarios'}
          </h2>
          <p className="text-muted text-sm">
            {verSolicitudes
              ? `Usuarios pendientes de aprobación (${registrosFiltrados.length} pendientes)`
              : `Administra los usuarios del sistema (${registrosFiltrados.length} registros)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onPress={() => { setVerSolicitudes(!verSolicitudes); setPaginaActual(1) }}
            size="lg"
            variant={verSolicitudes ? 'solid' : 'outline'}
            className="font-semibold"
          >
            {verSolicitudes ? <SquareMinus /> : <SquareExclamation />}
            {verSolicitudes ? 'Ver todos' : 'Ver solicitudes'}
          </Button>
          {!verSolicitudes && (
            <Button
              onPress={handleCreate}
              size="lg"
              className="font-semibold shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus />
              Registrar
            </Button>
          )}
        </div>
      </div>

      {/* ─── Tabla ─── */}
      <div className="flex-1 flex flex-col">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label={verSolicitudes ? "Tabla de solicitudes" : "Tabla de usuarios"}>
              <Table.Header>
                <Table.Column isRowHeader>ID</Table.Column>
                <Table.Column>Nombre</Table.Column>
                <Table.Column>Correo</Table.Column>
                <Table.Column>Rol</Table.Column>
                <Table.Column>Estatus</Table.Column>
                <Table.Column className="flex justify-end">Acciones</Table.Column>
              </Table.Header>
              <Table.Body
                items={registrosPaginados}
                renderEmptyState={() => (
                  <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                    {cargando ? <Spinner color="current" size="sm" /> : verSolicitudes ? 'No hay solicitudes pendientes.' : 'No se encontraron resultados.'}
                  </div>
                )}
              >
                {(item) => (
                  <Table.Row id={item.id_usuario}>
                    <Table.Cell>{item.id_usuario}</Table.Cell>
                    <Table.Cell>
                      <span className="font-medium">{item.nombre} {item.apellidos}</span>
                    </Table.Cell>
                    <Table.Cell>{item.correo}</Table.Cell>
                    <Table.Cell>
                      <Chip color="accent" variant="soft" className="font-medium text-xs px-3 py-1">
                        {getRolNombre(item.id_rol)}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell>
                      {item.estatus === 'pendiente' ? (
                        <Chip color="warning" variant="soft" className="font-medium text-xs px-3 py-1">
                          <SquareExclamation className="size-3" />
                          Pendiente
                        </Chip>
                      ) : (
                        <Switch
                          isSelected={item.estatus === 'activo'}
                          onChange={() => handleToggleEstatus(item)}
                          size="sm"
                        >
                          <Switch.Content>
                            {item.estatus === 'activo' ? 'Activo' : 'Inactivo'}
                          </Switch.Content>
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch>
                      )}
                    </Table.Cell>
                    <Table.Cell className="flex justify-end">
                      <div className="flex gap-1">
                        <Button variant="ghost" isIconOnly size="sm" onPress={() => handleViewDetail(item)} aria-label="Ver detalles">
                          <Eye />
                        </Button>
                        {verSolicitudes ? (
                          <Button variant="ghost" isIconOnly size="sm" onPress={() => handleAprobar(item)} aria-label="Aprobar" className="text-success">
                            <Check />
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" isIconOnly size="sm" onPress={() => handleEdit(item)} aria-label="Editar">
                              <Pencil />
                            </Button>
                            <Button variant="ghost" isIconOnly size="sm" onPress={() => handleDeleteConfirm(item)} aria-label="Eliminar">
                              <TrashBin />
                            </Button>
                          </>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>

          {paginasTotales > 1 && (
            <Table.Footer>
              <div className="flex justify-end w-full">
                <Pagination aria-label="Navegación de páginas">
                  <Pagination.Summary>Mostrando {startItem}-{endItem} de {registrosFiltrados.length} resultados</Pagination.Summary>
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous isDisabled={paginaActual === 1} onPress={() => setPaginaActual((p) => p - 1)}>
                        <Pagination.PreviousIcon /><span>Anterior</span>
                      </Pagination.Previous>
                    </Pagination.Item>
                    {getPageNumbers().map((p, i) =>
                      p === 'ellipsis' ? (
                        <Pagination.Item key={`ellipsis-${i}`}><Pagination.Ellipsis /></Pagination.Item>
                      ) : (
                        <Pagination.Item key={p}>
                          <Pagination.Link isActive={p === paginaActual} onPress={() => setPaginaActual(p)}>{p}</Pagination.Link>
                        </Pagination.Item>
                      )
                    )}
                    <Pagination.Item>
                      <Pagination.Next isDisabled={paginaActual === paginasTotales} onPress={() => setPaginaActual((p) => p + 1)}>
                        <span>Siguiente</span><Pagination.NextIcon />
                      </Pagination.Next>
                    </Pagination.Item>
                  </Pagination.Content>
                </Pagination>
              </div>
            </Table.Footer>
          )}
        </Table>
      </div>

      {/* -- Drawer Crear/Editar -- */}
      <Drawer
        isOpen={modalAbierto}
        onOpenChange={setmodalAbierto}
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
                      {formCargando ? (
                        <></>
                      ) : registroEnEdicion ? (
                        <>
                          <div className="flex flex-col gap-2">
                            <h3>
                              Actualizar usuario
                            </h3>
                            <p className="text-sm text-muted">
                              Actualice la información del usuario y guarde los
                              cambios
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-semibold">
                              Registrar usuario
                            </h3>
                            <p className="text-sm text-muted">
                              Registre la información correspondiente del
                              usuario para guardarlo
                            </p>
                          </div>
                        </>
                      )}
                    </Drawer.Heading>
                  </Drawer.Header>

                  <Drawer.Body className="flex flex-col relative no-scrollbar">
                    {formCargando ? (
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
                              (intentadoEnviar && !form.nombre.trim()) ||
                              !!erroresServidor.nombre
                            }
                          >
                            <Label>Nombre</Label>
                            <Input
                              placeholder="Nombre"
                              value={form.nombre}
                              onChange={handleFormChange}
                            />
                            {erroresServidor.nombre ? (
                              <FieldError>
                                {erroresServidor.nombre[0]}
                              </FieldError>
                            ) : (
                              intentadoEnviar &&
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
                            isInvalid={!!erroresServidor.apellidos}
                          >
                            <Label>Apellidos</Label>
                            <Input
                              placeholder="Apellidos"
                              value={form.apellidos}
                              onChange={handleFormChange}
                            />
                            {erroresServidor.apellidos && (
                              <FieldError>
                                {erroresServidor.apellidos[0]}
                              </FieldError>
                            )}
                          </TextField>
                        </div>
                        <TextField
                          name="correo"
                          aria-label="Correo electrónico del usuario"
                          isRequired
                          fullWidth
                          variant="secondary"
                          isInvalid={
                            (intentadoEnviar &&
                              (!form.correo.trim() ||
                                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                                  form.correo,
                                ))) ||
                            !!erroresServidor.correo
                          }
                        >
                          <Label>Correo electrónico</Label>
                          <Input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={form.correo}
                            onChange={handleFormChange}
                          />
                          {erroresServidor.correo ? (
                            <FieldError>{erroresServidor.correo[0]}</FieldError>
                          ) : (
                            intentadoEnviar &&
                            (!form.correo.trim() ||
                              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                                form.correo,
                              )) && (
                              <FieldError>
                                Ingresa un formato de correo electrónico válido.
                              </FieldError>
                            )
                          )}
                        </TextField>

                        {!registroEnEdicion && (
                          <TextField
                            name="contrasena"
                            aria-label="Contraseña del usuario"
                            isRequired
                            fullWidth
                            variant="secondary"
                            isInvalid={
                              (intentadoEnviar &&
                                !registroEnEdicion &&
                                !form.contrasena.trim()) ||
                              !!erroresServidor.contrasena
                            }
                          >
                            <Label>Contraseña</Label>
                            <div className="relative flex items-center">
                              <Input
                                name="contrasena"
                                type={mostrarContrasena ? "text" : "password"}
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
                                  setmostrarContrasena(!mostrarContrasena)
                                }
                                aria-label={
                                  mostrarContrasena ? "Ocultar" : "Mostrar"
                                }
                              >
                                {mostrarContrasena ? <EyeSlash /> : <Eye />}
                              </Button>
                            </div>
                            {erroresServidor.contrasena ? (
                              <FieldError>
                                {erroresServidor.contrasena[0]}
                              </FieldError>
                            ) : (
                              intentadoEnviar &&
                              !registroEnEdicion &&
                              !form.contrasena.trim() && (
                                <FieldError>
                                  La contraseña es obligatoria.
                                </FieldError>
                              )
                            )}
                          </TextField>
                        )}

                        <DatePicker
                          aria-label="Fecha de nacimiento"
                          isRequired
                          granularity="day"
                          isInvalid={
                            (intentadoEnviar && !form.fecha_nacimiento) ||
                            !!erroresServidor.fecha_nacimiento
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
                              ? formatearFechaLegible(form.fecha_nacimiento)
                              : "Selecciona una fecha"}
                          </Description>
                          <DatePicker.Popover>
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
                          {erroresServidor.fecha_nacimiento ? (
                            <FieldError>
                              {erroresServidor.fecha_nacimiento[0]}
                            </FieldError>
                          ) : (
                            intentadoEnviar &&
                            !form.fecha_nacimiento && (
                              <FieldError>
                                La fecha de nacimiento es obligatoria.
                              </FieldError>
                            )
                          )}
                        </DatePicker>

                        <div className="flex flex-col gap-1 w-full">
                          <Label isRequired>Rol</Label>
                          <Autocomplete
                            aria-label="Rol del usuario"
                            isRequired
                            value={form.id_rol ? String(form.id_rol) : null}
                            onChange={(val) => {
                              setForm({ ...form, id_rol: val });
                              if (erroresServidor.id_rol) {
                                seterroresServidor((prev) => {
                                  const nuevo = { ...prev };
                                  delete nuevo.id_rol;
                                  return nuevo;
                                });
                              }
                            }}
                            variant="secondary"
                            isInvalid={
                              (intentadoEnviar && !form.id_rol) ||
                              !!erroresServidor.id_rol
                            }
                          >
                            <Autocomplete.Trigger>
                              <Autocomplete.Value placeholder="Buscar rol..." />
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
                                  {roles.map((rol) => (
                                    <ListBox.Item
                                      id={String(rol.id_rol)}
                                      key={String(rol.id_rol)}
                                      textValue={rol.nombre}
                                    >
                                      {rol.nombre}
                                    </ListBox.Item>
                                  ))}
                                </ListBox>
                              </Autocomplete.Filter>
                            </Autocomplete.Popover>
                          </Autocomplete>
                          {erroresServidor.id_rol ? (
                            <FieldError className="text-danger-500 text-xs">
                              {erroresServidor.id_rol[0]}
                            </FieldError>
                          ) : (
                            intentadoEnviar &&
                            !form.id_rol && (
                              <FieldError className="text-danger-500 text-xs">
                                Selecciona un rol de la lista.
                              </FieldError>
                            )
                          )}
                        </div>
                        {registroEnEdicion && (
                          <div className="flex justify-between">
                            <Label className="text-sm font-medium">
                              Estado de la cuenta:
                            </Label>

                            <Chip
                              color={
                                registroEnEdicion.estatus === "activo"
                                  ? "accent"
                                  : registroEnEdicion.estatus === "inactivo"
                                    ? "default"
                                    : "warning"
                              }
                              variant="soft"
                            >
                              {registroEnEdicion.estatus === "activo" ? (
                                <SquareCheck />
                              ) : registroEnEdicion.estatus === "inactivo" ? (
                                <SquareMinus />
                              ) : (
                                <SquareExclamation />
                              )}
                              <Chip.Label className="uppercase font-semibold">
                                {registroEnEdicion.estatus || "no definido"}
                              </Chip.Label>
                            </Chip>
                          </div>
                        )}
                      </div>
                    )}
                  </Drawer.Body>

                  <Drawer.Footer>
                    {formCargando ? (
                      <></>
                    ) : (
                      <>
                        {registroEnEdicion?.estatus === "pendiente" && (
                          <Button
                            onPress={() => handleAprobar(registroEnEdicion)}
                            isPending={enviando}
                            isDisabled={enviando}
                            className="bg-success text-success-foreground"
                          >
                            <SquareCheck />
                            Aprobar
                          </Button>
                        )}
                        <Button
                          color="primary"
                          onPress={handleSave}
                          isPending={enviando}
                          isDisabled={enviando}
                          className="font-semibold"
                        >
                          {({ isPending }) => (
                            <>
                              {isPending ? (
                                <Spinner color="current" size="sm" />
                              ) : registroEnEdicion ? (
                                <PencilToSquare />
                              ) : null}
                              {isPending
                                ? "Guardando..."
                                : registroEnEdicion
                                  ? "Actualizar"
                                  : "Continuar"}
                              {!registroEnEdicion && <ChevronRight />}
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

      {/* ─── Modal de confirmación de creación ─── */}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={confirmacionCrearAbierta}
          onOpenChange={setconfirmacionCrearAbierta}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de registro de usuario">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div>
                      <ContenedorIcono tamano="md">
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
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="confirmacion-creacion"
                        aria-label="Confirmar veracidad de datos"
                        isSelected={creacionConfirmada}
                        onChange={setcreacionConfirmada}
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
                      isPending={enviando}
                      isDisabled={enviando || !creacionConfirmada}
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

      {/* ─── Modal confirmación eliminar ─── */}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={deletemodalAbierto}
          onOpenChange={setDeletemodalAbierto}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de eliminación de usuario">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div>
                      <ContenedorIcono tamano="md" color="danger">
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
                        &ldquo;{registroBorrando?.nombre}{" "}
                        {registroBorrando?.apellidos}&rdquo;
                      </span>
                      . Esta acción no se puede deshacer. ¿Desea continuar?
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        isSelected={eliminacionConfirmada}
                        onChange={seteliminacionConfirmada}
                      >
                        <Checkbox.Content>
                          <Label htmlFor="confirmacion-eliminacion">
                            Confirmo que deseo eliminar este usuario
                            permanentemente del sistema.
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
                      variant="danger"
                      onPress={handleDelete}
                      isPending={enviando}
                      isDisabled={enviando || !eliminacionConfirmada}
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

      {/* ─── Modal confirmación aprobar ─── */}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={confirmacionAprobarAbierta}
          onOpenChange={setconfirmacionAprobarAbierta}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de aprobación de usuario">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div>
                      <ContenedorIcono tamano="md" color="success">
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
                        &ldquo;{registroEnEdicion?.nombre}{" "}
                        {registroEnEdicion?.apellidos}&rdquo;
                      </span>
                      . El usuario podrá acceder al sistema y crear eventos. ¿Desea continuar?
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        isSelected={aprobacionConfirmada}
                        onChange={setaprobacionConfirmada}
                      >
                        <Checkbox.Content>
                          <Label htmlFor="confirmacion-aprobacion">
                            Confirmo que deseo aprobar a este usuario y activar su cuenta en el sistema.
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
                      onPress={() => {
                        // Execute approval API call directly
                        if (registroEnEdicion) {
                          aprobarUsuario(registroEnEdicion.id_usuario)
                            .then(() => {
                              toast.success('Usuario aprobado correctamente')
                              setmodalAbierto(false)
                              fetchData()
                            })
                            .catch(() => {
                              toast.error('No se pudo aprobar el usuario')
                            })
                        }
                        close()
                      }}
                      isPending={enviando}
                      isDisabled={enviando || !aprobacionConfirmada}
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

      {/* ─── Drawer Ver Detalles ─── */}
      <Drawer
        isOpen={detailmodalAbierto}
        onOpenChange={setDetailmodalAbierto}
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
                      {detailcargando ? (
                        <></>
                      ) : registroDetalle ? (
                        <>
                          <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-semibold">
                              Detalles del Usuario
                            </h3>
                            <p className="text-sm text-muted">
                              Información completa del usuario registrado
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-semibold">
                              Detalles del Usuario
                            </h3>
                          </div>
                        </>
                      )}
                    </Drawer.Heading>
                  </Drawer.Header>
                  <Drawer.Body className="flex flex-col relative no-scrollbar">
                    {detailcargando ? (
                      <div className="flex justify-center items-center py-20 flex-1">
                        <Spinner color="current" size="sm" />
                      </div>
                    ) : (
                      registroDetalle && (
                        <div className="flex flex-col gap-5 w-full pt-6 pb-6">
                          {/* Estado de la cuenta - Chip igual que en drawer de edición */}
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-medium text-foreground">
                              Estado de la cuenta:
                            </p>
                            <Chip
                              color={
                                registroDetalle.estatus === "activo"
                                  ? "accent"
                                  : registroDetalle.estatus === "pendiente"
                                    ? "warning"
                                    : "default"
                              }
                              variant="soft"
                            >
                              {registroDetalle.estatus === "activo" ? (
                                <SquareCheck />
                              ) : registroDetalle.estatus === "pendiente" ? (
                                <SquareExclamation />
                              ) : (
                                <SquareMinus />
                              )}
                              <Chip.Label className="uppercase font-semibold">
                                {registroDetalle.estatus || "no definido"}
                              </Chip.Label>
                            </Chip>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-sm text-muted-foreground">
                              Nombre completo
                            </Label>
                            <span className="text-sm font-medium">
                              {registroDetalle.nombre}
                              {registroDetalle.apellidos
                                ? ` - ${registroDetalle.apellidos}`
                                : "—"}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm text-muted-foreground">
                              Correo electrónico
                            </Label>
                            <span className="text-sm">
                              {registroDetalle.correo}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm text-muted-foreground">
                              Rol
                            </Label>
                            <span className="text-sm font-medium">
                              {getRolNombre(registroDetalle.id_rol)}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-sm text-muted-foreground">
                              Fecha de creación
                            </Label>
                            <span className="text-sm">
                              {registroDetalle.fecha_creacion
                                ? formatearFechaLegible(
                                    registroDetalle.fecha_creacion,
                                  )
                                : "—"}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-sm text-muted-foreground">
                              Última actualización
                            </Label>
                            <span className="text-sm">
                              {registroDetalle.fecha_actualizacion
                                ? formatearFechaLegible(
                                    registroDetalle.fecha_actualizacion,
                                  )
                                : "—"}
                            </span>
                          </div>

                          {/* Fecha de Nacimiento con Calendar read-only */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm text-muted-foreground">
                              Fecha de Nacimiento
                            </Label>
                            {registroDetalle.fecha_nacimiento && (
                              <div className="flex flex-col gap-2">
                                <Calendar
                                  isReadOnly
                                  aria-label="Fecha de nacimiento"
                                  value={parseCalendarDate(
                                    registroDetalle.fecha_nacimiento,
                                  )}
                                  className="w-full"
                                >
                                  <Calendar.Header>
                                    <Calendar.Heading />
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
                                </Calendar>
                                <Description className="text-xs text-muted">
                                  {formatearFechaLegible(
                                    registroDetalle.fecha_nacimiento,
                                  )}
                                </Description>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </Drawer.Body>
                  <Drawer.Footer>
                    {detailcargando ? (
                      <></>
                    ) : (
                      <>
                        <Button variant="outline" onPress={close}>
                          Cerrar
                        </Button>
                        <Button
                          onPress={() => {
                            setDetailmodalAbierto(false);
                            handleEdit(registroDetalle);
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
