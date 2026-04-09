import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Button,
  Card,
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
  Description,
} from '@heroui/react'
import { Eye, Pencil, Plus, TrashBin, PencilToSquare, ChevronRight, CircleCheck, CircleXmark } from '@gravity-ui/icons'
import ContenedorIcono from '../components/ContenedorIcono'
import { usarAutenticacion } from '../hooks/usarAutenticacion'
import {
  obtenerLugares,
  obtenerTodosLosLugares,
  obtenerLugar,
  crearLugar,
  actualizarLugar,
  desactivarLugar,
  reactivarLugar,
} from '../services/lugares.api'

/* ─── constantes ─── */
const FILAS_POR_PAGINA = 10

const FORMULARIO_VACIO = {
  nombre: '',
  ciudad: '',
  pais: '',
  direccion: '',
  estatus: 'BORRADOR',
}

const COLOR_ESTATUS = {
  BORRADOR: 'warning',
  PUBLICADO: 'success',
  INHABILITADO: 'default',
}

const range = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i)

const formatearFechaLegible = (fechaString) => {
  if (!fechaString) return null
  const esDatetime = fechaString.includes('T')
  const fechaConHora = esDatetime ? fechaString : fechaString + 'T12:00:00'
  const fecha = new Date(fechaConHora)
  const opciones = esDatetime
    ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' }
  return fecha.toLocaleDateString('es-MX', opciones)
}

/* ─── componente principal ─── */
export default function PaginaLugares() {
  const { usuario } = usarAutenticacion()
  const navigate = useNavigate()

  /* ─── datos ─── */
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)

  /* ─── paginación ─── */
  const [paginaActual, setPaginaActual] = useState(1)

  /* ─── contexto del layout global ─── */
  const contextoGlobal = useOutletContext()
  const busquedaGlobal = contextoGlobal?.busquedaGlobal || ''

  useEffect(() => { setPaginaActual(1) }, [busquedaGlobal])

  /* ─── modales ─── */
  const [modalAbierto, setModalAbierto] = useState(false)
  const [deleteModalAbierto, setDeleteModalAbierto] = useState(false)
  const [detailModalAbierto, setDetailModalAbierto] = useState(false)
  const [confirmacionCrearAbierta, setConfirmacionCrearAbierta] = useState(false)

  /* ─── edición / eliminación ─── */
  const [registroEnEdicion, setRegistroEnEdicion] = useState(null)
  const [registroBorrando, setRegistroBorrando] = useState(null)
  const [registroDetalle, setRegistroDetalle] = useState(null)

  /* ─── formulario ─── */
  const [enviando, setEnviando] = useState(false)
  const [formCargando, setFormCargando] = useState(false)
  const [detailCargando, setDetailCargando] = useState(false)
  const [form, setForm] = useState({ ...FORMULARIO_VACIO })
  const [intentadoEnviar, setIntentadoEnviar] = useState(false)
  const [erroresServidor, setErroresServidor] = useState({})
  const [creacionConfirmada, setCreacionConfirmada] = useState(false)
  const [eliminacionConfirmada, setEliminacionConfirmada] = useState(false)

  /* ─── fetch ─── */
  const fetchData = async () => {
    setCargando(true)
    try {
      const data = await obtenerTodosLosLugares()
      setRegistros(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error cargando datos:', err)
      toast.danger('Error al cargar los datos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  /* ─── datos filtrados y paginados ─── */
  const registrosFiltrados = useMemo(() => {
    const q = busquedaGlobal.toLowerCase()
    if (!q) return registros
    return registros.filter((it) =>
      it.nombre?.toLowerCase().includes(q) ||
      it.ciudad?.toLowerCase().includes(q) ||
      it.pais?.toLowerCase().includes(q) ||
      it.direccion?.toLowerCase().includes(q) ||
      it.id_lugar?.toString().includes(q)
    )
  }, [registros, busquedaGlobal])

  const paginasTotales = Math.max(1, Math.ceil(registrosFiltrados.length / FILAS_POR_PAGINA))
  const registrosPaginados = useMemo(() => {
    const start = (paginaActual - 1) * FILAS_POR_PAGINA
    return registrosFiltrados.slice(start, start + FILAS_POR_PAGINA)
  }, [registrosFiltrados, paginaActual])

  /* ─── abrir modal crear ─── */
  const handleCreate = () => {
    setFormCargando(true)
    setRegistroEnEdicion(null)
    setForm({ ...FORMULARIO_VACIO })
    setIntentadoEnviar(false)
    setErroresServidor({})
    setModalAbierto(true)
    setTimeout(() => setFormCargando(false), 400)
  }

  /* ─── abrir modal editar ─── */
  const handleEdit = async (item) => {
    setFormCargando(true)
    setRegistroEnEdicion(null)
    setIntentadoEnviar(false)
    setErroresServidor({})
    setModalAbierto(true)
    try {
      const data = await obtenerLugar(item.id_lugar)
      setForm({
        nombre: data.nombre || '',
        ciudad: data.ciudad || '',
        pais: data.pais || '',
        direccion: data.direccion || '',
        estatus: data.estatus || 'BORRADOR',
      })
      setRegistroEnEdicion(data)
    } catch (err) {
      console.error('Error al consultar datos:', err)
      toast.danger('No se pudo cargar la información del lugar')
      setModalAbierto(false)
    } finally {
      setFormCargando(false)
    }
  }

  /* ─── ver detalles ─── */
  const handleViewDetail = async (item) => {
    setRegistroDetalle(null)
    setDetailModalAbierto(true)
    setDetailCargando(true)
    try {
      const data = await obtenerLugar(item.id_lugar)
      setRegistroDetalle(data)
    } catch (err) {
      console.error('Error obteniendo detalles:', err)
      toast.danger('Error al obtener los detalles del lugar')
      setDetailModalAbierto(false)
    } finally {
      setDetailCargando(false)
    }
  }

  /* ─── abrir confirmación de eliminar ─── */
  const handleDeleteConfirm = (item) => {
    setRegistroBorrando(item)
    setEliminacionConfirmada(false)
    setDeleteModalAbierto(true)
  }

  /* ─── cambio de campo ─── */
  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (erroresServidor[e.target.name]) {
      setErroresServidor((prev) => {
        const nuevo = { ...prev }
        delete nuevo[e.target.name]
        return nuevo
      })
    }
  }

  /* ─── guardar (crear o actualizar) ─── */
  const handleSave = async () => {
    setIntentadoEnviar(true)
    if (!form.nombre.trim()) { toast.danger('El nombre es obligatorio'); return }
    if (!form.ciudad.trim()) { toast.danger('La ciudad es obligatoria'); return }
    if (!form.pais.trim()) { toast.danger('El país es obligatorio'); return }
    if (!form.direccion.trim()) { toast.danger('La dirección es obligatoria'); return }

    if (!registroEnEdicion) {
      setCreacionConfirmada(false)
      setConfirmacionCrearAbierta(true)
      return
    }
    await executeSubmit()
  }

  const executeSubmit = async () => {
    setEnviando(true)
    try {
      const now = new Date().toISOString()
      const payload = {
        nombre: form.nombre,
        ciudad: form.ciudad,
        pais: form.pais,
        direccion: form.direccion,
        estatus: form.estatus || 'BORRADOR',
        id_dueno: usuario?.id_usuario || usuario?.id,
      }

      if (registroEnEdicion) {
        await actualizarLugar(registroEnEdicion.id_lugar, payload)
        toast.success('Lugar actualizado correctamente')
      } else {
        payload.fecha_creacion = now
        payload.fecha_actualizacion = now
        await crearLugar(payload)
        toast.success('Lugar creado correctamente')
      }

      setModalAbierto(false)
      setConfirmacionCrearAbierta(false)
      await fetchData()
    } catch (err) {
      console.error('Error guardando:', err)
      setConfirmacionCrearAbierta(false)
      if (err.response?.data) {
        setErroresServidor(err.response.data)
        toast.danger('Corrige los errores marcados en el formulario')
      } else {
        toast.danger('Error al guardar el lugar')
      }
    } finally {
      setEnviando(false)
    }
  }

  /* ─── eliminar (desactivar) ─── */
  const handleDelete = async () => {
    if (!registroBorrando) return
    setEnviando(true)
    try {
      await desactivarLugar(registroBorrando.id_lugar)
      toast.success('Lugar inhabilitado correctamente')
      setDeleteModalAbierto(false)
      setRegistroBorrando(null)
      await fetchData()
    } catch (err) {
      console.error('Error inhabilitando:', err)
      toast.danger('Error al inhabilitar el lugar')
    } finally {
      setEnviando(false)
    }
  }

  /* ─── reactivar ─── */
  const handleReactivar = async (item) => {
    try {
      await reactivarLugar(item.id_lugar)
      toast.success('Lugar reactivado correctamente')
      await fetchData()
    } catch {
      toast.danger('Error al reactivar el lugar')
    }
  }

  /* ─── paginación ─── */
  const getPageNumbers = () => {
    if (paginasTotales <= 5) return range(1, paginasTotales)
    if (paginaActual <= 3) return [1, 2, 3, 4, 'ellipsis', paginasTotales]
    if (paginaActual >= paginasTotales - 2) return [1, 'ellipsis', paginasTotales - 3, paginasTotales - 2, paginasTotales - 1, paginasTotales]
    return [1, 'ellipsis', paginaActual - 1, paginaActual, paginaActual + 1, 'ellipsis', paginasTotales]
  }

  const startItem = registrosFiltrados.length === 0 ? 0 : (paginaActual - 1) * FILAS_POR_PAGINA + 1
  const endItem = Math.min(paginaActual * FILAS_POR_PAGINA, registrosFiltrados.length)

  /* ─── render ─── */
  return (
    <div className="flex flex-col gap-6 pl-8 pr-4 pt-3">
      {/* ─── Header ─── */}
      <div className="flex justify-between items-end shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Lugares</h2>
          <p className="text-muted text-sm">
            Administra los lugares del sistema ({registrosFiltrados.length} registros)
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
            <Table.Content aria-label="Tabla de lugares">
              <Table.Header>
                <Table.Column isRowHeader>ID</Table.Column>
                <Table.Column>Nombre</Table.Column>
                <Table.Column>Ciudad</Table.Column>
                <Table.Column>País</Table.Column>
                <Table.Column>Estatus</Table.Column>
                <Table.Column className="flex justify-end">Acciones</Table.Column>
              </Table.Header>
              <Table.Body
                items={registrosPaginados}
                renderEmptyState={() => (
                  <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                    {cargando ? <Spinner color="current" size="sm" /> : 'No se encontraron resultados.'}
                  </div>
                )}
              >
                {(item) => (
                  <Table.Row id={item.id_lugar}>
                    <Table.Cell>{item.id_lugar}</Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.nombre}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{item.direccion}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>{item.ciudad}</Table.Cell>
                    <Table.Cell>{item.pais}</Table.Cell>
                    <Table.Cell>
                      <Chip color={COLOR_ESTATUS[item.estatus] || 'default'} variant="soft" className="font-medium text-xs px-3 py-1">
                        {item.estatus || 'BORRADOR'}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell className="flex justify-end">
                      <div className="flex gap-1">
                        <Button variant="ghost" isIconOnly size="sm" onPress={() => handleViewDetail(item)} aria-label="Ver detalles">
                          <Eye />
                        </Button>
                        <Button variant="ghost" isIconOnly size="sm" onPress={() => handleEdit(item)} aria-label="Editar">
                          <Pencil />
                        </Button>
                        {item.estatus === 'INHABILITADO' ? (
                          <Button variant="ghost" isIconOnly size="sm" onPress={() => handleReactivar(item)} aria-label="Reactivar">
                            <CircleCheck />
                          </Button>
                        ) : (
                          <Button variant="ghost" isIconOnly size="sm" onPress={() => handleDeleteConfirm(item)} aria-label="Inhabilitar">
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

      {/* ─── Drawer Crear/Editar ─── */}
      <Drawer isOpen={modalAbierto} onOpenChange={setModalAbierto} aria-label="Formulario de lugar">
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog>
              {({ close }) => (
                <>
                  <Drawer.CloseTrigger />
                  <Drawer.Header>
                    <Drawer.Heading className="flex items-center gap-3">
                      {formCargando ? <></> : (
                        <div className="flex flex-col gap-2">
                          <h3 className="text-xl font-semibold">{registroEnEdicion ? 'Actualizar lugar' : 'Registrar lugar'}</h3>
                          <p className="text-sm text-muted">{registroEnEdicion ? 'Actualice la información del lugar y guarde los cambios' : 'Registre la información correspondiente del lugar'}</p>
                        </div>
                      )}
                    </Drawer.Heading>
                  </Drawer.Header>

                  <Drawer.Body className="flex flex-col relative no-scrollbar">
                    {formCargando ? (
                      <div className="flex justify-center items-center py-20 flex-1"><Spinner color="current" size="sm" /></div>
                    ) : (
                      <div className="flex flex-col gap-5 w-full pt-6 pb-6">
                        <TextField name="nombre" aria-label="Nombre del lugar" isRequired fullWidth variant="secondary" isInvalid={(intentadoEnviar && !form.nombre.trim()) || !!erroresServidor.nombre}>
                          <Label>Nombre</Label>
                          <Input placeholder="Nombre del lugar" value={form.nombre} onChange={handleFormChange} />
                          {erroresServidor.nombre ? <FieldError>{erroresServidor.nombre[0]}</FieldError> : intentadoEnviar && !form.nombre.trim() && <FieldError>El nombre es obligatorio.</FieldError>}
                        </TextField>

                        <div className="flex gap-3">
                          <TextField name="ciudad" aria-label="Ciudad" isRequired fullWidth variant="secondary" isInvalid={(intentadoEnviar && !form.ciudad.trim()) || !!erroresServidor.ciudad}>
                            <Label>Ciudad</Label>
                            <Input placeholder="Ciudad" value={form.ciudad} onChange={handleFormChange} />
                            {erroresServidor.ciudad ? <FieldError>{erroresServidor.ciudad[0]}</FieldError> : intentadoEnviar && !form.ciudad.trim() && <FieldError>La ciudad es obligatoria.</FieldError>}
                          </TextField>

                          <TextField name="pais" aria-label="País" isRequired fullWidth variant="secondary" isInvalid={(intentadoEnviar && !form.pais.trim()) || !!erroresServidor.pais}>
                            <Label>País</Label>
                            <Input placeholder="País" value={form.pais} onChange={handleFormChange} />
                            {erroresServidor.pais ? <FieldError>{erroresServidor.pais[0]}</FieldError> : intentadoEnviar && !form.pais.trim() && <FieldError>El país es obligatorio.</FieldError>}
                          </TextField>
                        </div>

                        <TextField name="direccion" aria-label="Dirección" isRequired fullWidth variant="secondary" isInvalid={(intentadoEnviar && !form.direccion.trim()) || !!erroresServidor.direccion}>
                          <Label>Dirección</Label>
                          <Input placeholder="Dirección completa" value={form.direccion} onChange={handleFormChange} />
                          {erroresServidor.direccion ? <FieldError>{erroresServidor.direccion[0]}</FieldError> : intentadoEnviar && !form.direccion.trim() && <FieldError>La dirección es obligatoria.</FieldError>}
                        </TextField>

                        <div className="flex flex-col gap-1 w-full">
                          <Label>Estatus</Label>
                          <div className="flex gap-2">
                            {['BORRADOR', 'PUBLICADO', 'INHABILITADO'].map((est) => (
                              <button
                                key={est}
                                type="button"
                                onClick={() => setForm({ ...form, estatus: est })}
                                className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                                  form.estatus === est
                                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30'
                                    : 'border-default-300 hover:bg-default-100'
                                }`}
                              >
                                {est}
                              </button>
                            ))}
                          </div>
                        </div>

                        {registroEnEdicion && (
                          <div className="flex justify-between">
                            <Label className="text-sm font-medium">Estado actual:</Label>
                            <Chip color={COLOR_ESTATUS[registroEnEdicion.estatus] || 'default'} variant="soft">
                              <Chip.Label className="uppercase font-semibold">{registroEnEdicion.estatus || 'no definido'}</Chip.Label>
                            </Chip>
                          </div>
                        )}
                      </div>
                    )}
                  </Drawer.Body>

                  <Drawer.Footer>
                    {formCargando ? <></> : (
                      <>
                        <Button color="primary" onPress={handleSave} isPending={enviando} isDisabled={enviando} className="font-semibold">
                          {({ isPending }) => (
                            <>
                              {isPending ? <Spinner color="current" size="sm" /> : registroEnEdicion && <PencilToSquare />}
                              {isPending ? 'Guardando...' : registroEnEdicion ? 'Actualizar' : 'Continuar'}
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
        <AlertDialog.Backdrop isOpen={confirmacionCrearAbierta} onOpenChange={setConfirmacionCrearAbierta}>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de registro de lugar">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div><ContenedorIcono tamano="md"><Plus className="size-6 text-accent" /></ContenedorIcono></div>
                    <AlertDialog.Heading className="flex items-center gap-3"><h3>¿Registrar lugar?</h3></AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">Está a punto de registrar un nuevo lugar. ¿Desea continuar?</p>
                    <div className="flex items-center gap-3">
                      <Checkbox id="confirmacion-creacion-lugar" aria-label="Confirmar" isSelected={creacionConfirmada} onChange={setCreacionConfirmada}>
                        <Checkbox.Content><Label htmlFor="confirmacion-creacion-lugar">Confirmo que los datos son correctos.</Label></Checkbox.Content>
                        <Checkbox.Control className="border border-border"><Checkbox.Indicator /></Checkbox.Control>
                      </Checkbox>
                    </div>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="outline" onPress={close}>Cancelar</Button>
                    <Button color="primary" onPress={executeSubmit} isPending={enviando} isDisabled={enviando || !creacionConfirmada}>
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

      {/* ─── Modal confirmación inhabilitar ─── */}
      <AlertDialog>
        <AlertDialog.Backdrop isOpen={deleteModalAbierto} onOpenChange={setDeleteModalAbierto}>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de inhabilitación">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div><ContenedorIcono tamano="md" color="danger"><TrashBin className="size-6 text-danger" /></ContenedorIcono></div>
                    <AlertDialog.Heading className="flex items-center gap-3"><h3>¿Inhabilitar lugar?</h3></AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de inhabilitar el lugar <span className="font-bold">&ldquo;{registroBorrando?.nombre}&rdquo;</span>. ¿Desea continuar?
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox isSelected={eliminacionConfirmada} onChange={setEliminacionConfirmada}>
                        <Checkbox.Content><Label>Confirmo que deseo inhabilitar este lugar.</Label></Checkbox.Content>
                        <Checkbox.Control className="border border-border"><Checkbox.Indicator /></Checkbox.Control>
                      </Checkbox>
                    </div>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="outline" onPress={close}>Cancelar</Button>
                    <Button variant="danger" onPress={handleDelete} isPending={enviando} isDisabled={enviando || !eliminacionConfirmada}>
                      {({ isPending }) => (
                        <>{isPending ? <Spinner color="current" size="sm" /> : <TrashBin />}{isPending ? 'Inhabilitando...' : 'Sí, inhabilitar'}</>
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
      <Drawer isOpen={detailModalAbierto} onOpenChange={setDetailModalAbierto} aria-label="Detalles de lugar">
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog>
              {({ close }) => (
                <>
                  <Drawer.CloseTrigger />
                  <Drawer.Header>
                    <Drawer.Heading className="flex items-center gap-3">
                      {detailCargando ? <></> : (
                        <div className="flex flex-col gap-2">
                          <h3 className="text-xl font-semibold">Detalles del Lugar</h3>
                          <p className="text-sm text-muted">Información completa del lugar registrado</p>
                        </div>
                      )}
                    </Drawer.Heading>
                  </Drawer.Header>
                  <Drawer.Body className="flex flex-col relative no-scrollbar">
                    {detailCargando ? (
                      <div className="flex justify-center items-center py-20 flex-1"><Spinner color="current" size="sm" /></div>
                    ) : registroDetalle && (
                      <div className="flex flex-col gap-5 w-full pt-6 pb-6">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium text-foreground">Estatus:</p>
                          <Chip color={COLOR_ESTATUS[registroDetalle.estatus] || 'default'} variant="soft">
                            <Chip.Label className="uppercase font-semibold">{registroDetalle.estatus || 'no definido'}</Chip.Label>
                          </Chip>
                        </div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Nombre</Label><span className="text-sm font-medium">{registroDetalle.nombre}</span></div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Ciudad</Label><span className="text-sm">{registroDetalle.ciudad}</span></div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">País</Label><span className="text-sm">{registroDetalle.pais}</span></div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Dirección</Label><span className="text-sm">{registroDetalle.direccion}</span></div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Fecha de creación</Label><span className="text-sm">{formatearFechaLegible(registroDetalle.fecha_creacion) || '—'}</span></div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Última actualización</Label><span className="text-sm">{formatearFechaLegible(registroDetalle.fecha_actualizacion) || '—'}</span></div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">ID Dueño</Label><span className="text-sm">{registroDetalle.id_dueno}</span></div>
                      </div>
                    )}
                  </Drawer.Body>
                  <Drawer.Footer>
                    {detailCargando ? <></> : (
                      <>
                        <Button variant="outline" onPress={close}>Cerrar</Button>
                        <Button onPress={() => { setDetailModalAbierto(false); handleEdit(registroDetalle); }} fullWidth>
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
  )
}
