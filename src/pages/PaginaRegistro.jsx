"use client";

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
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
import { requerido, correoValido } from '../utils/validadores';
import { registrarUsuario, registrarCliente } from '../services/autenticacion.api';
import ContenedorIcono from '../components/ContenedorIcono';

// Validador de contraseña según backend (min 8, mayúscula, minúscula, número, especial)
const validarContrasenaBackend = (valor) => {
  if (!valor || valor.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Z]/.test(valor)) return 'La contraseña debe tener al menos una letra mayúscula.';
  if (!/[a-z]/.test(valor)) return 'La contraseña debe tener al menos una letra minúscula.';
  if (!/[0-9]/.test(valor)) return 'La contraseña debe tener al menos un número.';
  if (!/[!@#$%&.]/.test(valor)) return 'La contraseña debe tener al menos un carácter especial (!@#$%&.).';
  return null;
};

/* ─── función para formatear fechas de manera legible (corrige desfase de zona horaria) ─── */
const formatearFechaLegible = (fechaString) => {
  if (!fechaString) return null
  // Manejar tanto fechas (YYYY-MM-DD) como datetimes (YYYY-MM-DDTHH:mm:ss)
  // Si ya tiene T, usar directamente; si no, agregar T12:00:00
  const fechaConHora = fechaString.includes('T') ? fechaString : fechaString + 'T12:00:00'
  const fecha = new Date(fechaConHora)
  // Si es datetime, mostrar fecha y hora; si solo es fecha, mostrar solo fecha
  const opciones = fechaString.includes('T')
    ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' }
  return fecha.toLocaleDateString('es-MX', opciones)
}

/* ─── función para validar mayor de edad ─── */
const validarMayorDeEdad = (fechaStr) => {
  if (!fechaStr) return 'La fecha de nacimiento es obligatoria.';
  const hoy = new Date();
  const fechaNac = new Date(fechaStr);
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mesDiff = hoy.getMonth() - fechaNac.getMonth();
  if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }
  if (edad < 18) return 'El usuario debe ser mayor de edad.';
  return null;
};

const ejecutarValidadores = (valor, fns) => {
  const errores = [];
  for (const fn of fns) {
    const error = fn(valor);
    if (error) errores.push(error);
  }
  return errores;
};

export default function PaginaRegistro() {
  const navegar = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [esCliente, setEsCliente] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [intentadoEnviar, setIntentadoEnviar] = useState(false);
  const [erroresServidor, setErroresServidor] = useState({});
  const [pasoActual, setPasoActual] = useState(1); // 1: datos básicos, 2: contraseña y switch

  const [formulario, setFormulario] = useState({
    nombre: '',
    apellidos: '',
    correo: '',
    contrasena: '',
    confirmarContrasena: '',
    fecha_nacimiento: '',
  });

  const validarCampo = (campo, valor) => {
    switch (campo) {
      case 'nombre':
        return ejecutarValidadores(valor, [requerido]);
      case 'apellidos':
        return []; // Opcional
      case 'correo':
        return ejecutarValidadores(valor, [requerido, correoValido]);
      case 'contrasena': {
        const errContrasena = validarContrasenaBackend(valor);
        return errContrasena ? [errContrasena] : [];
      }
      case 'confirmarContrasena':
        return valor === formulario.contrasena ? [] : ['Las contraseñas no coinciden.'];
      case 'fecha_nacimiento': {
        const errFecha = validarMayorDeEdad(valor);
        return errFecha ? [errFecha] : [];
      }
      default:
        return [];
    }
  };

  const manejarCambioInput = useCallback((campo, valor) => {
    setFormulario((prev) => ({ ...prev, [campo]: valor }));
    // Limpiar error del servidor cuando el usuario empieza a escribir
    if (erroresServidor[campo]) {
      setErroresServidor((prev) => {
        const nuevos = { ...prev };
        delete nuevos[campo];
        return nuevos;
      });
    }
    // Re-validar confirmar contraseña si cambia la principal
    if (campo === 'contrasena' && formulario.confirmarContrasena) {
      const erroresConfirmar = formulario.confirmarContrasena === valor ? [] : ['Las contraseñas no coinciden.'];
      setErroresServidor((prev) => ({ ...prev, confirmarContrasena: erroresConfirmar }));
    }
  }, [erroresServidor, formulario.confirmarContrasena]);

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setIntentadoEnviar(true);

    const camposObligatorios = ['nombre', 'correo', 'contrasena', 'confirmarContrasena', 'fecha_nacimiento'];
    const nuevosErrores = {};
    
    for (const campo of camposObligatorios) {
      const errores = validarCampo(campo, formulario[campo]);
      if (errores.length > 0) {
        nuevosErrores[campo] = errores;
      }
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErroresServidor(nuevosErrores);
      toast.danger('Corrige los errores en el formulario');
      return;
    }

    setErroresServidor({});
    setEnviando(true);

    try {
      const payload = {
        nombre: formulario.nombre,
        apellidos: formulario.apellidos || '',
        correo: formulario.correo,
        contrasena: formulario.contrasena,
        fecha_nacimiento: formulario.fecha_nacimiento,
      };

      if (esCliente) {
        await registrarCliente(payload);
        toast.success('¡Registro exitoso como organizador! Tu cuenta está pendiente de aprobación.');
      } else {
        await registrarUsuario(payload);
        toast.success('¡Registro exitoso! Por favor inicia sesión.');
      }
      
      navegar('/iniciar-sesion');
    } catch (err) {
      console.error('Error en registro:', err);

      if (err.response?.data) {
        const data = err.response.data;
        
        // Manejar errores de validación del backend
        if (typeof data === 'object' && !data.error) {
          // Errores de campo específicos
          const erroresMapeados = {};
          for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
              erroresMapeados[key] = value;
            } else if (typeof value === 'string') {
              erroresMapeados[key] = [value];
            }
          }
          setErroresServidor(erroresMapeados);
          toast.danger('Corrige los errores marcados en el formulario');
        } else {
          // Error general
          toast.danger(data.error || data.message || 'Error al registrar la cuenta');
        }
      } else {
        toast.danger(err.message || 'No se pudo conectar con el servidor');
      }
    } finally {
      setEnviando(false);
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
          <ContenedorIcono tamano="xl">
            <HandOk className="size-10 text-accent" />
          </ContenedorIcono>
          <div className="flex flex-col gap-2">
            <h1>
              {esCliente
                ? "¡Bienvenido a OvniTicket, Organizador!"
                : "¡Bienvenido a OvniTicket!"}
            </h1>
          </div>
          <p className="text-muted">
            {esCliente
              ? "Crea y gestiona tus eventos con las herramientas más poderosas del mercado. Desde promoción hasta venta de entradas, controla cada aspecto de tu evento. Conecta con miles de asistentes interesados y maximiza el potencial de tu experiencia."
              : "OvniTicket es la plataforma integral para descubrir y adquirir entradas a los mejores eventos. Desde conciertos y conferencias hasta festivales y encuentros profesionales, encontramos los eventos que te apasionan en tu zona. Compra seguro, disfruta sin límites."}
          </p>
        </div>
      </ScrollShadow>
      <div className="flex flex-col justify-center items-center min-h-full w-full px-4 py-8">
        <Card className="flex flex-col max-w-[420px] w-full gap-6 py-10 px-8 shadow-xl border border-border/50 backdrop-blur-sm relative">
          {/* Header de la tarjeta */}
          <div className="flex flex-col gap-2 text-center mb-2">
            <ContenedorIcono tamano="md" className="mb-2">
              <PencilToSquare className="w-6 h-6 text-accent" />
            </ContenedorIcono>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Crear una cuenta
            </h2>
            <p className="text-sm text-muted">
              Ingresa tus datos para registrarte.
            </p>
          </div>

          <Form
            className="flex flex-col gap-5 w-full"
            onSubmit={manejarEnvio}
            validationErrors={erroresServidor}
          >
            {/* PASO 1: Datos básicos */}
            {pasoActual === 1 && (
              <>
                <div className="flex gap-3">
                  {/* Nombre */}
                  <TextField
                    name="nombre"
                    isRequired
                    isInvalid={
                      (intentadoEnviar &&
                        validarCampo("nombre", formulario.nombre).length > 0) ||
                      !!erroresServidor.nombre
                    }
                    fullWidth
                    variant="secondary"
                  >
                    <Label>Nombre</Label>
                    <Input
                      type="text"
                      placeholder="Juan"
                      value={formulario.nombre}
                      onChange={(e) =>
                        manejarCambioInput("nombre", e.target.value)
                      }
                      autoComplete="given-name"
                      spellCheck="false"
                    />
                    {erroresServidor.nombre ? (
                      <FieldError>{erroresServidor.nombre[0]}</FieldError>
                    ) : (
                      intentadoEnviar &&
                      validarCampo("nombre", formulario.nombre).length > 0 && (
                        <FieldError>
                          {validarCampo("nombre", formulario.nombre)[0]}
                        </FieldError>
                      )
                    )}
                  </TextField>

                  {/* Apellidos */}
                  <TextField
                    name="apellidos"
                    isInvalid={!!erroresServidor.apellidos}
                    fullWidth
                    variant="secondary"
                  >
                    <Label>Apellidos</Label>
                    <Input
                      type="text"
                      placeholder="Pérez García"
                      value={formulario.apellidos}
                      onChange={(e) =>
                        manejarCambioInput("apellidos", e.target.value)
                      }
                      autoComplete="family-name"
                      spellCheck="false"
                    />
                    {erroresServidor.apellidos && (
                      <FieldError>{erroresServidor.apellidos[0]}</FieldError>
                    )}
                  </TextField>
                </div>
                {/* Correo */}
                <TextField
                  name="correo"
                  isRequired
                  isInvalid={
                    (intentadoEnviar &&
                      validarCampo("correo", formulario.correo).length > 0) ||
                    !!erroresServidor.correo
                  }
                  fullWidth
                  variant="secondary"
                >
                  <Label>Correo electrónico</Label>
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={formulario.correo}
                    onChange={(e) =>
                      manejarCambioInput("correo", e.target.value)
                    }
                    autoComplete="email"
                    spellCheck="false"
                    autoCapitalize="none"
                  />
                  {erroresServidor.correo ? (
                    <FieldError>{erroresServidor.correo[0]}</FieldError>
                  ) : (
                    intentadoEnviar &&
                    validarCampo("correo", formulario.correo).length > 0 && (
                      <FieldError>
                        {validarCampo("correo", formulario.correo)[0]}
                      </FieldError>
                    )
                  )}
                </TextField>

                {/* Fecha de Nacimiento */}
                <DatePicker
                  aria-label="Fecha de nacimiento"
                  isRequired
                  isInvalid={
                    (intentadoEnviar &&
                      validarCampo(
                        "fecha_nacimiento",
                        formulario.fecha_nacimiento,
                      ).length > 0) ||
                    !!erroresServidor.fecha_nacimiento
                  }
                  value={
                    formulario.fecha_nacimiento
                      ? parseDate(formulario.fecha_nacimiento.split("T")[0])
                      : null
                  }
                  onChange={(val) =>
                    manejarCambioInput(
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
                    {formulario.fecha_nacimiento
                      ? formatearFechaLegible(formulario.fecha_nacimiento)
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
                  {erroresServidor.fecha_nacimiento ? (
                    <FieldError>
                      {erroresServidor.fecha_nacimiento[0]}
                    </FieldError>
                  ) : (
                    intentadoEnviar &&
                    validarCampo(
                      "fecha_nacimiento",
                      formulario.fecha_nacimiento,
                    ).length > 0 && (
                      <FieldError>
                        {
                          validarCampo(
                            "fecha_nacimiento",
                            formulario.fecha_nacimiento,
                          )[0]
                        }
                      </FieldError>
                    )
                  )}
                </DatePicker>

                {/* Botón continuar */}
                <Button
                  type="button"
                  onPress={() => {
                    // Validar campos del paso 1
                    const camposPaso1 = [
                      "nombre",
                      "correo",
                      "fecha_nacimiento",
                    ];
                    const hayErrores = camposPaso1.some(
                      (campo) =>
                        validarCampo(campo, formulario[campo]).length > 0 ||
                        !formulario[campo],
                    );

                    if (hayErrores) {
                      setIntentadoEnviar(true);
                      toast.danger(
                        "Por favor, completa todos los campos obligatorios",
                      );
                    } else {
                      setPasoActual(2);
                      setIntentadoEnviar(false);
                    }
                  }}
                  fullWidth
                  size="lg"
                  className="mt-2 font-semibold shadow-lg hover:shadow-xl transition-shadow"
                >
                  Continuar
                  <ChevronRight />
                </Button>
              </>
            )}

            {/* PASO 2: Contraseña y tipo de cuenta */}
            {pasoActual === 2 && (
              <>
                {/* Switch para seleccionar tipo de registro - HeroUI v3.0.2 exacto */}
                <div className="flex flex-col gap-2">
                  <Switch
                    isSelected={esCliente}
                    onChange={setEsCliente}
                    className="w-full"
                  >
                    <Switch.Content className="w-full">
                      <Label>
                        {esCliente
                          ? "Quiero ser organizador"
                          : "Quiero ser usuario"}
                      </Label>
                    </Switch.Content>
                    <Switch.Control className="shrink-0">
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                  {/* Descripción para organizador */}
                  {esCliente && (
                    <Description className="text-xs text-warning">
                      Tu cuenta requerirá aprobación de un administrador antes de poder crear eventos. 
                      Te notificaremos por correo cuando sea activada.
                    </Description>
                  )}
                </div>

                {/* Contraseña */}
                <TextField
                  name="contrasena"
                  isRequired
                  isInvalid={
                    (intentadoEnviar &&
                      validarCampo("contrasena", formulario.contrasena).length >
                        0) ||
                    !!erroresServidor.contrasena
                  }
                  fullWidth
                  variant="secondary"
                >
                  <Label>Contraseña</Label>
                  <div className="relative flex items-center">
                    <Input
                      name="contrasena"
                      type={mostrarContrasena ? "text" : "password"}
                      placeholder="••••••••"
                      value={formulario.contrasena}
                      onChange={(e) =>
                        manejarCambioInput("contrasena", e.target.value)
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
                      onPress={() => setMostrarContrasena(!mostrarContrasena)}
                      aria-label={
                        mostrarContrasena
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {mostrarContrasena ? <EyeSlash /> : <Eye />}
                    </Button>
                  </div>
                  {erroresServidor.contrasena ? (
                    <FieldError>{erroresServidor.contrasena[0]}</FieldError>
                  ) : (
                    intentadoEnviar &&
                    validarCampo("contrasena", formulario.contrasena).length >
                      0 && (
                      <FieldError>
                        {validarCampo("contrasena", formulario.contrasena)[0]}
                      </FieldError>
                    )
                  )}
                </TextField>

                {/* Confirmar Contraseña */}
                <TextField
                  name="confirmarContrasena"
                  isRequired
                  isInvalid={
                    (intentadoEnviar &&
                      validarCampo(
                        "confirmarContrasena",
                        formulario.confirmarContrasena,
                      ).length > 0) ||
                    !!erroresServidor.confirmarContrasena
                  }
                  fullWidth
                  variant="secondary"
                >
                  <Label>Confirmar Contraseña</Label>
                  <div className="relative flex items-center">
                    <Input
                      name="confirmarContrasena"
                      type={mostrarConfirmacion ? "text" : "password"}
                      placeholder="••••••••"
                      value={formulario.confirmarContrasena}
                      onChange={(e) =>
                        manejarCambioInput(
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
                        setMostrarConfirmacion(!mostrarConfirmacion)
                      }
                      aria-label={
                        mostrarConfirmacion
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {mostrarConfirmacion ? <EyeSlash /> : <Eye />}
                    </Button>
                  </div>
                  {erroresServidor.confirmarContrasena ? (
                    <FieldError>
                      {erroresServidor.confirmarContrasena[0]}
                    </FieldError>
                  ) : (
                    intentadoEnviar &&
                    validarCampo(
                      "confirmarContrasena",
                      formulario.confirmarContrasena,
                    ).length > 0 && (
                      <FieldError>
                        {
                          validarCampo(
                            "confirmarContrasena",
                            formulario.confirmarContrasena,
                          )[0]
                        }
                      </FieldError>
                    )
                  )}
                </TextField>

                {/* Indicador de requisitos de contraseña */}
                <div className="text-xs text-muted">
                  <p className="text-foreground pb-2 text-sm">
                    La contraseña debe contener:
                  </p>
                  <ul className="space-y-1.5">
                    <li
                      className={
                        formulario.contrasena.length >= 8
                          ? "text-success flex items-center gap-2"
                          : "flex items-center gap-2"
                      }
                    >
                      <span
                        className={
                          formulario.contrasena.length >= 8
                            ? "text-success"
                            : "text-muted-foreground"
                        }
                      >
                        <SquareCheck />
                      </span>
                      Mínimo 8 caracteres
                    </li>
                    <li
                      className={
                        /[A-Z]/.test(formulario.contrasena)
                          ? "text-success flex items-center gap-2"
                          : "flex items-center gap-2"
                      }
                    >
                      <span
                        className={
                          /[A-Z]/.test(formulario.contrasena)
                            ? "text-success"
                            : "text-muted-foreground"
                        }
                      >
                        <SquareCheck />
                      </span>
                      Al menos una mayúscula
                    </li>
                    <li
                      className={
                        /[a-z]/.test(formulario.contrasena)
                          ? "text-success flex items-center gap-2"
                          : "flex items-center gap-2"
                      }
                    >
                      <span
                        className={
                          /[a-z]/.test(formulario.contrasena)
                            ? "text-success"
                            : "text-muted-foreground"
                        }
                      >
                        <SquareCheck />
                      </span>
                      Al menos una minúscula
                    </li>
                    <li
                      className={
                        /[0-9]/.test(formulario.contrasena)
                          ? "text-success flex items-center gap-2"
                          : "flex items-center gap-2"
                      }
                    >
                      <span
                        className={
                          /[0-9]/.test(formulario.contrasena)
                            ? "text-success"
                            : "text-muted-foreground"
                        }
                      >
                        <SquareCheck />
                      </span>
                      Al menos un número
                    </li>
                    <li
                      className={
                        /[!@#$%&.]/.test(formulario.contrasena)
                          ? "text-success flex items-center gap-2"
                          : "flex items-center gap-2"
                      }
                    >
                      <span
                        className={
                          /[!@#$%&.]/.test(formulario.contrasena)
                            ? "text-success"
                            : "text-muted-foreground"
                        }
                      >
                        <SquareCheck />
                      </span>
                      Al menos un especial (!@#$%&.)
                    </li>
                  </ul>
                </div>

                {/* Botón del paso 2 */}
                <Button
                  type="submit"
                  isPending={enviando}
                  isDisabled={enviando}
                  fullWidth
                  size='lg'
                  className="mt-2 font-semibold shadow-lg hover:shadow-xl transition-shadow"
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
                        : esCliente
                          ? "Crear cuenta de organizador"
                          : "Crear cuenta"}
                    </>
                  )}
                </Button>
              </>
            )}
          </Form>

          {/* Botón Atrás Absoluto - Solo en paso 2 */}
          {pasoActual === 2 && (
            <Button
              type="button"
              variant="ghost"
              onPress={() => {
                setPasoActual(1);
                setIntentadoEnviar(false);
              }}
              className="absolute top-6 left-6"
              aria-label="Volver al paso anterior"
            >
              <ChevronRight className="rotate-180" />
              Atrás
            </Button>
          )}

          {/* Footer del register */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?
              <span
                className="text-accent cursor-pointer font-semibold hover:underline hover:text-accent/80 transition-colors"
                onClick={() => navegar("/iniciar-sesion")}
              >
                {" "}
                Iniciar sesión
              </span>
            </p>
          </div>
        </Card>
      </div>
    </ScrollShadow>
  );
}
