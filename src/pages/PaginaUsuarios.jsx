import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Chip,
  Calendar,
  Input,
  Label,
  ListBox,
  Spinner,
  TextField,
  toast,
  FieldError,
  AlertDialog,
  Description,
  Select,
} from '@heroui/react';
import { parseDate } from '@internationalized/date';
import {
  EyeSlash,
  Eye,
  Plus,
  Check,
  SquareCheck,
  SquareMinus,
  SquareExclamation,
  PencilToSquare,
  ChevronRight,
  PaperPlane,
} from '@gravity-ui/icons';
import ContenedorIcono from '../components/ContenedorIcono';
import PaginaAdmin from '../components/PaginaAdmin';
import DateFieldInput from '../components/DateFieldInput';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  approveUser,
  deactivateUser,
  reactivateUser,
} from '../services/usuarios.api';
import { getRoles } from '../services/roles.api';

const EMPTY_FORM = {
  nombre: '',
  apellidos: '',
  correo: '',
  contrasena: '',
  fecha_nacimiento: '',
  id_rol: '',
  estatus: '-',
};

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

const columns = [
  { key: 'nombre_completo', label: 'Nombre' },
  { key: 'correo', label: 'Correo' },
  { key: 'rol', label: 'Rol' },
  { key: 'fecha_creacion', label: 'Fecha de creación' },
];

const getStatusDialogMessage = (item, name) => {
  if (item.estatus === 'activo') {
    return (
      <>
        Está a punto de desactivar al usuario <span className="font-bold">&ldquo;{name}&rdquo;</span>. El usuario no podrá acceder al sistema. ¿Desea continuar?
      </>
    );
  }
  return (
    <>
      Está a punto de reactivar al usuario <span className="font-bold">&ldquo;{name}&rdquo;</span>. El usuario podrá volver a acceder al sistema. ¿Desea continuar?
    </>
  );
};

export default function PaginaUsuarios() {
  const [roles, setRoles] = useState([]);
  const [viewRequests, setViewRequests] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [approveConfirmed, setApproveConfirmed] = useState(false);
  const [approvingRecord, setApprovingRecord] = useState(null);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [createConfirmed, setCreateConfirmed] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [serverErrors, setServerErrors] = useState({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fetchData = async () => {
    const [itemsData, rolesData] = await Promise.all([getUsers(), getRoles()]);
    setRoles(Array.isArray(rolesData) ? rolesData : []);
    
    let data = Array.isArray(itemsData) ? itemsData : [];
    if (viewRequests) {
      data = data.filter((it) => it.estatus === 'pendiente');
    } else {
      data = data.filter((it) => it.estatus === 'activo' || it.estatus === 'inactivo');
    }
    return data;
  };

  useEffect(() => {
    setForm(EMPTY_FORM);
    setServerErrors({});
    setAttemptedSubmit(false);
  }, [viewRequests]);

  const handleApprove = (item) => {
    setApprovingRecord(item);
    setApproveConfirmed(false);
    setApproveConfirmOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!approvingRecord) return;
    try {
      await approveUser(approvingRecord.id_usuario);
      setApproveConfirmOpen(false);
      toast.success('Usuario aprobado correctamente', {
        description: `El usuario "${approvingRecord.nombre} ${approvingRecord.apellidos}" ha sido aprobado y su cuenta activada.`,
      });
      return true;
    } catch {
      toast.danger('No se pudo aprobar el usuario', {
        description: 'Ocurrió un error al intentar aprobar la cuenta. Intenta de nuevo.',
      });
      return false;
    }
  };

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

  const getRoleName = (id) => {
    const role = roles.find((r) => r.id_rol === id);
    return role ? role.nombre : `ID: ${id}`;
  };

  const validateUserForm = (form, isEmailValid, isEditing) => {
    if (!form.nombre.trim()) return ['El nombre es obligatorio', 'Este campo no puede estar vacío.'];
    if (!form.apellidos.trim()) return ['Los apellidos son obligatorios', 'Este campo no puede estar vacío.'];
    if (!form.correo.trim() || !isEmailValid) return ['Ingresa un correo electrónico válido', 'El formato del correo no es correcto.'];
    if (!form.fecha_nacimiento) return ['La fecha de nacimiento es obligatoria', 'Selecciona una fecha válida.'];
    if (!form.id_rol) return ['Selecciona un rol', 'Debes asignar un rol al usuario.'];
    if (!isEditing && !form.contrasena.trim()) return ['La contraseña es obligatoria', 'Debes asignar una contraseña al nuevo usuario.'];
    return null;
  };

  const handleSave = async (data, editingRecord) => {
    setAttemptedSubmit(true);
    const isEmailValid = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(form.correo);

    const validationError = validateUserForm(form, isEmailValid, !!editingRecord);
    if (validationError) {
      setTimeout(() => toast.danger(validationError[0], { description: validationError[1] }), 0);
      throw new Error('Validation failed');
    }

    if (!editingRecord) {
      setCreateConfirmed(false);
      setCreateConfirmOpen(true);
      throw new Error('Necesita confirmación');
    }

    const now = new Date().toISOString();
    const payload = {
      nombre: form.nombre,
      apellidos: form.apellidos,
      correo: form.correo,
      fecha_nacimiento: form.fecha_nacimiento,
      id_rol: Number(form.id_rol),
    };

    try {
      if (editingRecord) {
        payload.fecha_actualizacion = now;
        payload.estatus = form.estatus;
        await updateUser(editingRecord.id_usuario, payload);
        setTimeout(() => toast.success('Usuario actualizado correctamente', { description: 'Los cambios se guardaron exitosamente.' }), 0);
      } else {
        payload.contrasena = form.contrasena;
        payload.fecha_creacion = now;
        payload.fecha_actualizacion = now;
        await createUser(payload);
        setTimeout(() => toast.success('Usuario creado correctamente', { description: 'El nuevo usuario ha sido registrado en el sistema.' }), 0);
      }
      setCreateConfirmOpen(false);
    } catch (err) {
      setCreateConfirmOpen(false);
      if (err.response?.data) {
        setServerErrors(err.response.data);
        const errorData = err.response.data;
        if (typeof errorData === 'string' || Object.keys(errorData).length === 0) {
          setTimeout(() => toast.danger('Error al guardar: verifique los datos ingresados.', {
            description: 'El servidor rechazó la solicitud. Revisa los campos.',
          }), 0);
        } else {
          setTimeout(() => toast.danger('Corrige los errores marcados en el formulario', {
            description: 'Hay campos con errores de validación del servidor.',
          }), 0);
        }
      } else {
        setTimeout(() => toast.danger('Error al guardar el usuario', {
          description: 'No se pudo conectar con el servidor. Intenta de nuevo.',
        }), 0);
      }
      throw err;
    }
  };

  const executeCreateSubmit = async () => {
    const now = new Date().toISOString();
    const payload = {
      nombre: form.nombre,
      apellidos: form.apellidos,
      correo: form.correo,
      fecha_nacimiento: form.fecha_nacimiento,
      id_rol: Number(form.id_rol),
      contrasena: form.contrasena,
      fecha_creacion: now,
      fecha_actualizacion: now,
    };

    await createUser(payload);
    setTimeout(() => toast.success('Usuario creado correctamente', {
      description: 'El nuevo usuario ha sido registrado en el sistema.',
    }), 0);
    setCreateConfirmOpen(false);
  };

  const getFieldError = (fieldName, editingRecord) => {
    if (serverErrors[fieldName]) return serverErrors[fieldName][0];
    if (!attemptedSubmit) return null;

    const validators = {
      nombre: () => (form.nombre.trim() ? null : 'El nombre es obligatorio.'),
      apellidos: () => (form.apellidos.trim() ? null : 'Los apellidos son obligatorios.'),
      fecha_nacimiento: () => (form.fecha_nacimiento ? null : 'La fecha de nacimiento es obligatoria.'),
      correo: () => {
        const isValid = form.correo.trim() && /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(form.correo);
        return isValid ? null : 'Ingresa un correo válido.';
      },
      contrasena: () => (!editingRecord && !form.contrasena.trim() ? 'La contraseña es obligatoria.' : null),
      id_rol: () => (form.id_rol ? null : 'Selecciona un rol de la lista.'),
    };

    return validators[fieldName] ? validators[fieldName]() : null;
  };

  const getStatusProps = (status) => {
    if (status === 'activo') return { color: 'accent', icon: <SquareCheck /> };
    if (status === 'inactivo') return { color: 'default', icon: <SquareMinus /> };
    return { color: 'warning', icon: <SquareExclamation /> };
  };

  const renderForm = ({ editingRecord, onClose }) => {
    const errorNombre = getFieldError('nombre', editingRecord);
    const errorApellidos = getFieldError('apellidos', editingRecord);
    const errorFecha = getFieldError('fecha_nacimiento', editingRecord);
    const errorCorreo = getFieldError('correo', editingRecord);
    const errorContrasena = getFieldError('contrasena', editingRecord);
    const errorRol = getFieldError('id_rol', editingRecord);

    const formStatus = editingRecord ? getStatusProps(editingRecord.estatus) : null;

    return (
    <div className="flex flex-col gap-5 w-full pt-6 pb-6">
      <div className="flex gap-3">
        <TextField
          name="nombre"
          aria-label="Nombre del usuario"
          isRequired
          fullWidth
          variant="secondary"
          isInvalid={!!errorNombre}
        >
          <Label>Nombre</Label>
          <Input placeholder="Nombre" value={form.nombre} onChange={handleFormChange} />
          {errorNombre && <FieldError>{errorNombre}</FieldError>}
        </TextField>

        <TextField
          name="apellidos"
          aria-label="Apellidos del usuario"
          fullWidth
          variant="secondary"
          isRequired
          isInvalid={!!errorApellidos}
        >
          <Label>Apellidos</Label>
          <Input placeholder="Apellidos" value={form.apellidos} onChange={handleFormChange} />
          {errorApellidos && <FieldError>{errorApellidos}</FieldError>}
        </TextField>
      </div>

      <DateFieldInput
        label="Fecha de Nacimiento"
        value={form.fecha_nacimiento}
        onChange={(val) => {
          setForm({ ...form, fecha_nacimiento: val });
          if (serverErrors.fecha_nacimiento) {
            setServerErrors((prev) => {
              const updated = { ...prev };
              delete updated.fecha_nacimiento;
              return updated;
            });
          }
        }}
        error={errorFecha}
        isRequired
        placeholder="Selecciona una fecha"
      />

      <TextField
        name="correo"
        aria-label="Correo electrónico del usuario"
        isRequired
        fullWidth
        variant="secondary"
        isInvalid={!!errorCorreo}
      >
        <Label>Correo electrónico</Label>
        <Input type="email" placeholder="correo@ejemplo.com" value={form.correo} onChange={handleFormChange} />
        {errorCorreo && <FieldError>{errorCorreo}</FieldError>}
      </TextField>

      {!editingRecord && (
        <TextField
          name="contrasena"
          aria-label="Contraseña del usuario"
          isRequired
          fullWidth
          variant="secondary"
          isInvalid={!!errorContrasena}
        >
          <Label>Contraseña</Label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={form.contrasena}
              onChange={handleFormChange}
            />
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              type="button"
              className="absolute right-1"
              onPress={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
            >
              {showPassword ? <EyeSlash /> : <Eye />}
            </Button>
          </div>
          {errorContrasena && <FieldError>{errorContrasena}</FieldError>}
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
        isInvalid={!!errorRol}
      >
        <Label>Rol</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {roles.map((rol) => (
              <ListBox.Item id={String(rol.id_rol)} key={String(rol.id_rol)} textValue={rol.nombre}>
                {rol.nombre}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
        {errorRol && <FieldError>{errorRol}</FieldError>}
      </Select>

      {editingRecord && formStatus && (
        <div className="flex justify-between">
          <Label className="text-sm font-medium">Estado de la cuenta:</Label>
          <Chip
            color={formStatus.color}
            variant="soft"
          >
            {formStatus.icon}
            <Chip.Label className="uppercase">{editingRecord.estatus || 'no definido'}</Chip.Label>
          </Chip>
        </div>
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
          try {
            await handleSave(form, editingRecord);
          } catch (err) {
            if (err.message !== 'Necesita confirmación' && err.message !== 'Validation failed') {
              throw err;
            }
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

  const renderDetail = ({ detailRecord, onClose, onEdit }) => {
    const detailStatus = getStatusProps(detailRecord.estatus);
    return (
    <div className="flex flex-col gap-5 w-full pt-6 pb-6">
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">Estado de la cuenta:</Label>
        <Chip
          color={detailStatus.color}
          variant="soft"
        >
          {detailStatus.icon}
          <Chip.Label className="uppercase">{detailRecord.estatus || 'no definido'}</Chip.Label>
        </Chip>
      </div>

      <div>
        <Label className="text-sm font-medium text-muted">Nombre completo</Label>
        <p className="text-base">{`${detailRecord.nombre} ${detailRecord.apellidos}`}</p>
      </div>

      <div>
        <Label className="text-sm font-medium text-muted">Correo electrónico</Label>
        <p className="text-base">{detailRecord.correo}</p>
      </div>

      <div>
        <Label className="text-sm font-medium text-muted">Rol</Label>
        <p className="text-base">{getRoleName(detailRecord.id_rol)}</p>
      </div>

      <div>
        <Label className="text-sm font-medium text-muted">Fecha de nacimiento</Label>
        {detailRecord.fecha_nacimiento && (
          <Calendar
            aria-label="Fecha de nacimiento"
            value={parseDate(detailRecord.fecha_nacimiento.split('T')[0])}
            isReadOnly
          />
        )}
      </div>

      <div>
        <Label className="text-sm font-medium text-muted">Fecha de creación</Label>
        <p className="text-base">{formatReadableDate(detailRecord.fecha_creacion)}</p>
      </div>

      <div>
        <Label className="text-sm font-medium text-muted">Última actualización</Label>
        <p className="text-base">{formatReadableDate(detailRecord.fecha_actualizacion)}</p>
      </div>

      <div className="flex gap-2 w-full mt-4">
        <Button variant="ghost" onPress={onClose} fullWidth>
          Cerrar
        </Button>
        <Button color="primary" onPress={onEdit} fullWidth>
          <PencilToSquare />
          Actualizar detalles
        </Button>
      </div>
    </div>
  );
  };

  const renderCell = (item, columnKey) => {
    switch (columnKey) {
      case 'nombre_completo':
        return (
          <span className="font-medium">
            {item.nombre} {item.apellidos}
          </span>
        );
      case 'correo':
        return item.correo;
      case 'rol':
        return (
          <Chip color="accent" variant="soft" className="uppercase">
            {getRoleName(item.id_rol)}
          </Chip>
        );
      case 'fecha_creacion':
        return <span className="text-muted">{formatReadableDate(item.fecha_creacion)}</span>;
      default:
        return item[columnKey];
    }
  };

  const renderStatus = (item, onToggle) => {
    if (item.estatus === 'pendiente') {
      return (
        <Chip color="warning" variant="soft">
          <SquareExclamation />
          {' PENDIENTE'}
        </Chip>
      );
    }
    return null;
  };

  const renderRowActions = (item) => {
    if (viewRequests && item.estatus === 'pendiente') {
      return (
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
      );
    }
    return null;
  };

  const headerActions = (
    <Button
      onPress={() => {
        setViewRequests(!viewRequests);
      }}
      variant="ghost"
    >
      {viewRequests ? <SquareMinus /> : <PaperPlane />}
      {viewRequests ? 'Ver todos' : 'Ver solicitudes'}
    </Button>
  );

  const extraModals = ({ fetchData: refetch }) => (
    <>
      <AlertDialog>
        <AlertDialog.Backdrop isOpen={createConfirmOpen} onOpenChange={setCreateConfirmOpen}>
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
                      Está a punto de registrar un nuevo usuario. ¿Desea continuar?
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
                            Confirmo que los datos son correctos y el usuario tendrá acceso al sistema.
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
                      onPress={async () => {
                        try {
                          await executeCreateSubmit();
                          await refetch();
                          close();
                        } catch (err) {
                          if (err.response?.data) {
                            setServerErrors(err.response.data);
                          }
                        }
                      }}
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
        <AlertDialog.Backdrop isOpen={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Confirmación de aprobación de usuario">
              {({ close }) => (
                <>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header className="flex justify-start items-start">
                    <div>
                      <ContenedorIcono size="md" color="success">
                        <Check className="size-6 text-success" />
                      </ContenedorIcono>
                    </div>
                    <AlertDialog.Heading className="flex items-center gap-3">
                      <h3>¿Aprobar usuario?</h3>
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="text-sm text-muted mb-6">
                      Está a punto de aprobar al usuario <span className="font-bold">&ldquo;{approvingRecord?.nombre} {approvingRecord?.apellidos}&rdquo;</span>. El usuario podrá acceder al sistema. ¿Desea continuar?
                    </p>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="confirmacion-aprobacion"
                        aria-label="Confirmar aprobación"
                        isSelected={approveConfirmed}
                        onChange={setApproveConfirmed}
                      >
                        <Checkbox.Content>
                          <Label htmlFor="confirmacion-aprobacion">
                            Confirmo que deseo aprobar este usuario y activar su cuenta.
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
                      onPress={async () => {
                        const success = await handleConfirmApprove();
                        if (success) {
                          await refetch();
                          close();
                        }
                      }}
                      isDisabled={!approveConfirmed}
                    >
                      <Check />
                      Sí, aprobar
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

  const pageTitle = viewRequests ? 'Usuarios por aprobar' : 'Usuarios registrados';
  const pageSubtitle = viewRequests ? 'Usuarios pendientes de aprobación' : 'Administra los usuarios del sistema';

  return (
    <PaginaAdmin
      title={pageTitle}
      subtitle={pageSubtitle}
      fetchData={fetchData}
      columns={columns}
      renderCell={renderCell}
      renderStatus={renderStatus}
      renderRowActions={renderRowActions}
      idField="id_usuario"
      getItemName={(item) => `${item.nombre} ${item.apellidos}`}
      onEdit={async (item) => {
        const data = await getUser(item.id_usuario);
        setForm({
          nombre: data.nombre || '',
          apellidos: data.apellidos || '',
          correo: data.correo || '',
          fecha_nacimiento: data.fecha_nacimiento || '',
          id_rol: data.id_rol ? String(data.id_rol) : '',
          estatus: data.estatus || '-',
        });
        setShowPassword(false);
        setAttemptedSubmit(false);
        setServerErrors({});
        return data;
      }}
      onCreate={() => {
        setForm({ ...EMPTY_FORM });
        setShowPassword(false);
        setAttemptedSubmit(false);
        setServerErrors({});
      }}
      onViewDetail={async (item) => await getUser(item.id_usuario)}
      onToggleStatus={async (item, action) => {
        if (action === 'activo') {
          await deactivateUser(item.id_usuario);
        } else if (action === 'inactivo') {
          await reactivateUser(item.id_usuario);
        }
      }}
      onDelete={async (item) => {
        await deleteUser(item.id_usuario);
      }}
      onSave={handleSave}
      renderForm={renderForm}
      renderModalFooter={renderModalFooter}
      renderDetail={renderDetail}
      statusField="estatus"
      activeStatusValue="activo"
      createButtonText="Registrar"
      emptyStateMessage="No se encontraron resultados."
      enableStatusToggle={!viewRequests}
      headerActions={headerActions}
      extraModals={extraModals}
      statusToggleConfig={{
        getDialogTitle: (item) => (item.estatus === 'activo' ? '¿Desactivar usuario?' : '¿Reactivar usuario?'),
        getDialogMessage: getStatusDialogMessage,
      }}
    />
  );
}
