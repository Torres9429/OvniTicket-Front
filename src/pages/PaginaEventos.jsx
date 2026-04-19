import { useCallback, useEffect, useState, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Button,
  Card,
  Modal,
  Table,
  TextField,
  Input,
  Label,
  Autocomplete,
  SearchField,
  ListBox,
  toast,
} from '@heroui/react';
import {
  Plus,
  Pencil,
  TrashBin,
  CircleCheck,
  CircleXmark,
  ArrowRotateLeft,
} from '@gravity-ui/icons';
import {
  getEvents,
  getAllEvents,
  createEvent,
  updateEvent,
  deactivateEvent,
  reactivateEvent,
} from '../services/eventos.api';
import { getVenues } from '../services/lugares.api';
import { normalizeRole } from '../utils/rutasAutorizacion';
import { useAuth } from '../hooks/useAuth';

const EMPTY_FORM = {
  nombre: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
  tiempo_espera: 0,
  foto: '',
  estatus: 'BORRADOR',
  id_lugar: '',
  id_version: '',
};

/**
 * PaginaEventos — Functional CRUD with FK to Lugares and Layouts
 */
export default function PaginaEventos() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);

  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const outletContext = useOutletContext();
  const globalSearch = outletContext?.globalSearch || '';

  const filteredEvents = useMemo(() => {
    const q = globalSearch.toLowerCase();
    if (!q) return events;
    return events.filter((ev) => 
      ev.nombre?.toLowerCase().includes(q) || 
      ev.descripcion?.toLowerCase().includes(q)
    );
  }, [events, globalSearch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsData, venuesData] = await Promise.all([
        role === 'ADMIN' ? getAllEvents() : getEvents(),
        getVenues(),
      ]);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setVenues(Array.isArray(venuesData) ? venuesData : []);
    } catch (err) {
      console.error('Error cargando datos:', err);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setEditingEvent(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const handleEdit = useCallback((evento) => {
    setEditingEvent(evento);
    setForm({
      nombre: evento.nombre || '',
      descripcion: evento.descripcion || '',
      fecha_inicio: evento.fecha_inicio ? evento.fecha_inicio.slice(0, 16) : '',
      fecha_fin: evento.fecha_fin ? evento.fecha_fin.slice(0, 16) : '',
      tiempo_espera: evento.tiempo_espera || 0,
      foto: evento.foto || '',
      estatus: evento.estatus || 'BORRADOR',
      id_lugar: evento.id_lugar ? String(evento.id_lugar) : '',
      id_version: evento.id_version ? String(evento.id_version) : '',
    });
    setModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback((evento) => {
    setDeletingEvent(evento);
    setDeleteModalOpen(true);
  }, []);

  // Save (create or update)
  const handleSave = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!form.id_lugar) {
      toast.error('Selecciona un lugar');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        ...form,
        id_lugar: Number(form.id_lugar),
        id_version: form.id_version ? Number(form.id_version) : 1,
        tiempo_espera: Number(form.tiempo_espera),
      };

      if (editingEvent) {
        await updateEvent(editingEvent.id_evento, payload);
        toast.success('Evento actualizado correctamente');
      } else {
        payload.fecha_creacion = now;
        payload.fecha_actualizacion = now;
        await createEvent(payload);
        toast.success('Evento creado correctamente');
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Error guardando evento:', err);
      toast.error('Error al guardar el evento');
    } finally {
      setSubmitting(false);
    }
  };

  // Deactivate event
  const handleDeactivate = async () => {
    if (!deletingEvent) return;
    setSubmitting(true);
    try {
      await deactivateEvent(deletingEvent.id_evento);
      toast.success('Evento desactivado');
      setDeleteModalOpen(false);
      setDeletingEvent(null);
      await loadData();
    } catch (err) {
      console.error('Error desactivando:', err);
      toast.error('Error al desactivar el evento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = useCallback(async (evento) => {
    try {
      await reactivateEvent(evento.id_evento);
      toast.success('Evento reactivado');
      await loadData();
    } catch (err) {
      console.error('Error reactivando:', err);
      toast.error('Error al reactivar el evento');
    }
  }, [loadData]);

  const getVenueName = useCallback((id) => {
    const venue = venues.find((l) => l.id_lugar === id);
    return venue ? venue.nombre : `ID: ${id}`;
  }, [venues]);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex flex-col w-full px-[56px] py-9 gap-6">
      {/* Header */}
      <div className="flex justify-between items-center px-3">
        <div>
          <h2>Gestión de Eventos</h2>
          <p className="text-sm text-muted-foreground">
            Administra los eventos del sistema ({events.length} registros)
          </p>
        </div>
        <Button onPress={handleCreate}>
          <Plus />
          Nuevo Evento
        </Button>
      </div>

      {/* Tabla */}
      <Card className="bg-surface p-0 overflow-hidden">
        {useMemo(() => (
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Tabla de eventos">
                <Table.Header>
                  <Table.Column>ID</Table.Column>
                  <Table.Column>Nombre</Table.Column>
                  <Table.Column>Lugar (FK)</Table.Column>
                  <Table.Column>Fecha Inicio</Table.Column>
                  <Table.Column>Estatus</Table.Column>
                  <Table.Column>Acciones</Table.Column>
                </Table.Header>
                <Table.Body
                  items={filteredEvents}
                  renderEmptyState={() => (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                      {loading ? 'Cargando...' : 'No se encontraron resultados.'}
                    </div>
                  )}
                >
                {(evento) => (
                  <Table.Row key={evento.id_evento}>
                    <Table.Cell>{evento.id_evento}</Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col">
                        <span className="font-medium">{evento.nombre}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {evento.descripcion}
                        </span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-medium">
                        {getVenueName(evento.id_lugar)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      {evento.fecha_inicio
                        ? new Date(evento.fecha_inicio).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </Table.Cell>
                    <Table.Cell>
                      {evento.estatus === 'CANCELADO' ? (
                        <span className="flex items-center gap-1 text-danger text-xs font-medium">
                          <CircleXmark className="w-3.5 h-3.5" />
                          {evento.estatus}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-success text-xs font-medium">
                          <CircleCheck className="w-3.5 h-3.5" />
                          {evento.estatus}
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          as={Link}
                          to={`/eventos/${evento.id_evento}`}
                          aria-label="Ver evento"
                        >
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          isIconOnly
                          onPress={() => handleEdit(evento)}
                          aria-label="Editar"
                        >
                          <Pencil />
                        </Button>
                        {evento.estatus === 'CANCELADO' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            color="success"
                            isIconOnly
                            onPress={() => handleReactivate(evento)}
                            aria-label="Reactivar"
                          >
                            <ArrowRotateLeft />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            color="danger"
                            isIconOnly
                            onPress={() => handleDeleteConfirm(evento)}
                            aria-label="Desactivar"
                          >
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
        </Table>
        ), [filteredEvents, loading, handleEdit, handleDeleteConfirm, handleReactivate, getVenueName])}
      </Card>

      {/* Create/Edit Modal */}
      <Modal>
        <Modal.Backdrop isOpen={modalOpen} onOpenChange={setModalOpen}>
          <Modal.Container size="lg">
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>
                      {editingEvent ? 'Editar Evento' : 'Nuevo Evento'}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col gap-4">
                    <TextField name="nombre" isRequired fullWidth>
                      <Label>Nombre</Label>
                      <Input
                        placeholder="Nombre del evento"
                        value={form.nombre}
                        onChange={handleFormChange}
                      />
                    </TextField>

                    <TextField name="descripcion" fullWidth>
                      <Label>Descripción</Label>
                      <Input
                        placeholder="Descripción breve"
                        value={form.descripcion}
                        onChange={handleFormChange}
                      />
                    </TextField>

                    {/* FK Select — Lugar (via Autocomplete) */}
                    <Autocomplete
                      value={form.id_lugar ? String(form.id_lugar) : null}
                      onChange={(val) => setForm({ ...form, id_lugar: val })}
                    >
                      <Label>Lugar</Label>
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
                              <SearchField.Input placeholder="Escribe para buscar..." />
                            </SearchField.Group>
                          </SearchField>
                          <ListBox>
                            {venues.map((lugar) => (
                              <ListBox.Item
                                id={String(lugar.id_lugar)}
                                key={String(lugar.id_lugar)}
                                textValue={`${lugar.nombre} — ${lugar.ciudad}`}
                              >
                                {lugar.nombre} — {lugar.ciudad}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Autocomplete.Filter>
                      </Autocomplete.Popover>
                    </Autocomplete>

                    <div className="grid grid-cols-2 gap-4">
                      <TextField name="fecha_inicio" isRequired fullWidth>
                        <Label>Fecha Inicio</Label>
                        <Input
                          type="datetime-local"
                          value={form.fecha_inicio}
                          onChange={handleFormChange}
                        />
                      </TextField>

                      <TextField name="fecha_fin" isRequired fullWidth>
                        <Label>Fecha Fin</Label>
                        <Input
                          type="datetime-local"
                          value={form.fecha_fin}
                          onChange={handleFormChange}
                        />
                      </TextField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <TextField name="tiempo_espera" fullWidth>
                        <Label>Tiempo Espera (min)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={String(form.tiempo_espera)}
                          onChange={handleFormChange}
                        />
                      </TextField>

                      <TextField name="foto" fullWidth>
                        <Label>URL Foto</Label>
                        <Input
                          placeholder="https://..."
                          value={form.foto}
                          onChange={handleFormChange}
                        />
                      </TextField>
                    </div>

                    <TextField name="id_version" fullWidth>
                      <Label>ID Plantilla/Versión (FK)</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="ID de versión de layout"
                        value={String(form.id_version)}
                        onChange={handleFormChange}
                      />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="outline" onPress={close}>
                      Cancelar
                    </Button>
                    <Button onPress={handleSave} isDisabled={submitting}>
                      {(() => {
                        if (submitting) return 'Guardando...';
                        if (editingEvent) return 'Actualizar';
                        return 'Crear';
                      })()}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Confirm Deactivate Modal */}
      <Modal>
        <Modal.Backdrop isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>Confirmar Desactivación</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <p className="text-sm">
                      ¿Estás seguro de que deseas desactivar el evento <span className="font-bold">&ldquo;{deletingEvent?.nombre}&rdquo;</span>?
                    </p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="outline" onPress={close}>
                      Cancelar
                    </Button>
                    <Button
                      color="danger"
                      onPress={handleDeactivate}
                      isDisabled={submitting}
                    >
                      {submitting ? 'Desactivando...' : 'Desactivar'}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
