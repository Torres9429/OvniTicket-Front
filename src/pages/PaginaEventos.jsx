import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
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
import { usarAutenticacion } from '../hooks/usarAutenticacion';
import {
  obtenerEventos,
  obtenerTodosLosEventos,
  crearEvento,
  actualizarEvento,
  desactivarEvento,
  reactivarEvento,
} from '../services/eventos.api';
import { obtenerLugares } from '../services/lugares.api';
import { normalizarRol } from '../utils/rutasAutorizacion';

const FORMULARIO_VACIO = {
  nombre: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
  tiempo_espera: 0,
  foto: '',
  estatus: true,
  id_lugar: '',
  id_version: '',
};

/**
 * PaginaEventos — CRUD funcional con FK a Lugares y Layouts
 */
export default function PaginaEventos() {
  const { usuario } = usarAutenticacion();
  const rol = normalizarRol(usuario?.rol);

  const [eventos, setEventos] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [cargando, setcargando] = useState(true);
  const [modalAbierto, setmodalAbierto] = useState(false);
  const [deletemodalAbierto, setDeletemodalAbierto] = useState(false);
  const [eventoEnEdicion, seteventoEnEdicion] = useState(null);
  const [eventoBorrando, seteventoBorrando] = useState(null);
  const [enviando, setenviando] = useState(false);
  const [formulario, setFormulario] = useState({ ...FORMULARIO_VACIO });

  /* ─── buscador global ─── */
  const contextoGlobal = useOutletContext();
  const busquedaGlobal = contextoGlobal?.busquedaGlobal || '';

  const eventosFiltrados = useMemo(() => {
    const q = busquedaGlobal.toLowerCase();
    if (!q) return eventos;
    return eventos.filter((ev) => 
      ev.nombre?.toLowerCase().includes(q) || 
      ev.descripcion?.toLowerCase().includes(q)
    );
  }, [eventos, busquedaGlobal]);

  // Cargar datos
  const cargarDatos = async () => {
    setcargando(true);
    try {
      const [eventosData, lugaresData] = await Promise.all([
        rol === 'ADMIN' ? obtenerTodosLosEventos() : obtenerEventos(),
        obtenerLugares(),
      ]);
      setEventos(Array.isArray(eventosData) ? eventosData : []);
      setLugares(Array.isArray(lugaresData) ? lugaresData : []);
    } catch (err) {
      console.error('Error cargando datos:', err);
      toast.error('Error al cargar los datos');
    } finally {
      setcargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Abrir modal para crear
  const handleCreate = () => {
    seteventoEnEdicion(null);
    setFormulario({ ...FORMULARIO_VACIO });
    setmodalAbierto(true);
  };

  // Abrir modal para editar
  const handleEdit = (evento) => {
    seteventoEnEdicion(evento);
    setFormulario({
      nombre: evento.nombre || '',
      descripcion: evento.descripcion || '',
      fecha_inicio: evento.fecha_inicio ? evento.fecha_inicio.slice(0, 16) : '',
      fecha_fin: evento.fecha_fin ? evento.fecha_fin.slice(0, 16) : '',
      tiempo_espera: evento.tiempo_espera || 0,
      foto: evento.foto || '',
      estatus: evento.estatus ?? true,
      id_lugar: evento.id_lugar ? String(evento.id_lugar) : '',
      id_version: evento.id_version ? String(evento.id_version) : '',
    });
    setmodalAbierto(true);
  };

  // Confirmar desactivación
  const handleDeleteConfirm = (evento) => {
    seteventoBorrando(evento);
    setDeletemodalAbierto(true);
  };

  // Guardar (crear o actualizar)
  const handleSave = async () => {
    if (!formulario.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!formulario.id_lugar) {
      toast.error('Selecciona un lugar');
      return;
    }

    setenviando(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        ...formulario,
        id_lugar: Number(formulario.id_lugar),
        id_version: formulario.id_version ? Number(formulario.id_version) : 1,
        tiempo_espera: Number(formulario.tiempo_espera),
      };

      if (eventoEnEdicion) {
        await actualizarEvento(eventoEnEdicion.id_evento, payload);
        toast.success('Evento actualizado correctamente');
      } else {
        payload.fecha_creacion = now;
        payload.fecha_actualizacion = now;
        await crearEvento(payload);
        toast.success('Evento creado correctamente');
      }

      setmodalAbierto(false);
      await cargarDatos();
    } catch (err) {
      console.error('Error guardando evento:', err);
      toast.error('Error al guardar el evento');
    } finally {
      setenviando(false);
    }
  };

  // Desactivar evento
  const handleDeactivate = async () => {
    if (!eventoBorrando) return;
    setenviando(true);
    try {
      await desactivarEvento(eventoBorrando.id_evento);
      toast.success('Evento desactivado');
      setDeletemodalAbierto(false);
      seteventoBorrando(null);
      await cargarDatos();
    } catch (err) {
      console.error('Error desactivando:', err);
      toast.error('Error al desactivar el evento');
    } finally {
      setenviando(false);
    }
  };

  // Reactivar evento
  const handleReactivate = async (evento) => {
    try {
      await reactivarEvento(evento.id_evento);
      toast.success('Evento reactivado');
      await cargarDatos();
    } catch (err) {
      console.error('Error reactivando:', err);
      toast.error('Error al reactivar el evento');
    }
  };

  // Helper para nombre del lugar por ID
  const obtenerNombreLugar = (id) => {
    const lugar = lugares.find((l) => l.id_lugar === id);
    return lugar ? lugar.nombre : `ID: ${id}`;
  };

  const manejarCambioFormulario = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex flex-col w-full px-[56px] py-9 gap-6">
      {/* Header */}
      <div className="flex justify-between items-center px-3">
        <div>
          <h2>Gestión de Eventos</h2>
          <p className="text-sm text-muted-foreground">
            Administra los eventos del sistema ({eventos.length} registros)
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
                  items={eventosFiltrados}
                  renderEmptyState={() => (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                      {cargando ? 'Cargando...' : 'No se encontraron resultados.'}
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
                        {obtenerNombreLugar(evento.id_lugar)}
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
                      {evento.estatus ? (
                        <span className="flex items-center gap-1 text-success text-xs font-medium">
                          <CircleCheck className="w-3.5 h-3.5" />
                          Activo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-danger text-xs font-medium">
                          <CircleXmark className="w-3.5 h-3.5" />
                          Inactivo
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          isIconOnly
                          onPress={() => handleEdit(evento)}
                          aria-label="Editar"
                        >
                          <Pencil />
                        </Button>
                        {evento.estatus ? (
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
                        ) : (
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
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
        ), [eventosFiltrados, cargando, lugares])}
      </Card>

      {/* Modal Crear/Editar */}
      <Modal>
        <Modal.Backdrop isOpen={modalAbierto} onOpenChange={setmodalAbierto}>
          <Modal.Container size="lg">
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>
                      {eventoEnEdicion ? 'Editar Evento' : 'Nuevo Evento'}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col gap-4">
                    <TextField name="nombre" isRequired fullWidth>
                      <Label>Nombre</Label>
                      <Input
                        placeholder="Nombre del evento"
                        value={formulario.nombre}
                        onChange={manejarCambioFormulario}
                      />
                    </TextField>

                    <TextField name="descripcion" fullWidth>
                      <Label>Descripción</Label>
                      <Input
                        placeholder="Descripción breve"
                        value={formulario.descripcion}
                        onChange={manejarCambioFormulario}
                      />
                    </TextField>

                    {/* FK Select — Lugar (vía Autocomplete) */}
                    <Autocomplete
                      value={formulario.id_lugar ? String(formulario.id_lugar) : null}
                      onChange={(val) => setFormulario({ ...formulario, id_lugar: val })}
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
                            {lugares.map((lugar) => (
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
                          value={formulario.fecha_inicio}
                          onChange={manejarCambioFormulario}
                        />
                      </TextField>

                      <TextField name="fecha_fin" isRequired fullWidth>
                        <Label>Fecha Fin</Label>
                        <Input
                          type="datetime-local"
                          value={formulario.fecha_fin}
                          onChange={manejarCambioFormulario}
                        />
                      </TextField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <TextField name="tiempo_espera" fullWidth>
                        <Label>Tiempo Espera (min)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={String(formulario.tiempo_espera)}
                          onChange={manejarCambioFormulario}
                        />
                      </TextField>

                      <TextField name="foto" fullWidth>
                        <Label>URL Foto</Label>
                        <Input
                          placeholder="https://..."
                          value={formulario.foto}
                          onChange={manejarCambioFormulario}
                        />
                      </TextField>
                    </div>

                    <TextField name="id_version" fullWidth>
                      <Label>ID Plantilla/Versión (FK)</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="ID de versión de layout"
                        value={String(formulario.id_version)}
                        onChange={manejarCambioFormulario}
                      />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="outline" onPress={close}>
                      Cancelar
                    </Button>
                    <Button onPress={handleSave} isDisabled={enviando}>
                      {enviando
                        ? 'Guardando...'
                        : eventoEnEdicion
                          ? 'Actualizar'
                          : 'Crear'}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Modal Confirmar Desactivar */}
      <Modal>
        <Modal.Backdrop isOpen={deletemodalAbierto} onOpenChange={setDeletemodalAbierto}>
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
                      ¿Estás seguro de que deseas desactivar el evento{' '}
                      <span className="font-bold">
                        &ldquo;{eventoBorrando?.nombre}&rdquo;
                      </span>
                      ?
                    </p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="outline" onPress={close}>
                      Cancelar
                    </Button>
                    <Button
                      color="danger"
                      onPress={handleDeactivate}
                      isDisabled={enviando}
                    >
                      {enviando ? 'Desactivando...' : 'Desactivar'}
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
