import { useEffect, useMemo, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Button,
  Pagination,
  Spinner,
  Table,
  Switch,
  toast,
  Drawer,
  AlertDialog,
} from '@heroui/react';
import { Eye, Pencil, Plus, TrashBin, SquareCheck, SquareMinus } from '@gravity-ui/icons';
import ContenedorIcono from './ContenedorIcono';
import PropTypes from 'prop-types';

const ROWS_PER_PAGE = 10;

const formatReadableDate = (dateString) => {
  if (!dateString) return null;
  const isDatetime = dateString.includes('T');
  const dateWithTime = isDatetime ? dateString : dateString + 'T12:00:00';
  const date = new Date(dateWithTime);
  const options = isDatetime
    ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('es-MX', options);
};

export default function PaginaAdmin({
  title,
  subtitle,
  fetchData: fetchDataProp,
  columns,
  renderCell,
  renderStatus,
  statusField = 'estatus',
  activeStatusValue = 'activo',
  idField = 'id',
  getItemName = (item) => item.nombre,
  onCreate,
  onEdit,
  onViewDetail,
  onToggleStatus,
  onDelete,
  onSave,
  renderForm,
  renderDetail,
  renderModalFooter,
  extraActions = null,
  createButtonText = 'Registrar',
  createButtonIcon = <Plus />,
  emptyStateMessage = 'No se encontraron resultados.',
  enableCreate = true,
  enableEdit = true,
  enableDelete = true,
  enableViewDetail = true,
  enableStatusToggle = true,
  statusToggleConfig = {},
  extraModals = null,
  extraState = {},
  headerActions = null,
  renderRowActions = null,
}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusChangingItem, setStatusChangingItem] = useState(null);
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const [deletingRecord, setDeletingRecord] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const outletContext = useOutletContext();
  const globalSearch = outletContext?.globalSearch || '';

  useEffect(() => {
    setCurrentPage(1);
  }, [globalSearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDataProp();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setTimeout(() => toast.danger('Error al cargar los datos', {
        description: 'No se pudieron obtener los registros del servidor.',
      }), 0);
    } finally {
      setLoading(false);
    }
  }, [fetchDataProp]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRecords = useMemo(() => {
    const q = globalSearch.toLowerCase();
    if (!q) return records;
    return records.filter((it) =>
      columns.some((col) => {
        const value = it[col.key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(q);
      })
    );
  }, [records, globalSearch, columns]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ROWS_PER_PAGE));

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredRecords.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  const startItem = filteredRecords.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ROWS_PER_PAGE, filteredRecords.length);

  const handleCreate = () => {
    setFormLoading(true);
    setEditingRecord(null);
    setModalOpen(true);
    if (onCreate) onCreate();
    setTimeout(() => setFormLoading(false), 400);
  };

  const handleEdit = async (item) => {
    setFormLoading(true);
    setEditingRecord(null);
    setModalOpen(true);
    try {
      const data = onEdit ? await onEdit(item) : item;
      setEditingRecord(data);
    } catch {
      setTimeout(() => toast.danger('No se pudo cargar la información', {
        description: 'Ocurrió un error al consultar los datos.',
      }), 0);
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
      const data = onViewDetail ? await onViewDetail(item) : item;
      setDetailRecord(data);
    } catch {
      setTimeout(() => toast.danger('Error al obtener los detalles', {
        description: 'No se pudo consultar la información seleccionada.',
      }), 0);
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
    const action = statusChangingItem?.[statusField];
    try {
      if (onToggleStatus) {
        await onToggleStatus(statusChangingItem, action);
      }
      await fetchData();
      setStatusConfirmOpen(false);
      setTimeout(() => toast.success('Estatus actualizado correctamente', {
        description: `El registro ha sido actualizado.`,
      }), 0);
    } catch {
      setTimeout(() => toast.danger('No se pudo cambiar el estatus', {
        description: 'Ocurrió un error al intentar actualizar el estatus.',
      }), 0);
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setSubmitting(true);
    try {
      if (onDelete) {
        await onDelete(deletingRecord);
      }
      setTimeout(() => toast.success('Registro eliminado', {
        description: `El registro "${getItemName(deletingRecord)}" fue eliminado.`,
      }), 0);
      setDeleteModalOpen(false);
      setDeletingRecord(null);
      await fetchData();
    } catch {
      setTimeout(() => toast.danger('Error al eliminar', {
        description: 'Ocurrió un error al intentar eliminar.',
      }), 0);
    } finally {
      setSubmitting(false);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 'ellipsis', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
    }
    return pages;
  };

  const isActive = (item) => {
    if (typeof activeStatusValue === 'function') {
      return activeStatusValue(item[statusField]);
    }
    return item[statusField] === activeStatusValue;
  };

  return (
    <div className="flex flex-col gap-6 pl-8 pr-4 pt-3">
      <div className="flex justify-between items-end shrink-0 gap-4">
        <div>
          <h2>{title}</h2>
          <p className="text-muted text-sm">
            {subtitle || `${filteredRecords.length} registros`}
          </p>
        </div>
        <div className="flex gap-2">
          {headerActions}
          {extraActions}
          {enableCreate && (
            <Button onPress={handleCreate}>
              {createButtonIcon}
              {createButtonText}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label={`Tabla de ${title}`}>
              <Table.Header>
                <Table.Column isRowHeader>#</Table.Column>
                {columns.map((col) => (
                  <Table.Column key={col.key}>{col.label}</Table.Column>
                ))}
                {enableStatusToggle && <Table.Column>Estatus</Table.Column>}
                <Table.Column className="flex justify-end">Acciones</Table.Column>
              </Table.Header>
              <Table.Body
                items={paginatedRecords}
                renderEmptyState={() => (
                  <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                    {loading ? <Spinner color="current" size="sm" /> : emptyStateMessage}
                  </div>
                )}
              >
                {(item) => (
                  <Table.Row id={item[idField]}>
                    <Table.Cell>
                      {(currentPage - 1) * ROWS_PER_PAGE + paginatedRecords.indexOf(item) + 1}
                    </Table.Cell>
                    {columns.map((col) => (
                      <Table.Cell key={col.key}>
                        {renderCell ? renderCell(item, col.key) : item[col.key]}
                      </Table.Cell>
                    ))}
                    {enableStatusToggle && (
                      <Table.Cell>
                        {renderStatus?.(item, () => handleToggleStatus(item)) ?? (
                          <Switch
                            isSelected={isActive(item)}
                            onChange={() => handleToggleStatus(item)}
                            size="sm"
                          >
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch>
                        )}
                      </Table.Cell>
                    )}
                    <Table.Cell className="flex justify-end">
                      <div className="flex gap-1">
                        {renderRowActions?.(item)}
                        {enableViewDetail && (
                          <Button
                            variant="ghost"
                            isIconOnly
                            size="sm"
                            onPress={() => handleViewDetail(item)}
                            aria-label="Ver detalles"
                          >
                            <Eye />
                          </Button>
                        )}
                        {enableEdit && (
                          <Button
                            variant="ghost"
                            isIconOnly
                            size="sm"
                            onPress={() => handleEdit(item)}
                            aria-label="Editar"
                          >
                            <Pencil />
                          </Button>
                        )}
                        {enableDelete && (
                          <Button
                            variant="ghost"
                            isIconOnly
                            size="sm"
                            onPress={() => handleDeleteConfirm(item)}
                            aria-label="Eliminar"
                          >
                            <TrashBin className="text-danger" />
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
                  <Pagination.Summary>
                    Mostrando {startItem}-{endItem} de {filteredRecords.length} resultados
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
                    {getPageNumbers().map((p) =>
                      p === 'ellipsis' ? (
                        <Pagination.Item key={`ellipsis-${p}`}>
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
                      )
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

      {/* Drawer for Form */}
      {renderForm && (
        <Drawer isOpen={modalOpen} onOpenChange={setModalOpen} aria-label="Formulario">
          <Drawer.Backdrop>
            <Drawer.Content placement="right">
              <Drawer.Dialog>
                {({ close }) => (
                  <>
                    <Drawer.CloseTrigger />
                    <Drawer.Header>
                      <Drawer.Heading className="flex items-center gap-3">
                        {formLoading ? null : (
                          <div className="flex flex-col gap-2">
                            <h3>{editingRecord ? `Editar ${title}` : `Crear ${title}`}</h3>
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
                        renderForm({
                          editingRecord,
                          onClose: close,
                          onSave: async (data) => {
                            setSubmitting(true);
                            try {
                              await onSave(data, editingRecord);
                              setModalOpen(false);
                              await fetchData();
                            } finally {
                              setSubmitting(false);
                            }
                          },
                          submitting,
                          ...extraState,
                        })
                      )}
                    </Drawer.Body>
                    {renderModalFooter && !formLoading && (
                      <Drawer.Footer>
                        {renderModalFooter({ close, editingRecord, submitting })}
                      </Drawer.Footer>
                    )}
                  </>
                )}
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        </Drawer>
      )}

      {/* Drawer for Detail */}
      {renderDetail && (
        <Drawer isOpen={detailModalOpen} onOpenChange={setDetailModalOpen} aria-label="Detalles">
          <Drawer.Backdrop>
            <Drawer.Content placement="right">
              <Drawer.Dialog>
                {({ close }) => (
                  <>
                    <Drawer.CloseTrigger />
                    <Drawer.Header>
                      <Drawer.Heading className="flex items-center gap-3">
                        {!detailLoading && (
                          <div className="flex flex-col gap-2">
                            <h3>Detalles</h3>
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
                        detailRecord &&
                        renderDetail({
                          detailRecord,
                          onClose: close,
                          onEdit: () => {
                            setDetailModalOpen(false);
                            handleEdit(detailRecord);
                          },
                          ...extraState,
                        })
                      )}
                    </Drawer.Body>
                  </>
                )}
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        </Drawer>
      )}

      {/* Delete Confirmation Dialog */}
      {enableDelete && (
        <AlertDialog>
          <AlertDialog.Backdrop isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
            <AlertDialog.Container size="sm">
              <AlertDialog.Dialog aria-label="Confirmar eliminación">
                {({ close }) => (
                  <>
                    <AlertDialog.Header>
                      <div className="flex items-center gap-4">
                        <ContenedorIcono size="md" color="danger">
                          <TrashBin className="size-6 text-danger" />
                        </ContenedorIcono>
                      </div>
                      <AlertDialog.Heading className="flex items-center gap-3">
                        <h3>¿Eliminar registro?</h3>
                      </AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <p className="text-sm text-muted mb-6">
                        Está a punto de eliminar <span className="font-bold">&ldquo;{deletingRecord ? getItemName(deletingRecord) : ''}&rdquo;</span>. Esta acción no se puede deshacer. ¿Desea continuar?
                      </p>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button variant="outline" onPress={close}>
                        Cancelar
                      </Button>
                      <Button
                        variant="danger"
                        onPress={handleDelete}
                        isPending={submitting}
                        isDisabled={submitting}
                      >
                        {({ isPending }) => (
                          <>
                            {isPending ? <Spinner color="current" size="sm" /> : <TrashBin />}
                            {isPending ? 'Eliminando...' : 'Eliminar'}
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
      )}

      {/* Status Toggle Dialog */}
      {enableStatusToggle && statusChangingItem && (
        <AlertDialog>
          <AlertDialog.Backdrop isOpen={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
            <AlertDialog.Container size="sm">
              <AlertDialog.Dialog aria-label="Confirmar cambio de estatus">
                {({ close }) => (
                  <>
                    <AlertDialog.Header>
                      <AlertDialog.Heading className="flex items-center gap-3">
                        <h3>
                          {(() => {
                            if (statusToggleConfig.getDialogTitle) {
                              return statusToggleConfig.getDialogTitle(statusChangingItem);
                            }
                            return isActive(statusChangingItem) ? '¿Desactivar?' : '¿Activar?';
                          })()}
                        </h3>
                      </AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <p className="text-sm text-muted">
                        {(() => {
                          const name = getItemName(statusChangingItem);
                          if (statusToggleConfig.getDialogMessage) {
                            return statusToggleConfig.getDialogMessage(statusChangingItem, name);
                          }
                          if (isActive(statusChangingItem)) {
                            return (
                              <>
                                {'Está a punto de desactivar '}
                                <span className="font-bold">&ldquo;{name}&rdquo;</span>.
                                ¿Desea continuar?
                              </>
                            );
                          }
                          return (
                            <>
                              {'Está a punto de activar '}
                              <span className="font-bold">&ldquo;{name}&rdquo;</span>.
                              ¿Desea continuar?
                            </>
                          );
                        })()}
                      </p>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button variant="outline" onPress={close} isDisabled={submittingStatus}>
                        Cancelar
                      </Button>
                      <Button
                        variant={isActive(statusChangingItem) ? 'tertiary' : 'primary'}
                        onPress={handleConfirmStatus}
                        isPending={submittingStatus}
                        isDisabled={submittingStatus}
                      >
                        {({ isPending }) => {
                          let icon;
                          let label;
                          
                          if (isPending) {
                            icon = <Spinner color="current" size="sm" />;
                            label = 'Actualizando...';
                          } else if (isActive(statusChangingItem)) {
                            icon = <SquareMinus />;
                            label = 'Sí, desactivar';
                          } else {
                            icon = <SquareCheck />;
                            label = 'Sí, activar';
                          }
                          
                          return (
                            <>
                              {icon}
                              {label}
                            </>
                          );
                        }}
                      </Button>
                    </AlertDialog.Footer>
                  </>
                )}
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      )}

      {extraModals?.({
        records,
        fetchData,
        ...extraState,
      })}
    </div>
  );
}

PaginaAdmin.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  fetchData: PropTypes.func.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  renderCell: PropTypes.func,
  renderStatus: PropTypes.func,
  statusField: PropTypes.string,
  activeStatusValue: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  idField: PropTypes.string,
  getItemName: PropTypes.func,
  onCreate: PropTypes.func,
  onEdit: PropTypes.func,
  onViewDetail: PropTypes.func,
  onToggleStatus: PropTypes.func,
  onDelete: PropTypes.func,
  onSave: PropTypes.func,
  renderForm: PropTypes.func,
  renderDetail: PropTypes.func,
  renderModalFooter: PropTypes.func,
  extraActions: PropTypes.node,
  createButtonText: PropTypes.string,
  createButtonIcon: PropTypes.node,
  emptyStateMessage: PropTypes.string,
  enableCreate: PropTypes.bool,
  enableEdit: PropTypes.bool,
  enableDelete: PropTypes.bool,
  enableViewDetail: PropTypes.bool,
  enableStatusToggle: PropTypes.bool,
  statusToggleConfig: PropTypes.object,
  extraModals: PropTypes.func,
  extraState: PropTypes.object,
  renderRowActions: PropTypes.func,
  headerActions: PropTypes.node,
};
