import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  ScrollShadow,
  Spinner,
  Switch,
  TextField,
  toast,
  DatePicker,
  DateField,
  Calendar,
  Description,
} from '@heroui/react';
import { parseDate } from '@internationalized/date';
import { PencilToSquare, Eye, EyeSlash, HandOk, ChevronRight, SquareCheck } from '@gravity-ui/icons';
import { required, validEmail, executeValidators } from '../utils/validadores';
import { registerUser, registerClient } from '../services/autenticacion.api';
import ContenedorIcono from '../components/ContenedorIcono';

const validatePasswordBackend = (value) => {
  if (!value || value.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Z]/.test(value)) return 'La contraseña debe tener al menos una letra mayúscula.';
  if (!/[a-z]/.test(value)) return 'La contraseña debe tener al menos una letra minúscula.';
  if (!/[0-9]/.test(value)) return 'La contraseña debe tener al menos un número.';
  if (!/[!@#$%&.]/.test(value)) return 'La contraseña debe tener al menos un carácter especial (!@#$%&.).';
  return null;
};

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

const validateAdult = (dateStr) => {
  if (!dateStr) return 'La fecha de nacimiento es obligatoria.';
  const today = new Date();
  const birthDate = new Date(dateStr);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 18) return 'El usuario debe ser mayor de edad.';
  return null;
};

export default function PaginaRegistro() { // NOSONAR
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);

  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    correo: '',
    contrasena: '',
    confirmarContrasena: '',
    fecha_nacimiento: '',
  });

  const validateField = (field, value) => {
    switch (field) {
      case 'nombre':
        return executeValidators(value, [required]);
      case 'apellidos':
        return executeValidators(value, [required]);
      case 'correo':
        return executeValidators(value, [required, validEmail]);
      case 'contrasena': {
        const pwErr = validatePasswordBackend(value);
        return pwErr ? [pwErr] : [];
      }
      case 'confirmarContrasena':
        return value === form.contrasena ? [] : ['Las contraseñas no coinciden.'];
      case 'fecha_nacimiento': {
        const dateErr = validateAdult(value);
        return dateErr ? [dateErr] : [];
      }
      default:
        return [];
    }
  };

  const handleInputChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (serverErrors[field]) {
      setServerErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (field === 'contrasena' && form.confirmarContrasena) {
      const confirmErrors = form.confirmarContrasena === value ? [] : ['Las contraseñas no coinciden.'];
      setServerErrors((prev) => ({ ...prev, confirmarContrasena: confirmErrors }));
    }
  }, [serverErrors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    const requiredFields = ['nombre', 'apellidos', 'correo', 'contrasena', 'confirmarContrasena', 'fecha_nacimiento'];
    const newErrors = {};
    
    for (const field of requiredFields) {
      const errors = validateField(field, form[field]);
      if (errors.length > 0) {
        newErrors[field] = errors;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setServerErrors(newErrors);
      toast.danger('Corrige los errores en el formulario', { description: 'Revisa los campos marcados y corrige los datos ingresados.' });
      return;
    }

    setServerErrors({});
    setSubmitting(true);

    try {
      const payload = {
        nombre: form.nombre,
        apellidos: form.apellidos || '',
        correo: form.correo,
        contrasena: form.contrasena,
        fecha_nacimiento: form.fecha_nacimiento,
      };

      if (isClient) {
        await registerClient(payload);
        toast.success('¡Registro exitoso como organizador!', { description: 'Tu cuenta está pendiente de aprobación por un administrador. Te notificaremos por correo.' });
      } else {
        await registerUser(payload);
        toast.success('¡Registro exitoso!', { description: 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.' });
      }
      
      navigate('/iniciar-sesion');
    } catch (err) {
      if (err.response?.data) {
        const data = err.response.data;
        
        if (typeof data === 'object' && !data.error) {
          const mappedErrors = {};
          for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
              mappedErrors[key] = value;
            } else if (typeof value === 'string') {
              mappedErrors[key] = [value];
            }
          }
          setServerErrors(mappedErrors);
          toast.danger('Corrige los errores marcados en el formulario', { description: 'Hay campos con errores de validación del servidor.' });
        } else {
          toast.danger(data.error || data.message || 'Error al registrar la cuenta', { description: 'El servidor rechazó la solicitud. Verifica los datos ingresados.' });
        }
      } else {
        toast.danger(err.message || 'No se pudo conectar con el servidor', { description: 'Verifica tu conexión a internet e intenta de nuevo.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollShadow
      className="w-full h-full custom-scrollbar grid grid-cols-1 lg:grid-cols-2"
      size={20}
    >
      <ScrollShadow
        className="hidden md:flex w-full h-full items-start justify-center pl-8 pt-28"
        size={0}
      >
        <div className="flex flex-col gap-6 text-center">
          <ContenedorIcono size="xl">
            <HandOk className="size-10 text-accent" />
          </ContenedorIcono>
          <div className="flex flex-col gap-2">
            <h1>
              {isClient
                ? "¡Bienvenido a OvniTicket, Organizador!"
                : "¡Bienvenido a OvniTicket!"}
            </h1>
          </div>
          <p className="text-muted">
            {isClient
              ? "Crea y gestiona tus eventos con las herramientas más poderosas del mercado. Desde promoción hasta venta de entradas, controla cada aspecto de tu evento. Conecta con miles de asistentes interesados y maximiza el potencial de tu experiencia."
              : "OvniTicket es la plataforma integral para descubrir y adquirir entradas a los mejores eventos. Desde conciertos y conferencias hasta festivales y encuentros profesionales, encontramos los eventos que te apasionan en tu zona. Compra seguro, disfruta sin límites."}
          </p>
        </div>
      </ScrollShadow>
      <div className="flex flex-col justify-center items-center min-h-full w-full px-4 py-8">
        <Card className="flex flex-col max-w-[420px] w-full gap-6 py-10 px-8 shadow-xl border border-border/50 backdrop-blur-sm relative">
          <div className="flex flex-col gap-2 text-center mb-2">
            <ContenedorIcono size="md" className="mb-2">
              <PencilToSquare className="w-6 h-6 text-accent" />
            </ContenedorIcono>
            <h2>Crear una cuenta</h2>
            <p className="text-sm text-muted">
              Ingresa tus datos para registrarte.
            </p>
          </div>

          <Form
            className="flex flex-col gap-5 w-full"
            onSubmit={handleSubmit}
            validationErrors={serverErrors}
          >
            {currentStep === 1 && (
              <>
                <div className="flex gap-3">
                  <TextField
                    name="nombre"
                    isRequired
                    isInvalid={
                      (attemptedSubmit &&
                        validateField("nombre", form.nombre).length > 0) ||
                      !!serverErrors.nombre
                    }
                    fullWidth
                    variant="secondary"
                  >
                    <Label>Nombre</Label>
                    <Input
                      type="text"
                      placeholder="Juan"
                      value={form.nombre}
                      onChange={(e) =>
                        handleInputChange("nombre", e.target.value)
                      }
                      autoComplete="given-name"
                      spellCheck="false"
                    />
                    {serverErrors.nombre ? (
                      <FieldError>{serverErrors.nombre[0]}</FieldError>
                    ) : (
                      attemptedSubmit &&
                      validateField("nombre", form.nombre).length > 0 && (
                        <FieldError>
                          {validateField("nombre", form.nombre)[0]}
                        </FieldError>
                      )
                    )}
                  </TextField>

                  <TextField
                    name="apellidos"
                    isRequired
                    isInvalid={
                      (attemptedSubmit &&
                        validateField("apellidos", form.apellidos).length > 0) ||
                      !!serverErrors.apellidos
                    }
                    fullWidth
                    variant="secondary"
                  >
                    <Label>Apellidos</Label>
                    <Input
                      type="text"
                      placeholder="Pérez García"
                      value={form.apellidos}
                      onChange={(e) =>
                        handleInputChange("apellidos", e.target.value)
                      }
                      autoComplete="family-name"
                      spellCheck="false"
                    />
                    {serverErrors.apellidos ? (
                      <FieldError>{serverErrors.apellidos[0]}</FieldError>
                    ) : (
                      attemptedSubmit &&
                      validateField("apellidos", form.apellidos).length > 0 && (
                        <FieldError>
                          {validateField("apellidos", form.apellidos)[0]}
                        </FieldError>
                      )
                    )}
                  </TextField>
                </div>
                <TextField
                  name="correo"
                  isRequired
                  isInvalid={
                    (attemptedSubmit &&
                      validateField("correo", form.correo).length > 0) ||
                    !!serverErrors.correo
                  }
                  fullWidth
                  variant="secondary"
                >
                  <Label>Correo electrónico</Label>
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={form.correo}
                    onChange={(e) =>
                      handleInputChange("correo", e.target.value)
                    }
                    autoComplete="email"
                    spellCheck="false"
                    autoCapitalize="none"
                  />
                  {serverErrors.correo ? (
                    <FieldError>{serverErrors.correo[0]}</FieldError>
                  ) : (
                    attemptedSubmit &&
                    validateField("correo", form.correo).length > 0 && (
                      <FieldError>
                        {validateField("correo", form.correo)[0]}
                      </FieldError>
                    )
                  )}
                </TextField>

                <DatePicker
                  aria-label="Fecha de nacimiento"
                  isRequired
                  isInvalid={
                    (attemptedSubmit &&
                      validateField(
                        "fecha_nacimiento",
                        form.fecha_nacimiento,
                      ).length > 0) ||
                    !!serverErrors.fecha_nacimiento
                  }
                  value={
                    form.fecha_nacimiento
                      ? parseDate(form.fecha_nacimiento.split("T")[0])
                      : null
                  }
                  onChange={(val) =>
                    handleInputChange(
                      "fecha_nacimiento",
                      val ? val.toString() : "",
                    )
                  }
                >
                  <Label>Fecha de Nacimiento</Label>
                  <DateField.Group variant="secondary">
                    <DateField.Input>
                      {(segment) => <DateField.Segment segment={segment} />}
                    </DateField.Input>
                    <DateField.Suffix>
                      <DatePicker.Trigger>
                        <DatePicker.TriggerIndicator />
                      </DatePicker.Trigger>
                    </DateField.Suffix>
                  </DateField.Group>
                  <Description className="text-xs text-muted">
                    {form.fecha_nacimiento
                      ? formatReadableDate(form.fecha_nacimiento)
                      : 'Selecciona tu fecha de nacimiento'}
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
                            <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
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
                  {serverErrors.fecha_nacimiento ? (
                    <FieldError>
                      {serverErrors.fecha_nacimiento[0]}
                    </FieldError>
                  ) : (
                    attemptedSubmit &&
                    validateField(
                      "fecha_nacimiento",
                      form.fecha_nacimiento,
                    ).length > 0 && (
                      <FieldError>
                        {
                          validateField(
                            "fecha_nacimiento",
                            form.fecha_nacimiento,
                          )[0]
                        }
                      </FieldError>
                    )
                  )}
                </DatePicker>

                <Button
                  type="button"
                  onPress={() => {
                    const step1Fields = [
                      "nombre",
                      "apellidos",
                      "correo",
                      "fecha_nacimiento",
                    ];
                    const hasErrors = step1Fields.some(
                      (field) =>
                        validateField(field, form[field]).length > 0 ||
                        !form[field],
                    );

                    if (hasErrors) {
                      setAttemptedSubmit(true);
                      toast.danger(
                        'Por favor, completa todos los campos obligatorios',
                        { description: 'Revisa que todos los campos obligatorios estén completos antes de continuar.' },
                      );
                    } else {
                      setCurrentStep(2);
                      setAttemptedSubmit(false);
                    }
                  }}
                  fullWidth
                  className="mt-2"
                >
                  Continuar
                  <ChevronRight />
                </Button>
              </>
            )}

            {currentStep === 2 && (
              <>
                <div className="flex flex-col gap-2">
                  <Switch
                    isSelected={isClient}
                    onChange={setIsClient}
                    className="w-full"
                  >
                    <Switch.Content className="w-full">
                      <Label>
                        {isClient
                          ? "Quiero ser organizador"
                          : "Quiero ser usuario"}
                      </Label>
                    </Switch.Content>
                    <Switch.Control className="shrink-0">
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                  {isClient && (
                    <Description className="text-xs text-warning">
                      Tu cuenta requerirá aprobación de un administrador antes de poder crear eventos. 
                      Te notificaremos por correo cuando sea activada.
                    </Description>
                  )}
                </div>

                <TextField
                  name="contrasena"
                  isRequired
                  isInvalid={
                    (attemptedSubmit &&
                      validateField("contrasena", form.contrasena).length >
                        0) ||
                    !!serverErrors.contrasena
                  }
                  fullWidth
                  variant="secondary"
                >
                  <Label>Contraseña</Label>
                  <div className="relative flex items-center">
                    <Input
                      name="contrasena"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.contrasena}
                      onChange={(e) =>
                        handleInputChange("contrasena", e.target.value)
                      }
                      autoComplete="new-password"
                      className="pr-10 w-full"
                    />
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      type="button"
                      className="absolute right-1"
                      onPress={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? <EyeSlash /> : <Eye />}
                    </Button>
                  </div>
                  {serverErrors.contrasena ? (
                    <FieldError>{serverErrors.contrasena[0]}</FieldError>
                  ) : (
                    attemptedSubmit &&
                    validateField("contrasena", form.contrasena).length >
                      0 && (
                      <FieldError>
                        {validateField("contrasena", form.contrasena)[0]}
                      </FieldError>
                    )
                  )}
                </TextField>

                <TextField
                  name="confirmarContrasena"
                  isRequired
                  isInvalid={
                    (attemptedSubmit &&
                      validateField(
                        "confirmarContrasena",
                        form.confirmarContrasena,
                      ).length > 0) ||
                    !!serverErrors.confirmarContrasena
                  }
                  fullWidth
                  variant="secondary"
                >
                  <Label>Confirmar Contraseña</Label>
                  <div className="relative flex items-center">
                    <Input
                      name="confirmarContrasena"
                      type={showConfirmation ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.confirmarContrasena}
                      onChange={(e) =>
                        handleInputChange(
                          "confirmarContrasena",
                          e.target.value,
                        )
                      }
                      autoComplete="new-password"
                      className="pr-10 w-full"
                    />
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      type="button"
                      className="absolute right-1"
                      onPress={() =>
                        setShowConfirmation(!showConfirmation)
                      }
                      aria-label={
                        showConfirmation
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {showConfirmation ? <EyeSlash /> : <Eye />}
                    </Button>
                  </div>
                  {serverErrors.confirmarContrasena ? (
                    <FieldError>
                      {serverErrors.confirmarContrasena[0]}
                    </FieldError>
                  ) : (
                    attemptedSubmit &&
                    validateField(
                      "confirmarContrasena",
                      form.confirmarContrasena,
                    ).length > 0 && (
                      <FieldError>
                        {
                          validateField(
                            "confirmarContrasena",
                            form.confirmarContrasena,
                          )[0]
                        }
                      </FieldError>
                    )
                  )}
                </TextField>

                <div className="text-xs text-muted">
                  <p className="text-foreground pb-2 text-sm">
                    La contraseña debe contener:
                  </p>
                  <ul className="space-y-1.5">
                    <li
                      className={
                        form.contrasena.length >= 8
                          ? "text-success flex items-center gap-2"
                          : "flex items-center gap-2"
                      }
                    >
                      <span
                        className={
                          form.contrasena.length >= 8
                            ? "text-success"
                            : "text-muted"
                        }
                      >
                        <SquareCheck />
                      </span>
                      Mínimo 8 caracteres
                    </li>
                    <li
                      className={
                        /[A-Z]/.test(form.contrasena)
                          ? "text-success flex items-center gap-2"
                          : "flex items-center gap-2"
                      }
                    >
                      <span
                        className={
                          /[A-Z]/.test(form.contrasena)
                            ? "text-success"
                            : "text-muted"
                        }
                      >
                        <SquareCheck />
                      </span>
                      Al menos una mayúscula
                    </li>
                    <li
                      className={
                        /[a-z]/.test(form.contrasena)
                          ? "text-success flex items-center gap-2"
                          : "flex items-center gap-2"
                      }
                    >
                      <span
                        className={
                          /[a-z]/.test(form.contrasena)
                            ? "text-success"
                            : "text-muted"
                        }
                      >
                        <SquareCheck />
                      </span>
                      Al menos una minúscula
                    </li>
                    <li
                      className={
                        /[0-9]/.test(form.contrasena)
                          ? "text-success flex items-center gap-2"
                          : "flex items-center gap-2"
                      }
                    >
                      <span
                        className={
                          /[0-9]/.test(form.contrasena)
                            ? "text-success"
                            : "text-muted"
                        }
                      >
                        <SquareCheck />
                      </span>
                      Al menos un número
                    </li>
                    <li
                      className={
                        /[!@#$%&.]/.test(form.contrasena)
                          ? "text-success flex items-center gap-2"
                          : "flex items-center gap-2"
                      }
                    >
                      <span
                        className={
                          /[!@#$%&.]/.test(form.contrasena)
                            ? "text-success"
                            : "text-muted"
                        }
                      >
                        <SquareCheck />
                      </span>
                      Al menos un especial (!@#$%&.)
                    </li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  isPending={submitting}
                  isDisabled={submitting}
                  fullWidth
                  className="mt-2"
                >
                  {({ isPending }) => (
                    <>
                      {isPending ? (
                        <Spinner color="current" size="sm" />
                      ) : (
                        <PencilToSquare />
                      )}
                      {isPending
                        ? "Registrando..."
                        : isClient
                          ? "Crear cuenta de organizador"
                          : "Crear cuenta"}
                    </>
                  )}
                </Button>
              </>
            )}
          </Form>

          {currentStep === 2 && (
            <Button
              type="button"
              variant="ghost"
              onPress={() => {
                setCurrentStep(1);
                setAttemptedSubmit(false);
              }}
              className="absolute top-6 left-6"
              aria-label="Volver al paso anterior"
            >
              <ChevronRight className="rotate-180" />
              Atrás
            </Button>
          )}

          <div className="text-center">
            <p className="text-sm">
              ¿Ya tienes cuenta?{" "}
              <Link
                className="text-accent decoration-accent"
                onPress={() => navigate("/iniciar-sesion")}
              >
                Iniciar sesión
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </ScrollShadow>
  );
}
