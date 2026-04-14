import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Checkbox,
  Chip,
  Input,
  Label,
  Spinner,
  TextField,
  FieldError,
  toast,
  AlertDialog,
  Select,
  ListBox,
} from '@heroui/react';
import {
  Pencil,
  Plus,
  PencilToSquare,
  ChevronRight,
  SquareCheck,
  SquareMinus,
  LayoutHeaderColumns,
} from '@gravity-ui/icons';
import ContenedorIcono from '../components/ContenedorIcono';
import PaginaAdmin from '../components/PaginaAdmin';
import {
  getAllVenues,
  getVenue,
  createVenue,
  updateVenue,
  deactivateVenue,
  reactivateVenue,
} from '../services/lugares.api';
import { getLatestLayoutVersion } from '../services/layouts.api';
import { useAuth } from '../hooks/useAuth';

const EMPTY_FORM = {
  nombre: '',
  ciudad: '',
  pais: '',
  direccion: '',
  estatus: 'BORRADOR',
};

const STATUS_COLOR = {
  BORRADOR: 'warning',
  PUBLICADO: 'accent',
  INHABILITADO: 'default',
};

const formatReadableDate = (dateString) => {
  if (!dateString) return null;
  const isDatetime = dateString.includes('T');
  const dateWithTime = isDatetime ? dateString : dateString + 'T12:00:00';
  const date = new Date(dateWithTime);
  const options = isDatetime
    ? {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('es-MX', options);
};

const columns = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'pais', label: 'País' },
];

export default function PaginaLugares() {
  const { usuario: user } = useAuth();
  const navigate = useNavigate();
  const currentOwnerId = user?.idUsuario || user?.id_usuario || user?.id || null;

  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [createConfirmed, setCreateConfirmed] = useState(false);
  const [layoutSuggestionOpen, setLayoutSuggestionOpen] = useState(false);
  const [recentlyCreatedVenue, setRecentlyCreatedVenue] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [serverErrors, setServerErrors] = useState({});

  const fetchData = useCallback(async () => {
    const data = await getAllVenues();
    return Array.isArray(data) ? data : [];
  }, []);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (serverErrors[e.target.name]) {
      setServerErrors((prev) => {
        const updated = { ...prev };
        delete updated[e.target.name];
        return updated;
      });
    }
  };

  const handleSave = async (editingRecord) => {
    setAttemptedSubmit(true);

    if (!form.nombre.trim()) {
      toast.danger('El nombre es obligatorio', {
        description: 'Este campo no puede estar vacío.',
      });
      throw new Error('Validación fallida');
    }
    if (!form.ciudad.trim()) {
      toast.danger('La ciudad es obligatoria', {
        description: 'Este campo no puede estar vacío.',
      });
      throw new Error('Validación fallida');
    }
    if (!form.pais.trim()) {
      toast.danger('El país es obligatorio', {
        description: 'Este campo no puede estar vacío.',
      });
      throw new Error('Validación fallida');
    }
    if (!form.direccion.trim()) {
      toast.danger('La dirección es obligatoria', {
        description: 'Este campo no puede estar vacío.',
      });
      throw new Error('Validación fallida');
    }

    if (!editingRecord) {
      setCreateConfirmed(false);
      setCreateConfirmOpen(true);
      throw new Error('Necesita confirmación');
    }

    return await executeSubmit(editingRecord);
  };

  const executeSubmit = async (editingRecord) => {
    const now = new Date().toISOString();
    const payload = {
      nombre: form.nombre,
      ciudad: form.ciudad,
      pais: form.pais,
      direccion: form.direccion,
      estatus: form.estatus || 'BORRADOR',
      id_dueno: currentOwnerId,
    };

    if (editingRecord) {
      payload.fecha_actualizacion = now;
      await updateVenue(editingRecord.id_lugar, payload);
      toast.success('Lugar actualizado correctamente', {
        description: 'Los cambios se guardaron exitosamente.',
      });
    } else {
      payload.fecha_creacion = now;
      payload.fecha_actualizacion = now;
      const newVenue = await createVenue(payload);
      toast.success('Lugar creado correctamente', {
        description: 'El nuevo lugar ha sido registrado en el sistema.',
      });
      setRecentlyCreatedVenue(newVenue);
    }

    return editingRecord;
  };

  const handleConfirmCreate = async () => {
    await executeSubmit(null);
    setCreateConfirmOpen(false);
    setLayoutSuggestionOpen(true);
  };

  const handleToggleStatus = async (item, currentStatus) => {
    if (currentStatus === 'PUBLICADO' || currentStatus === 'BORRADOR') {
      await deactivateVenue(item.id_lugar);
    } else if (currentStatus === 'INHABILITADO') {
      await reactivateVenue(item.id_lugar);
    }
    return currentStatus === 'INHABILITADO'
      ? 'Lugar reactivado correctamente'
      : 'Lugar inhabilitado correctamente';
  };

  const handleDelete = async (item) => {
    await deactivateVenue(item.id_lugar);
  };

  const handleGoToLatestLayout = async (item) => {
    try {
      const data = await getLatestLayoutVersion(item.id_lugar);
      if (data?.id_layout) {
        navigate(`/lugares/${item.id_lugar}/layouts/${data.id_layout}`);
      } else {
        toast.danger('No se encontró un layout para este lugar', {
          description: 'El lugar no tiene layouts registrados aún.',
        });
      }
    } catch {
      toast.danger('Error al obtener el último layout', {
        description: 'No se pudo consultar el layout. Intenta de nuevo.',
      });
    }
  };

  const handleGoToLayouts = (item) => {
    if (!item?.id_lugar) {
      toast.danger('No se encontró el lugar para ver los layouts', {
        description: 'El lugar no tiene un ID válido.',
      });
      return;
    }
    navigate(`/lugares/${item.id_lugar}/layouts`);
  };

  const renderCell = (item, key) => {
    if (key === 'nombre') {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{item.nombre}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {item.direccion}
          </span>
        </div>
      );
    }
    return item[key];
  };

  const renderRowActions = (item) => (
    <Button
      variant="ghost"
      size="sm"
      isIconOnly
      onPress={() => handleGoToLayouts(item)}
      aria-label="Ver layouts"
    >
      <LayoutHeaderColumns />
    </Button>
  );

  const renderForm = ({ editingRecord, onClose }) => {
    return (
      <div className="flex flex-col gap-5 w-full pt-6 pb-6">
        <TextField
          name="nombre"
          aria-label="Nombre del lugar"
          isRequired
          fullWidth
          variant="secondary"
          isInvalid={(attemptedSubmit && !form.nombre.trim()) || !!serverErrors.nombre}
        >
          <Label>Nombre</Label>
          <Input
            placeholder="Nombre del lugar"
            value={form.nombre}
            onChange={handleFormChange}
          />
          {serverErrors.nombre && <FieldError>{serverErrors.nombre[0]}</FieldError>}
          {!serverErrors.nombre && attemptedSubmit && !form.nombre.trim() && (
            <FieldError>El nombre es obligatorio.</FieldError>
          )}
        </TextField>

        <TextField
          name="ciudad"
          aria-label="Ciudad del lugar"
          isRequired
          fullWidth
          variant="secondary"
          isInvalid={(attemptedSubmit && !form.ciudad.trim()) || !!serverErrors.ciudad}
        >
          <Label>Ciudad</Label>
          <Input
            placeholder="Ciudad"
            value={form.ciudad}
            onChange={handleFormChange}
          />
          {serverErrors.ciudad && <FieldError>{serverErrors.ciudad[0]}</FieldError>}
          {!serverErrors.ciudad && attemptedSubmit && !form.ciudad.trim() && (
            <FieldError>La ciudad es obligatoria.</FieldError>
          )}
        </TextField>

        <TextField
          name="pais"
          aria-label="País del lugar"
          isRequired
          fullWidth
          variant="secondary"
          isInvalid={(attemptedSubmit && !form.pais.trim()) || !!serverErrors.pais}
        >
          <Label>País</Label>
          <Input
            placeholder="País"
            value={form.pais}
            onChange={handleFormChange}
          />
          {serverErrors.pais && <FieldError>{serverErrors.pais[0]}</FieldError>}
          {!serverErrors.pais && attemptedSubmit && !form.pais.trim() && (
            <FieldError>El país es obligatorio.</FieldError>
          )}
        </TextField>

        <TextField
          name="direccion"
          aria-label="Dirección del lugar"
          isRequired
          fullWidth
          variant="secondary"
          isInvalid={(attemptedSubmit && !form.direccion.trim()) || !!serverErrors.direccion}
        >
          <Label>Dirección</Label>
          <Input
            placeholder="Dirección completa"
            value={form.direccion}
            onChange={handleFormChange}
          />
          {serverErrors.direccion && <FieldError>{serverErrors.direccion[0]}</FieldError>}
          {!serverErrors.direccion && attemptedSubmit && !form.direccion.trim() && (
            <FieldError>La dirección es obligatoria.</FieldError>
          )}
        </TextField>

        <Select
          isRequired
          className="w-full"
          name="estatus"
          aria-label="Estatus del lugar"
          selectedKey={form.estatus}
          onSelectionChange={(key) => setForm({ ...form, estatus: key })}
          variant="secondary"
        >
          <Label>Estatus</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="BORRADOR" textValue="Borrador">
                Borrador
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="PUBLICADO" textValue="Publicado">
                Publicado
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="INHABILITADO" textValue="Inhabilitado">
                Inhabilitado
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
          <FieldError />
        </Select>

        {editingRecord && (
          <>
            <div className="flex justify-between">
              <Label className="text-sm font-medium">Estado del lugar:</Label>
              <Chip
                color={STATUS_COLOR[editingRecord.estatus] || 'default'}
                variant="soft"
              >
                {editingRecord.estatus === 'INHABILITADO' ? <SquareMinus /> : <SquareCheck />}
                <Chip.Label className="uppercase">
                  {editingRecord.estatus || 'no definido'}
                </Chip.Label>
              </Chip>
            </div>
            <div className="flex flex-col items-end gap-5">
              <Button
                variant="outline"
                onPress={() => {
                  onClose();
                  handleGoToLatestLayout(editingRecord);
                }}
              >
                <Pencil />
                Editar última versión de layout
                <ChevronRight />
              </Button>
              <Button
                variant="outline"
                onPress={() => {
                  onClose();
                  handleGoToLayouts(editingRecord);
                }}
              >
                <LayoutHeaderColumns />
                Ver todos los layouts
                <ChevronRight />
              </Button>
            </div>
          </>
        )}

      </div>
    );
  };

  const renderModalFooter = ({ close, editingRecord, submitting }) => (
    <>
      <Button variant="ghost" onPress={close}>
        Cancelar
      </Button>
      <Button
        color="primary"
        onPress={async () => {
          setAttemptedSubmit(true);
          if (!form.nombre.trim() || !form.ciudad.trim() || !form.pais.trim() || !form.direccion.trim()) {
            toast.danger('Complete todos los campos obligatorios');
            return;
          }
          try {
            await handleSave(editingRecord);
          } catch (err) {
            if (err.message !== 'Necesita confirmación') throw err;
          }
        }}
        isPending={submitting}
        isDisabled={submitting}
        className="font-semibold"
        fullWidth
      >
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
    </>
  );

  const renderDetail = ({ detailRecord, onClose, onEdit }) => (
    <div className="flex flex-col gap-5 w-full pt-6 pb-6">
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">Estado del lugar:</Label>
        <Chip
          color={STATUS_COLOR[detailRecord.estatus] || 'default'}
          variant="soft"
        >
          {detailRecord.estatus === 'INHABILITADO' ? <SquareMinus /> : <SquareCheck />}
          <Chip.Label className="uppercase">
            {detailRecord.estatus || 'no definido'}
          </Chip.Label>
        </Chip>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-sm">Nombre</Label>
        <span className="text-sm font-medium">{detailRecord.nombre}</span>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-sm">Ciudad</Label>
        <span className="text-sm">{detailRecord.ciudad}</span>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-sm">País</Label>
        <span className="text-sm">{detailRecord.pais}</span>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-sm">Dirección</Label>
        <span className="text-sm">{detailRecord.direccion}</span>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-sm">Fecha de creación</Label>
        <span className="text-sm">
          {detailRecord.fecha_creacion ? formatReadableDate(detailRecord.fecha_creacion) : '—'}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-sm">Última actualización</Label>
        <span className="text-sm">
          {detailRecord.fecha_actualizacion
            ? formatReadableDate(detailRecord.fecha_actualizacion)
            : '—'}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-sm">ID Dueño</Label>
        <span className="text-sm">{detailRecord.id_dueno || '—'}</span>
      </div>

      <div className="flex flex-col items-end gap-5">
        <Button
          variant="outline"
          onPress={() => {
            onClose();
            handleGoToLatestLayout(detailRecord);
          }}
        >
          <Pencil />
          Editar última versión de layout
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          onPress={() => {
            onClose();
            handleGoToLayouts(detailRecord);
          }}
        >
          <LayoutHeaderColumns />
          Ver todos los layouts
          <ChevronRight />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <PaginaAdmin
        title="Lugares registrados"
        subtitle="Administra los lugares del sistema"
        fetchData={fetchData}
        columns={columns}
        renderCell={renderCell}
        idField="id_lugar"
        getItemName={(item) => item.nombre}
        onEdit={async (item) => {
          const data = await getVenue(item.id_lugar);
          setForm({
            nombre: data.nombre || '',
            ciudad: data.ciudad || '',
            pais: data.pais || '',
            direccion: data.direccion || '',
            estatus: data.estatus || 'BORRADOR',
          });
          setAttemptedSubmit(false);
          setServerErrors({});
          return data;
        }}
        onViewDetail={async (item) => await getVenue(item.id_lugar)}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        onSave={handleSave}
        renderForm={renderForm}
        renderModalFooter={renderModalFooter}
        renderDetail={renderDetail}
        renderRowActions={renderRowActions}
        statusField="estatus"
        activeStatusValue="HABILITADO"
        createButtonText="Registrar"
        emptyStateMessage="No se encontraron resultados."
        extraState={{}}
      />

      <AlertDialog>
        <AlertDialog.Backdrop isOpen={createConfirmOpen} onOpenChange={setCreateConfirmOpen}>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de registro de lugar">
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
                      <h3>¿Registrar lugar?</h3>
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de registrar un nuevo lugar. ¿Desea continuar?
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
                            Confirmo que los datos son correctos y el lugar será registrado en el
                            sistema.
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
                      onPress={handleConfirmCreate}
                      isDisabled={!createConfirmed}
                    >
                      <Plus />
                      Sí, registrar
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      <AlertDialog>
        <AlertDialog.Backdrop isOpen={layoutSuggestionOpen} onOpenChange={setLayoutSuggestionOpen}>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Sugerencia de creación de layout">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div>
                      <ContenedorIcono size="md">
                        <LayoutHeaderColumns className="size-6 text-accent" />
                      </ContenedorIcono>
                    </div>
                    <AlertDialog.Heading className="flex items-center gap-3">
                      <h3>¿Crear un layout?</h3>
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted">
                      El lugar{' '}
                      <span className="font-bold">
                        &ldquo;{recentlyCreatedVenue?.nombre}&rdquo;
                      </span>{' '}
                      fue registrado exitosamente. ¿Desea crear un layout para este lugar ahora?
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="outline" onPress={close}>
                      Más tarde
                    </Button>
                    <Button
                      color="primary"
                      onPress={() => {
                        setLayoutSuggestionOpen(false);
                        if (recentlyCreatedVenue?.id_lugar) {
                          navigate(`/lugares/${recentlyCreatedVenue.id_lugar}/layouts/0`);
                        }
                      }}
                    >
                      <Plus />
                      Crear layout
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}
