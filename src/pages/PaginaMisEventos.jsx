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
  Description,
} from '@heroui/react'
import {
  Pencil,
  Plus,
  TrashBin,
  PencilToSquare,
  ChevronRight,
  CircleCheck,
  CircleXmark,
  ArrowRotateLeft,
} from '@gravity-ui/icons'
import ContenedorIcono from '../components/ContenedorIcono'
import {
  obtenerTodosLosEventos,
  obtenerEvento,
  crearEvento,
  actualizarEvento,
  desactivarEvento,
  reactivarEvento,
  obtenerEventosPorUsuario,
} from '../services/eventos.api'
import { useAutenticacion } from '../hooks/usarAutenticacion'
import { obtenerLugares } from '../services/lugares.api'
import { obtenerLayout, obtenerTodosLosLayouts } from '../services/layouts.api'

/* ─── constantes ─── */
const FILAS_POR_PAGINA = 10

const FORMULARIO_VACIO = {
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

const ESTATUS_OPCIONES = ['BORRADOR', 'PUBLICADO', 'CANCELADO', 'FINALIZADO']

const range = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i)

/* ─── componente principal ─── */
export default function PaginaMisEventos() {
  const navigate = useNavigate()
  const { usuario } = useAutenticacion()
  const idClienteActual = usuario?.idUsuario || usuario?.id_usuario || usuario?.id || null

  /* ─── datos ─── */
  const [registros, setRegistros] = useState([])
  const [lugares, setLugares] = useState([])
  const [layouts, setLayouts] = useState([])
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
  const [confirmacionCrearAbierta, setConfirmacionCrearAbierta] = useState(false)

  /* ─── edición / eliminación ─── */
  const [registroEnEdicion, setRegistroEnEdicion] = useState(null)
  const [registroBorrando, setRegistroBorrando] = useState(null)

  /* ─── formulario ─── */
  const [enviando, setEnviando] = useState(false)
  const [formCargando, setFormCargando] = useState(false)
  const [form, setForm] = useState({ ...FORMULARIO_VACIO })
  const [intentadoEnviar, setIntentadoEnviar] = useState(false)
  const [erroresServidor, setErroresServidor] = useState({})
  const [creacionConfirmada, setCreacionConfirmada] = useState(false)
  const [eliminacionConfirmada, setEliminacionConfirmada] = useState(false)

  /* ─── fetch ─── */
  const fetchData = async () => {
    setCargando(true)
    try {
      /* Si es admin, obtiene todos los eventos; si no, solo los del usuario/organizador actual */
      const esAdmin = usuario?.rol?.toLowerCase() === 'admin' || usuario?.rol?.toLowerCase() === 'administrador'
      const eventosData = esAdmin
        ? await obtenerTodosLosEventos()
        : await obtenerEventosPorUsuario(idClienteActual || 0).catch(() => [])

      const [lugaresData, layoutsData] = await Promise.all([
        obtenerLugares(),
        obtenerTodosLosLayouts().catch(() => []),
      ])
      setRegistros(Array.isArray(eventosData) ? eventosData : [])
      setLugares(Array.isArray(lugaresData) ? lugaresData : [])
      setLayouts(Array.isArray(layoutsData) ? layoutsData : [])
    } catch (err) {
      console.error('Error cargando datos:', err)
      toast.danger('Error al cargar los datos')
    } finally {
      setCargando(false)
    }
  }

  /* Layouts filtrados por el lugar seleccionado en el formulario.
     Devuelve sólo los layouts PUBLICADO asociados al `form.id_lugar`. */
  const layoutsDisponibles = useMemo(() => {
    if (!form.id_lugar) return []
    return layouts
      .filter((l) => Number(l.id_lugar) === Number(form.id_lugar))
      .filter((l) => !l.estatus || l.estatus === 'PUBLICADO')
      .sort((a, b) => Number(b.version || 0) - Number(a.version || 0))
  }, [layouts, form.id_lugar])

  useEffect(() => { fetchData() }, [])

  /* ─── helper nombre lugar ─── */
  const getNombreLugar = (id) => {
    const lugar = lugares.find((l) => Number(l.id_lugar) === Number(id))
    return lugar ? lugar.nombre : `ID: ${id}`
  }

  const getIdLugarEvento = (evento) => {
    const candidato =
      evento?.id_lugar ??
      evento?.lugar?.id_lugar ??
      evento?.lugar ??
      evento?.idLugar ??
      null

    const id = Number(candidato)
    return Number.isFinite(id) && id > 0 ? id : null
  }

  const getNombreLugarEvento = (evento) => {
    if (evento?.nombre_lugar) return evento.nombre_lugar
    if (evento?.lugar_nombre) return evento.lugar_nombre
    if (evento?.lugar?.nombre) return evento.lugar.nombre

    const idLugar = getIdLugarEvento(evento)
    return idLugar ? getNombreLugar(idLugar) : 'Sin lugar'
  }

  /* ─── datos filtrados y paginados ─── */
  const registrosFiltrados = useMemo(() => {
    const q = busquedaGlobal.toLowerCase()
    if (!q) return registros
    return registros.filter((it) =>
      it.nombre?.toLowerCase().includes(q) ||
      it.descripcion?.toLowerCase().includes(q) ||
      it.id_evento?.toString().includes(q)
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
      const data = await obtenerEvento(item.id_evento)
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
      setRegistroEnEdicion(data)
    } catch (err) {
      console.error('Error al consultar datos:', err)
      toast.danger('No se pudo cargar la información del evento')
      setModalAbierto(false)
    } finally {
      setFormCargando(false)
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
    if (!form.id_lugar) { toast.danger('Selecciona un lugar'); return }
    if (!form.fecha_inicio) { toast.danger('La fecha de inicio es obligatoria'); return }
    if (!form.fecha_fin) { toast.danger('La fecha de fin es obligatoria'); return }

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
        descripcion: form.descripcion,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        tiempo_espera: Number(form.tiempo_espera),
        foto: form.foto,
        id_lugar: Number(form.id_lugar),
        // id_version contiene el id_layout (PK) del layout elegido en el
        // dropdown, que ya está filtrado por lugar.
        id_version: Number(form.id_version),
        estatus: form.estatus || 'BORRADOR',
      }

      if (registroEnEdicion) {
        await actualizarEvento(registroEnEdicion.id_evento, payload)
        toast.success('Evento actualizado correctamente')
      } else {
        payload.fecha_creacion = now
        payload.fecha_actualizacion = now
        await crearEvento(payload)
        toast.success('Evento creado correctamente')
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
        toast.danger('Error al guardar el evento')
      }
    } finally {
      setEnviando(false)
    }
  }

  /* ─── desactivar ─── */
  const handleDelete = async () => {
    if (!registroBorrando) return
    setEnviando(true)
    try {
      await desactivarEvento(registroBorrando.id_evento)
      toast.success('Evento desactivado correctamente')
      setDeleteModalAbierto(false)
      setRegistroBorrando(null)
      await fetchData()
    } catch (err) {
      console.error('Error desactivando:', err)
      toast.danger('Error al desactivar el evento')
    } finally {
      setEnviando(false)
    }
  }

  /* ─── reactivar ─── */
  const handleReactivar = async (item) => {
    try {
      await reactivarEvento(item.id_evento)
      toast.success('Evento reactivado correctamente')
      await fetchData()
    } catch {
      toast.danger('Error al reactivar el evento')
    }
  }

  const handleIrASeleccionAsientos = async (item) => {
    if (!item?.id_evento) {
      toast.danger('No se encontró el ID del evento para abrir el mapa de asientos')
      return
    }

    let eventoFuente = item
    try {
      const detalle = await obtenerEvento(item.id_evento)
      if (detalle) eventoFuente = detalle
    } catch {
      // Si falla el detalle, seguimos con los datos de la fila.
    }

    let idLayout = Number(
      eventoFuente?.id_layout ??
      eventoFuente?.layout?.id_layout ??
      0
    ) || null

    const idLugar = getIdLugarEvento(eventoFuente)
    const idVersion = Number(
      eventoFuente?.id_version ??
      eventoFuente?.version_layout ??
      eventoFuente?.layout_version ??
      0
    ) || null

    // Si el evento no trae id_layout usable, intentamos resolverlo por lugar y versión.
    if (!idLayout && idLugar) {
      try {
        const layouts = await obtenerTodosLosLayouts()
        const layoutsDelLugar = (layouts || []).filter(
          (l) => Number(l.id_lugar) === Number(idLugar)
        )

        const layoutPorVersion = idVersion
          ? layoutsDelLugar.find((l) => Number(l.id_version) === Number(idVersion))
          : null

        const layoutElegido =
          layoutPorVersion ||
          layoutsDelLugar
            .slice()
            .sort((a, b) => Number(b.id_layout || 0) - Number(a.id_layout || 0))[0]

        idLayout = layoutElegido?.id_layout || null
      } catch {
        // Continuamos con validación final y mensaje de error al usuario.
      }
    }

    if (!idLayout) {
      toast.danger('El evento no tiene layout asociado para mostrar el mapa de asientos')
      return
    }

    try {
      await obtenerLayout(idLayout)
      navigate(`/eventos/${item.id_evento}/layout/${idLayout}/asientos`)
    } catch {
      toast.danger('No se pudo cargar el layout del evento. Verifica la configuración del lugar')
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
          <h2 className="text-xl font-semibold text-foreground">Eventos</h2>
          <p className="text-muted text-sm">
            Administra los eventos del sistema ({registrosFiltrados.length} registros)
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
                items={registrosPaginados}
                renderEmptyState={() => (
                  <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                    {cargando ? <Spinner color="current" size="sm" /> : 'No se encontraron resultados.'}
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
                        {getNombreLugarEvento(item)}
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
                          onPress={() => handleIrASeleccionAsientos(item)}
                          aria-label="Ir a seleccion de asientos"
                        >
                          Asientos
                          <ChevronRight />
                        </Button>
                        <Button variant="ghost" isIconOnly size="sm" onPress={() => handleEdit(item)} aria-label="Editar">
                          <Pencil />
                        </Button>
                        {item.estatus !== 'CANCELADO' ? (
                          <Button variant="ghost" isIconOnly size="sm" onPress={() => handleDeleteConfirm(item)} aria-label="Desactivar">
                            <TrashBin />
                          </Button>
                        ) : (
                          <Button variant="ghost" isIconOnly size="sm" onPress={() => handleReactivar(item)} aria-label="Reactivar">
                            <ArrowRotateLeft />
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
      <Drawer isOpen={modalAbierto} onOpenChange={setModalAbierto} aria-label="Formulario de evento">
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog>
              {() => (
                <>
                  <Drawer.CloseTrigger />
                  <Drawer.Header>
                    <Drawer.Heading className="flex items-center gap-3">
                      {formCargando ? <></> : (
                        <div className="flex flex-col gap-2">
                          <h3 className="text-xl font-semibold">{registroEnEdicion ? 'Actualizar evento' : 'Registrar evento'}</h3>
                          <p className="text-sm text-muted">{registroEnEdicion ? 'Actualice la información del evento y guarde los cambios' : 'Registre la información correspondiente del evento'}</p>
                        </div>
                      )}
                    </Drawer.Heading>
                  </Drawer.Header>

                  <Drawer.Body className="flex flex-col relative no-scrollbar">
                    {formCargando ? (
                      <div className="flex justify-center items-center py-20 flex-1"><Spinner color="current" size="sm" /></div>
                    ) : (
                      <div className="flex flex-col gap-5 w-full pt-6 pb-6">
                        <TextField name="nombre" aria-label="Nombre del evento" isRequired fullWidth variant="secondary" isInvalid={(intentadoEnviar && !form.nombre.trim()) || !!erroresServidor.nombre}>
                          <Label>Nombre</Label>
                          <Input placeholder="Nombre del evento" value={form.nombre} onChange={handleFormChange} />
                          {erroresServidor.nombre ? <FieldError>{erroresServidor.nombre[0]}</FieldError> : intentadoEnviar && !form.nombre.trim() && <FieldError>El nombre es obligatorio.</FieldError>}
                        </TextField>

                        <TextField name="descripcion" aria-label="Descripción" fullWidth variant="secondary" isInvalid={!!erroresServidor.descripcion}>
                          <Label>Descripción</Label>
                          <Input placeholder="Descripción breve" value={form.descripcion} onChange={handleFormChange} />
                          {erroresServidor.descripcion && <FieldError>{erroresServidor.descripcion[0]}</FieldError>}
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
                              if (erroresServidor.id_lugar) {
                                setErroresServidor((prev) => { const n = { ...prev }; delete n.id_lugar; return n })
                              }
                              if (erroresServidor.id_version) {
                                setErroresServidor((prev) => { const n = { ...prev }; delete n.id_version; return n })
                              }
                            }}
                            variant="secondary"
                            isInvalid={(intentadoEnviar && !form.id_lugar) || !!erroresServidor.id_lugar}
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
                                  {lugares.map((lugar) => (
                                    <ListBox.Item id={String(lugar.id_lugar)} key={String(lugar.id_lugar)} textValue={`${lugar.nombre} — ${lugar.ciudad}`}>
                                      {lugar.nombre} — {lugar.ciudad}
                                    </ListBox.Item>
                                  ))}
                                </ListBox>
                              </Autocomplete.Filter>
                            </Autocomplete.Popover>
                          </Autocomplete>
                          {erroresServidor.id_lugar ? <FieldError className="text-danger-500 text-xs">{erroresServidor.id_lugar[0]}</FieldError> : intentadoEnviar && !form.id_lugar && <FieldError className="text-danger-500 text-xs">Selecciona un lugar.</FieldError>}
                        </div>

                        <TextField name="fecha_inicio" aria-label="Fecha inicio" isRequired fullWidth variant="secondary" isInvalid={(intentadoEnviar && !form.fecha_inicio) || !!erroresServidor.fecha_inicio}>
                          <Label>Fecha Inicio</Label>
                          <Input type="datetime-local" value={form.fecha_inicio} onChange={handleFormChange} />
                          {erroresServidor.fecha_inicio ? <FieldError>{erroresServidor.fecha_inicio[0]}</FieldError> : intentadoEnviar && !form.fecha_inicio && <FieldError>La fecha de inicio es obligatoria.</FieldError>}
                        </TextField>

                        <TextField name="fecha_fin" aria-label="Fecha fin" isRequired fullWidth variant="secondary" isInvalid={(intentadoEnviar && !form.fecha_fin) || !!erroresServidor.fecha_fin}>
                          <Label>Fecha Fin</Label>
                          <Input type="datetime-local" value={form.fecha_fin} onChange={handleFormChange} />
                          {erroresServidor.fecha_fin ? <FieldError>{erroresServidor.fecha_fin[0]}</FieldError> : intentadoEnviar && !form.fecha_fin && <FieldError>La fecha de fin es obligatoria.</FieldError>}
                        </TextField>

                        <div className="flex gap-3">
                          <TextField name="tiempo_espera" aria-label="Tiempo espera" fullWidth variant="secondary" isInvalid={!!erroresServidor.tiempo_espera}>
                            <Label>Tiempo Espera (min)</Label>
                            <Input type="number" min="0" value={String(form.tiempo_espera)} onChange={handleFormChange} />
                            {erroresServidor.tiempo_espera && <FieldError>{erroresServidor.tiempo_espera[0]}</FieldError>}
                          </TextField>

                          <TextField name="foto" aria-label="URL Foto" fullWidth variant="secondary" isInvalid={!!erroresServidor.foto}>
                            <Label>URL Foto</Label>
                            <Input placeholder="https://..." value={form.foto} onChange={handleFormChange} />
                            {erroresServidor.foto && <FieldError>{erroresServidor.foto[0]}</FieldError>}
                          </TextField>
                        </div>

                        <div className="flex flex-col gap-1 w-full">
                          <Label isRequired>Layout del lugar</Label>
                          <Autocomplete
                            aria-label="Layout del evento"
                            isRequired
                            isDisabled={!form.id_lugar}
                            value={form.id_version ? String(form.id_version) : null}
                            onChange={(val) => {
                              setForm({ ...form, id_version: val })
                              if (erroresServidor.id_version) {
                                setErroresServidor((prev) => { const n = { ...prev }; delete n.id_version; return n })
                              }
                            }}
                            variant="secondary"
                            isInvalid={(intentadoEnviar && !form.id_version) || !!erroresServidor.id_version}
                          >
                            <Autocomplete.Trigger>
                              <Autocomplete.Value
                                placeholder={
                                  !form.id_lugar
                                    ? 'Primero elige un lugar'
                                    : layoutsDisponibles.length === 0
                                    ? 'Este lugar no tiene layouts publicados'
                                    : 'Selecciona un layout...'
                                }
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
                                  {layoutsDisponibles.map((layout) => {
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
                          {erroresServidor.id_version
                            ? <FieldError className="text-danger-500 text-xs">{erroresServidor.id_version[0]}</FieldError>
                            : intentadoEnviar && !form.id_version && <FieldError className="text-danger-500 text-xs">Selecciona un layout.</FieldError>}
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-1 block">Estatus</Label>
                          <select
                            name="estatus"
                            value={form.estatus}
                            onChange={handleFormChange}
                            className="w-full px-3 py-2 border rounded border-default-300 bg-transparent text-sm"
                          >
                            {ESTATUS_OPCIONES.map((op) => (
                              <option key={op} value={op}>{op}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </Drawer.Body>

                  <Drawer.Footer>
                    {formCargando ? <></> : (
                      <Button color="primary" onPress={handleSave} isPending={enviando} isDisabled={enviando} className="font-semibold">
                        {({ isPending }) => (
                          <>
                            {isPending ? <Spinner color="current" size="sm" /> : registroEnEdicion && <PencilToSquare />}
                            {isPending ? 'Guardando...' : registroEnEdicion ? 'Actualizar' : 'Continuar'}
                            {!registroEnEdicion && <ChevronRight />}
                          </>
                        )}
                      </Button>
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
            <AlertDialog.Dialog aria-label="Confirmación de registro de evento">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div><ContenedorIcono tamano="md"><Plus className="size-6 text-accent" /></ContenedorIcono></div>
                    <AlertDialog.Heading className="flex items-center gap-3"><h3>¿Registrar evento?</h3></AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">Está a punto de registrar un nuevo evento. ¿Desea continuar?</p>
                    <div className="flex items-center gap-3">
                      <Checkbox id="confirmacion-creacion-evento" aria-label="Confirmar" isSelected={creacionConfirmada} onChange={setCreacionConfirmada}>
                        <Checkbox.Content><Label htmlFor="confirmacion-creacion-evento">Confirmo que los datos son correctos.</Label></Checkbox.Content>
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

      {/* ─── Modal confirmación desactivar ─── */}
      <AlertDialog>
        <AlertDialog.Backdrop isOpen={deleteModalAbierto} onOpenChange={setDeleteModalAbierto}>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de desactivación">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div><ContenedorIcono tamano="md" color="danger"><TrashBin className="size-6 text-danger" /></ContenedorIcono></div>
                    <AlertDialog.Heading className="flex items-center gap-3"><h3>¿Desactivar evento?</h3></AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de desactivar el evento <span className="font-bold">&ldquo;{registroBorrando?.nombre}&rdquo;</span>. ¿Desea continuar?
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox isSelected={eliminacionConfirmada} onChange={setEliminacionConfirmada}>
                        <Checkbox.Content><Label>Confirmo que deseo desactivar este evento.</Label></Checkbox.Content>
                        <Checkbox.Control className="border border-border"><Checkbox.Indicator /></Checkbox.Control>
                      </Checkbox>
                    </div>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="outline" onPress={close}>Cancelar</Button>
                    <Button variant="danger" onPress={handleDelete} isPending={enviando} isDisabled={enviando || !eliminacionConfirmada}>
                      {({ isPending }) => (
                        <>{isPending ? <Spinner color="current" size="sm" /> : <TrashBin />}{isPending ? 'Desactivando...' : 'Sí, desactivar'}</>
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
