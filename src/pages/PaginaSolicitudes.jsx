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
} from '@heroui/react'
import { Eye, Check, Xmark, SquareCheck, SquareExclamation } from '@gravity-ui/icons'
import ContenedorIcono from '../components/ContenedorIcono'
import { getUsers, getUser, approveUser, deactivateUser } from '../services/usuarios.api'
import { getRoles } from '../services/roles.api'

/* ─── constantes ─── */
const ROWS_PER_PAGE = 10

const range = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i)

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

/* ─── componente principal ─── */
export default function PaginaSolicitudes() {
  /* ─── datos ─── */
  const [records, setRecords] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)

  /* ─── paginación ─── */
  const [currentPage, setCurrentPage] = useState(1)

  /* ─── global layout context ─── */
  const outletContext = useOutletContext()
  const globalSearch = outletContext?.globalSearch || ''

  useEffect(() => { setCurrentPage(1) }, [globalSearch])

  /* ─── modales ─── */
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  /* ─── selection ─── */
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [detailRecord, setDetailRecord] = useState(null)

  /* ─── state ─── */
  const [submitting, setSubmitting] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [approveConfirmed, setApproveConfirmed] = useState(false)
  const [rejectConfirmed, setRejectConfirmed] = useState(false)

  /* ─── fetch ─── */
  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersData, rolesData] = await Promise.all([
        getUsers(),
        getRoles(),
      ])
      const all = Array.isArray(usersData) ? usersData : []
      setRecords(all.filter((u) => u.estatus === 'pendiente'))
      setRoles(Array.isArray(rolesData) ? rolesData : [])
    } catch (err) {
      console.error('Error cargando datos:', err)
      toast.danger('Error al cargar las solicitudes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  /* ─── helper nombre rol ─── */
  const getRoleName = (id) => {
    const role = roles.find((r) => r.id_rol === id)
    return role ? role.nombre : `ID: ${id}`
  }

  /* ─── datos filtrados y paginados ─── */
  const filteredRecords = useMemo(() => {
    const q = globalSearch.toLowerCase()
    if (!q) return records
    return records.filter((it) =>
      it.nombre?.toLowerCase().includes(q) ||
      it.apellidos?.toLowerCase().includes(q) ||
      it.correo?.toLowerCase().includes(q) ||
      it.id_usuario?.toString().includes(q)
    )
  }, [records, globalSearch])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ROWS_PER_PAGE))
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return filteredRecords.slice(start, start + ROWS_PER_PAGE)
  }, [filteredRecords, currentPage])

  /* ─── ver detalles ─── */
  const handleViewDetail = async (item) => {
    setDetailRecord(null)
    setDetailModalOpen(true)
    setDetailLoading(true)
    try {
      const data = await getUser(item.id_usuario)
      setDetailRecord(data)
    } catch (err) {
      console.error('Error obteniendo detalles:', err)
      toast.danger('Error al obtener los detalles')
      setDetailModalOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  /* ─── abrir confirmación aprobar ─── */
  const openApproveModal = (item) => {
    setSelectedRequest(item)
    setApproveConfirmed(false)
    setApproveModalOpen(true)
  }

  /* ─── abrir confirmación rechazar ─── */
  const openRejectModal = (item) => {
    setSelectedRequest(item)
    setRejectConfirmed(false)
    setRejectModalOpen(true)
  }

  /* ─── aprobar ─── */
  const handleApprove = async () => {
    if (!selectedRequest) return
    setSubmitting(true)
    try {
      await approveUser(selectedRequest.id_usuario)
      toast.success(`Usuario "${selectedRequest.nombre}" aprobado correctamente`)
      setApproveModalOpen(false)
      setSelectedRequest(null)
      await fetchData()
    } catch {
      toast.danger('No se pudo aprobar la solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  /* ─── rechazar ─── */
  const handleReject = async () => {
    if (!selectedRequest) return
    setSubmitting(true)
    try {
      await deactivateUser(selectedRequest.id_usuario)
      toast.success(`Solicitud de "${selectedRequest.nombre}" rechazada`)
      setRejectModalOpen(false)
      setSelectedRequest(null)
      await fetchData()
    } catch {
      toast.danger('No se pudo rechazar la solicitud')
    } finally {
      setSubmitting(false)
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
          <h2 className="text-xl font-semibold text-foreground">Solicitudes de Aprobación</h2>
          <p className="text-muted text-sm">
            Gestiona las solicitudes pendientes de aprobación ({filteredRecords.length} pendientes)
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
                <Table.Column className="text-right">Acciones</Table.Column>
              </Table.Header>
              <Table.Body
                items={paginatedRecords}
                renderEmptyState={() => (
                  <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                    {loading ? <Spinner color="current" size="sm" /> : 'No hay solicitudes pendientes.'}
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
                        {getRoleName(item.id_rol)}
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
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" isIconOnly size="sm" onPress={() => handleViewDetail(item)} aria-label="Ver detalles">
                          <Eye />
                        </Button>
                        <Button variant="ghost" isIconOnly size="sm" onPress={() => openApproveModal(item)} aria-label="Aprobar" className="text-success">
                          <Check />
                        </Button>
                        <Button variant="ghost" isIconOnly size="sm" onPress={() => openRejectModal(item)} aria-label="Rechazar" className="text-danger">
                          <Xmark />
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
                  <Pagination.Summary>Mostrando {startItem}-{endItem} de {filteredRecords.length} resultados</Pagination.Summary>
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous isDisabled={currentPage === 1} onPress={() => setCurrentPage((p) => p - 1)}>
                        <Pagination.PreviousIcon /><span>Anterior</span>
                      </Pagination.Previous>
                    </Pagination.Item>
                    {getPageNumbers().map((p) =>
                      p === 'ellipsis' ? (
                        <Pagination.Item key={`ellipsis-${p}`}><Pagination.Ellipsis /></Pagination.Item>
                      ) : (
                        <Pagination.Item key={p}>
                          <Pagination.Link isActive={p === currentPage} onPress={() => setCurrentPage(p)}>{p}</Pagination.Link>
                        </Pagination.Item>
                      )
                    )}
                    <Pagination.Item>
                      <Pagination.Next isDisabled={currentPage === totalPages} onPress={() => setCurrentPage((p) => p + 1)}>
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
        <AlertDialog.Backdrop isOpen={approveModalOpen} onOpenChange={setApproveModalOpen}>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de aprobación">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div><ContenedorIcono size="md" color="success"><SquareCheck className="size-6 text-success" /></ContenedorIcono></div>
                    <AlertDialog.Heading className="flex items-center gap-3"><h3>¿Aprobar usuario?</h3></AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de aprobar al usuario <span className="font-bold">&ldquo;{selectedRequest?.nombre} {selectedRequest?.apellidos}&rdquo;</span>.
                      El usuario podrá acceder al sistema con el rol asignado.
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox isSelected={approveConfirmed} onChange={setApproveConfirmed}>
                        <Checkbox.Content><Label>Confirmo que deseo aprobar a este usuario y activar su cuenta.</Label></Checkbox.Content>
                        <Checkbox.Control className="border border-border"><Checkbox.Indicator /></Checkbox.Control>
                      </Checkbox>
                    </div>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="outline" onPress={close}>Cancelar</Button>
                    <Button onPress={handleApprove} isPending={submitting} isDisabled={submitting || !approveConfirmed} className="bg-success text-success-foreground">
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
        <AlertDialog.Backdrop isOpen={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de rechazo">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div><ContenedorIcono size="md" color="danger"><Xmark className="size-6 text-danger" /></ContenedorIcono></div>
                    <AlertDialog.Heading className="flex items-center gap-3"><h3>¿Rechazar solicitud?</h3></AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de rechazar la solicitud de <span className="font-bold">&ldquo;{selectedRequest?.nombre} {selectedRequest?.apellidos}&rdquo;</span>.
                      La cuenta será desactivada.
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox isSelected={rejectConfirmed} onChange={setRejectConfirmed}>
                        <Checkbox.Content><Label>Confirmo que deseo rechazar esta solicitud.</Label></Checkbox.Content>
                        <Checkbox.Control className="border border-border"><Checkbox.Indicator /></Checkbox.Control>
                      </Checkbox>
                    </div>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="outline" onPress={close}>Cancelar</Button>
                    <Button variant="danger" onPress={handleReject} isPending={submitting} isDisabled={submitting || !rejectConfirmed}>
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
      <Drawer isOpen={detailModalOpen} onOpenChange={setDetailModalOpen} aria-label="Detalles de solicitud">
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog>
              {({ close }) => (
                <>
                  <Drawer.CloseTrigger />
                  <Drawer.Header>
                    <Drawer.Heading className="flex items-center gap-3">
                      {detailLoading ? <></> : (
                        <div className="flex flex-col gap-2">
                          <h3 className="text-xl font-semibold">Detalles de la Solicitud</h3>
                          <p className="text-sm text-muted">Información del usuario pendiente de aprobación</p>
                        </div>
                      )}
                    </Drawer.Heading>
                  </Drawer.Header>
                  <Drawer.Body className="flex flex-col relative no-scrollbar">
                    {detailLoading ? (
                      <div className="flex justify-center items-center py-20 flex-1"><Spinner color="current" size="sm" /></div>
                    ) : detailRecord && (
                      <div className="flex flex-col gap-5 w-full pt-6 pb-6">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium text-foreground">Estado:</p>
                          <Chip color="warning" variant="soft">
                            <SquareExclamation />
                            <Chip.Label className="uppercase font-semibold">Pendiente</Chip.Label>
                          </Chip>
                        </div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Nombre completo</Label><span className="text-sm font-medium">{detailRecord.nombre} {detailRecord.apellidos || ''}</span></div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Correo electrónico</Label><span className="text-sm">{detailRecord.correo}</span></div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Rol solicitado</Label><span className="text-sm font-medium">{getRoleName(detailRecord.id_rol)}</span></div>
                        <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Fecha de registro</Label><span className="text-sm">{formatReadableDate(detailRecord.fecha_creacion) || '—'}</span></div>
                        {detailRecord.fecha_nacimiento && (
                          <div className="flex flex-col gap-1"><Label className="text-sm text-muted-foreground">Fecha de nacimiento</Label><span className="text-sm">{formatReadableDate(detailRecord.fecha_nacimiento) || '—'}</span></div>
                        )}
                      </div>
                    )}
                  </Drawer.Body>
                  <Drawer.Footer>
                    {detailLoading ? <></> : (
                      <div className="flex gap-2 w-full">
                        <Button variant="outline" onPress={close} className="flex-1">Cerrar</Button>
                        <Button onPress={() => { setDetailModalOpen(false); openApproveModal(detailRecord); }} className="flex-1 bg-success text-success-foreground">
                          <SquareCheck />
                          Aprobar
                        </Button>
                        <Button variant="danger" onPress={() => { setDetailModalOpen(false); openRejectModal(detailRecord); }} className="flex-1">
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
