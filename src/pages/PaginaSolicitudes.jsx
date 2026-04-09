import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Button,
  Checkbox,
  Chip,
  Label,
  Pagination,
  Spinner,
  Table,
  toast,
  Drawer,
  AlertDialog,
  Description,
} from '@heroui/react'
import { Eye, Check, Xmark, SquareCheck, SquareExclamation } from '@gravity-ui/icons'
import ContenedorIcono from '../components/ContenedorIcono'
import { obtenerUsuarios, obtenerUsuario, aprobarUsuario, desactivarUsuario } from '../services/usuarios.api'
import { obtenerRoles } from '../services/roles.api'

/* ─── constantes ─── */
const FILAS_POR_PAGINA = 10

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
export default function PaginaSolicitudes() {
  /* ─── datos ─── */
  const [registros, setRegistros] = useState([])
  const [roles, setRoles] = useState([])
  const [cargando, setCargando] = useState(true)

  /* ─── paginación ─── */
  const [paginaActual, setPaginaActual] = useState(1)

  /* ─── contexto del layout global ─── */
  const contextoGlobal = useOutletContext()
  const busquedaGlobal = contextoGlobal?.busquedaGlobal || ''

  useEffect(() => { setPaginaActual(1) }, [busquedaGlobal])

  /* ─── modales ─── */
  const [modalAprobarAbierto, setModalAprobarAbierto] = useState(false)
  const [modalRechazarAbierto, setModalRechazarAbierto] = useState(false)
  const [detailModalAbierto, setDetailModalAbierto] = useState(false)

  /* ─── selección ─── */
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null)
  const [registroDetalle, setRegistroDetalle] = useState(null)

  /* ─── estado ─── */
  const [enviando, setEnviando] = useState(false)
  const [detailCargando, setDetailCargando] = useState(false)
  const [aprobacionConfirmada, setAprobacionConfirmada] = useState(false)
  const [rechazoConfirmado, setRechazoConfirmado] = useState(false)

  /* ─── fetch ─── */
  const fetchData = async () => {
    setCargando(true)
    try {
      const [usersData, rolesData] = await Promise.all([
        obtenerUsuarios(),
        obtenerRoles(),
      ])
      const todos = Array.isArray(usersData) ? usersData : []
      setRegistros(todos.filter((u) => u.estatus === 'pendiente'))
      setRoles(Array.isArray(rolesData) ? rolesData : [])
    } catch (err) {
      console.error('Error cargando datos:', err)
      toast.danger('Error al cargar las solicitudes')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  /* ─── helper nombre rol ─── */
  const getRolNombre = (id) => {
    const rol = roles.find((r) => r.id_rol === id)
    return rol ? rol.nombre : `ID: ${id}`
  }

  /* ─── datos filtrados y paginados ─── */
  const registrosFiltrados = useMemo(() => {
    const q = busquedaGlobal.toLowerCase()
    if (!q) return registros
    return registros.filter((it) =>
      it.nombre?.toLowerCase().includes(q) ||
      it.apellidos?.toLowerCase().includes(q) ||
      it.correo?.toLowerCase().includes(q) ||
      it.id_usuario?.toString().includes(q)
    )
  }, [registros, busquedaGlobal])

  const paginasTotales = Math.max(1, Math.ceil(registrosFiltrados.length / FILAS_POR_PAGINA))
  const registrosPaginados = useMemo(() => {
    const start = (paginaActual - 1) * FILAS_POR_PAGINA
    return registrosFiltrados.slice(start, start + FILAS_POR_PAGINA)
  }, [registrosFiltrados, paginaActual])

  /* ─── ver detalles ─── */
  const handleViewDetail = async (item) => {
    setRegistroDetalle(null)
    setDetailModalAbierto(true)
    setDetailCargando(true)
    try {
      const data = await obtenerUsuario(item.id_usuario)
      setRegistroDetalle(data)
    } catch (err) {
      console.error('Error obteniendo detalles:', err)
      toast.danger('Error al obtener los detalles')
      setDetailModalAbierto(false)
    } finally {
      setDetailCargando(false)
    }
  }

  /* ─── abrir confirmación aprobar ─── */
  const abrirModalAprobar = (item) => {
    setSolicitudSeleccionada(item)
    setAprobacionConfirmada(false)
    setModalAprobarAbierto(true)
  }

  /* ─── abrir confirmación rechazar ─── */
  const abrirModalRechazar = (item) => {
    setSolicitudSeleccionada(item)
    setRechazoConfirmado(false)
    setModalRechazarAbierto(true)
  }

  /* ─── aprobar ─── */
  const handleAprobar = async () => {
    if (!solicitudSeleccionada) return
    setEnviando(true)
    try {
      await aprobarUsuario(solicitudSeleccionada.id_usuario)
      toast.success(`Usuario "${solicitudSeleccionada.nombre}" aprobado correctamente`)
      setModalAprobarAbierto(false)
      setSolicitudSeleccionada(null)
      await fetchData()
    } catch {
      toast.danger('No se pudo aprobar la solicitud')
    } finally {
      setEnviando(false)
    }
  }

  /* ─── rechazar ─── */
  const handleRechazar = async () => {
    if (!solicitudSeleccionada) return
    setEnviando(true)
    try {
      await desactivarUsuario(solicitudSeleccionada.id_usuario)
      toast.success(`Solicitud de "${solicitudSeleccionada.nombre}" rechazada`)
      setModalRechazarAbierto(false)
      setSolicitudSeleccionada(null)
      await fetchData()
    } catch {
      toast.danger('No se pudo rechazar la solicitud')
    } finally {
      setEnviando(false)
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
          <h2 className="text-xl font-semibold text-foreground">Solicitudes de Aprobación</h2>
          <p className="text-muted text-sm">
            Gestiona las solicitudes pendientes de aprobación ({registrosFiltrados.length} pendientes)
          </p>
        </div>
      </div>

      {/* ─── Tabla ─── */}
      <div className="flex-1 flex flex-col">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Tabla de solicitudes">
              <Table.Header>
                <Table.Column isRowHeader>ID</Table.Column>
                <Table.Column>Nombre</Table.Column>
                <Table.Column>Correo</Table.Column>
                <Table.Column>Rol Solicitado</Table.Column>
                <Table.Column>Fecha Registro</Table.Column>
                <Table.Column>Estado</Table.Column>
                <Table.Column className="flex justify-end">Acciones</Table.Column>
              </Table.Header>
              <Table.Body
                items={registrosPaginados}
                renderEmptyState={() => (
                  <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                    {cargando ? <Spinner color="current" size="sm" /> : 'No hay solicitudes pendientes.'}
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
                      {item.fecha_creacion
                        ? new Date(item.fecha_creacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </Table.Cell>
                    <Table.Cell>
                      <Chip color="warning" variant="soft" className="font-medium text-xs px-3 py-1">
                        <SquareExclamation className="size-3" />
                        Pendiente
                      </Chip>
                    </Table.Cell>
                    <Table.Cell className="flex justify-end">
                      <div className="flex gap-1">
                        <Button variant="ghost" isIconOnly size="sm" onPress={() => handleViewDetail(item)} aria-label="Ver detalles">
                          <Eye />
                        </Button>
                        <Button variant="ghost" isIconOnly size="sm" onPress={() => abrirModalAprobar(item)} aria-label="Aprobar" className="text-success">
                          <Check />
                        </Button>
                        <Button variant="ghost" isIconOnly size="sm" onPress={() => abrirModalRechazar(item)} aria-label="Rechazar" className="text-danger">
                          <Xmark />
                        </Button>
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

      {/* ─── Modal confirmación aprobar ─── */}
      <AlertDialog>
        <AlertDialog.Backdrop isOpen={modalAprobarAbierto} onOpenChange={setModalAprobarAbierto}>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de aprobación">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div><ContenedorIcono tamano="md" color="success"><SquareCheck className="size-6 text-success" /></ContenedorIcono></div>
                    <AlertDialog.Heading className="flex items-center gap-3"><h3>¿Aprobar usuario?</h3></AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de aprobar al usuario <span className="font-bold">&ldquo;{solicitudSeleccionada?.nombre} {solicitudSeleccionada?.apellidos}&rdquo;</span>.
                      El usuario podrá acceder al sistema con el rol asignado.
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox isSelected={aprobacionConfirmada} onChange={setAprobacionConfirmada}>
                        <Checkbox.Content><Label>Confirmo que deseo aprobar a este usuario y activar su cuenta.</Label></Checkbox.Content>
                        <Checkbox.Control className="border border-border"><Checkbox.Indicator /></Checkbox.Control>
                      </Checkbox>
                    </div>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="outline" onPress={close}>Cancelar</Button>
                    <Button onPress={handleAprobar} isPending={enviando} isDisabled={enviando || !aprobacionConfirmada} className="bg-success text-success-foreground">
                      {({ isPending }) => (
                        <>{isPending ? <Spinner color="current" size="sm" /> : <SquareCheck />}{isPending ? 'Aprobando...' : 'Sí, aprobar'}</>
                      )}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      {/* ─── Modal confirmación rechazar ─── */}
      <AlertDialog>
        <AlertDialog.Backdrop isOpen={modalRechazarAbierto} onOpenChange={setModalRechazarAbierto}>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de rechazo">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div><ContenedorIcono tamano="md" color="danger"><Xmark className="size-6 text-danger" /></ContenedorIcono></div>
                    <AlertDialog.Heading className="flex items-center gap-3"><h3>¿Rechazar solicitud?</h3></AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de rechazar la solicitud de <span className="font-bold">&ldquo;{solicitudSeleccionada?.nombre} {solicitudSeleccionada?.apellidos}&rdquo;</span>.
                      La cuenta será desactivada.
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox isSelected={rechazoConfirmado} onChange={setRechazoConfirmado}>
                        <Checkbox.Content><Label>Confirmo que deseo rechazar esta solicitud.</Label></Checkbox.Content>
                        <Checkbox.Control className="border border-border"><Checkbox.Indicator /></Checkbox.Control>
                      </Checkbox>
                    </div>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="outline" onPress={close}>Cancelar</Button>
                    <Button variant="danger" onPress={handleRechazar} isPending={enviando} isDisabled={enviando || !rechazoConfirmado}>
                      {({ isPending }) => (
                        <>{isPending ? <Spinner color="current" size="sm" /> : <Xmark />}{isPending ? 'Rechazando...' : 'Sí, rechazar'}</>
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
      <Drawer isOpen={detailModalAbierto} onOpenChange={setDetailModalAbierto} aria-label="Detalles de solicitud">
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
                          <h3 className="text-xl font-semibold">Detalles de la Solicitud</h3>
                          <p className="text-sm text-muted">Información del usuario pendiente de aprobación</p>
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
                          <p className="text-sm font-medium text-foreground">Estado:</p>
                          <Chip color="warning" variant="soft">
                            <SquareExclamation />
                            <Chip.Label className="uppercase font-semibold">Pendiente</Chip.Label>
                          </Chip>
                        </div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Nombre completo</Label><span className="text-sm font-medium">{registroDetalle.nombre} {registroDetalle.apellidos || ''}</span></div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Correo electrónico</Label><span className="text-sm">{registroDetalle.correo}</span></div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Rol solicitado</Label><span className="text-sm font-medium">{getRolNombre(registroDetalle.id_rol)}</span></div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Fecha de registro</Label><span className="text-sm">{formatearFechaLegible(registroDetalle.fecha_creacion) || '—'}</span></div>
                        {registroDetalle.fecha_nacimiento && (
                          <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Fecha de nacimiento</Label><span className="text-sm">{formatearFechaLegible(registroDetalle.fecha_nacimiento) || '—'}</span></div>
                        )}
                      </div>
                    )}
                  </Drawer.Body>
                  <Drawer.Footer>
                    {detailCargando ? <></> : (
                      <div className="flex gap-2 w-full">
                        <Button variant="outline" onPress={close} className="flex-1">Cerrar</Button>
                        <Button onPress={() => { setDetailModalAbierto(false); abrirModalAprobar(registroDetalle); }} className="flex-1 bg-success text-success-foreground">
                          <SquareCheck />
                          Aprobar
                        </Button>
                        <Button variant="danger" onPress={() => { setDetailModalAbierto(false); abrirModalRechazar(registroDetalle); }} className="flex-1">
                          <Xmark />
                          Rechazar
                        </Button>
                      </div>
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
