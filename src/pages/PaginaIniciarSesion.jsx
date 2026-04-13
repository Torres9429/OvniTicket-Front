"use client";

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../hooks/usarAutenticacion';
import {
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  ScrollShadow,
  Spinner,
  TextField,
  toast,
} from '@heroui/react';
import { ArrowRightToSquare, Eye, EyeSlash, Hand } from '@gravity-ui/icons';
import { requerido, correoValido } from '../utils/validadores';
import ContenedorIcono from '../components/ContenedorIcono';

const ejecutarValidadores = (valor, fns) => {
  const errores = [];
  for (const fn of fns) {
    const error = fn(valor);
    if (error) errores.push(error);
  }
  return errores;
};

export default function PaginaIniciarSesion() {
  const { manejarAcceso, error, esAutenticado } = useAutenticacion();
  const navegar = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [esContrasenaVisible, setEsContrasenaVisible] = useState(false);
  const [intentadoEnviar, setIntentadoEnviar] = useState(false);
  const [erroresServidor, setErroresServidor] = useState({});

  // Redirigir si el usuario ya está logueado
  useEffect(() => {
    if (esAutenticado && !enviando) {
      navegar('/', { replace: true });
    }
  }, [esAutenticado, navegar, enviando]);

  const [formulario, setFormulario] = useState({
    correo: '',
    contrasena: '',
  });

  const manejarCambioInput = useCallback((campo, valor) => {
    setFormulario(prev => ({ ...prev, [campo]: valor }));
    // Limpiar error del servidor cuando el usuario empieza a escribir
    if (erroresServidor[campo]) {
      setErroresServidor(prev => {
        const nuevos = { ...prev };
        delete nuevos[campo];
        return nuevos;
      });
    }
  }, [erroresServidor]);

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setIntentadoEnviar(true);

    const erroresCorreo = ejecutarValidadores(formulario.correo, [requerido, correoValido]);
    const erroresContrasena = ejecutarValidadores(formulario.contrasena, [requerido]);

    if (erroresCorreo.length > 0 || erroresContrasena.length > 0) {
      setErroresServidor({ correo: erroresCorreo, contrasena: erroresContrasena });
      toast.danger('Corrige los errores en el formulario');
      return;
    }

    setErroresServidor({});
    setEnviando(true);

    try {
      const res = await manejarAcceso(formulario.correo, formulario.contrasena);
      if (res?.exito) {
        toast.success(`¡Bienvenido, ${res?.usuario.nombreUsuario}!`, { description: `Has iniciado sesión correctamente como ${res?.usuario.correo}.` });
        navegar('/');
      } else {
        toast.danger('Error al iniciar sesión', { description: error || 'Ocurrió un error desconocido' });
      }
    } catch (err) {
      console.error('Error en login:', err);

      if (err.response?.data) {
        const data = err.response.data;
        
        // Manejar errores de validación del backend
        if (typeof data === 'object') {
          const erroresMapeados = {};
          for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
              erroresMapeados[key] = value;
            } else if (typeof value === 'string') {
              erroresMapeados[key === 'error' ? 'global' : key] = [value];
            }
          }
          if (data.error) {
            toast.danger(data.error);
          } else {
            setErroresServidor(erroresMapeados);
            toast.danger('Corrige los errores en el formulario');
          }
        } else {
          toast.danger(data || 'Error al iniciar sesión');
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
      className="w-full h-full custom-scrollbar grid grid-cols-1 md:grid-cols-2"
      size={20}
    >
      <ScrollShadow
        className="hidden md:flex w-full h-full items-start justify-center pl-8 pt-28"
        size={0}
      >
        <div className="flex flex-col gap-6 text-center">
          <ContenedorIcono tamano="xl">
            <Hand className="size-10 text-accent" />
          </ContenedorIcono>
          <div className="flex flex-col gap-2">
            <h1>¡Bienvenido a OvniTicket!</h1>
          </div>
          <p className="text-muted">
            OvniTicket es la plataforma integral donde organizadores y
            asistentes se conectan para crear y disfrutar de experiencias
            inolvidables. Desde conciertos y conferencias hasta festivales y
            encuentros profesionales, gestionamos cada detalle para que tu
            evento sea un éxito.
          </p>
        </div>
      </ScrollShadow>
      <div className="flex flex-col justify-center items-center min-h-full w-full px-4 py-8">
        <Card className="flex flex-col max-w-[420px] w-full gap-6 py-10 px-8 shadow-xl border border-border/50 backdrop-blur-sm">
          {/* Header de la tarjeta */}
          <div className="flex flex-col gap-2 text-center mb-2">
            <ContenedorIcono tamano="md" className="mb-2">
              <ArrowRightToSquare className="w-6 h-6 text-accent" />
            </ContenedorIcono>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Iniciar sesión
            </h2>
            <p className="text-sm text-muted">
              ¡Bienvenido de vuelta! Por favor, ingrese sus credenciales.
            </p>
          </div>

          <Form className="flex flex-col gap-6 w-full" onSubmit={manejarEnvio}>
            <TextField
              name="correo"
              isRequired
              isInvalid={
                (intentadoEnviar &&
                  ejecutarValidadores(formulario.correo, [
                    requerido,
                    correoValido,
                  ]).length > 0) ||
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
                onChange={(e) => manejarCambioInput("correo", e.target.value)}
                autoComplete="email"
              />
              {erroresServidor.correo ? (
                <FieldError>{erroresServidor.correo[0]}</FieldError>
              ) : (
                intentadoEnviar &&
                ejecutarValidadores(formulario.correo, [
                  requerido,
                  correoValido,
                ]).map((error, i) => <FieldError key={i}>{error}</FieldError>)
              )}
            </TextField>
            <TextField
              name="contrasena"
              isRequired
              isInvalid={
                (intentadoEnviar &&
                  ejecutarValidadores(formulario.contrasena, [requerido])
                    .length > 0) ||
                !!erroresServidor.contrasena
              }
              fullWidth
              variant="secondary"
            >
              <Label>Contraseña</Label>
              <div className="relative flex items-center">
                <Input
                  type={esContrasenaVisible ? "text" : "password"}
                  placeholder="••••••••"
                  value={formulario.contrasena}
                  onChange={(e) =>
                    manejarCambioInput("contrasena", e.target.value)
                  }
                  autoComplete="current-password"
                  className="pr-10 w-full"
                />
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  type="button"
                  className="absolute right-1"
                  onPress={() => setEsContrasenaVisible(!esContrasenaVisible)}
                >
                  {esContrasenaVisible ? <EyeSlash /> : <Eye />}
                </Button>
              </div>
              {erroresServidor.contrasena ? (
                <FieldError>{erroresServidor.contrasena[0]}</FieldError>
              ) : (
                intentadoEnviar &&
                ejecutarValidadores(formulario.contrasena, [requerido]).map(
                  (error, i) => <FieldError key={i}>{error}</FieldError>,
                )
              )}
            </TextField>
            {erroresServidor.global && (
              <FieldError>{erroresServidor.global[0]}</FieldError>
            )}
            {error && (
              <FieldError>{error}</FieldError>
            )}

            <Button
              type="submit"
              isPending={enviando}
              isDisabled={enviando}
              fullWidth
              size="lg"
              className="mt-2 font-semibold shadow-lg hover:shadow-xl transition-shadow"
            >
              {({ isPending }) => (
                <>
                  {isPending ? (
                    <Spinner color="current" size="sm" />
                  ) : (
                    <ArrowRightToSquare />
                  )}
                  {isPending ? "Ingresando..." : "Iniciar sesión"}
                </>
              )}
            </Button>
          </Form>

          {/* Footer del login */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?
              <span
                className="text-accent cursor-pointer font-semibold hover:underline hover:text-accent/80 transition-colors"
                onClick={() => navegar("/registrar")}
              >
                {" "}
                Regístrate
              </span>
            </p>
          </div>
        </Card>
      </div>
    </ScrollShadow>
  );
}
