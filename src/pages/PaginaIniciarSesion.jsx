import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
  TextField,
  toast,
} from '@heroui/react';
import { ArrowRightToSquare, Eye, EyeSlash, Hand } from '@gravity-ui/icons';
import { required, validEmail } from '../utils/validadores';
import IconContainer from '../components/ContenedorIcono';

const executeValidators = (value, fns) => {
  const errors = [];
  for (const fn of fns) {
    const error = fn(value);
    if (error) errors.push(error);
  }
  return errors;
};

export default function LoginPage() {
  const { handleLogin, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [serverErrors, setServerErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated && !submitting) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, submitting]);

  const [form, setForm] = useState({
    correo: '',
    contrasena: '',
  });
  const handleInputChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (serverErrors[field]) {
      setServerErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [serverErrors]);

  const handleLoginError = (err) => {
    const data = err.response?.data;
    
    if (!data) {
      toast.danger(err.message || 'No se pudo conectar con el servidor', { description: 'Verifica tu conexión a internet e intenta de nuevo.' });
      return;
    }

    if (typeof data !== 'object') {
      toast.danger(data || 'Error al iniciar sesión', { description: 'El servidor respondió con un error inesperado.' });
      return;
    }

    if (data.error) {
      toast.danger(data.error, { description: 'Verifica tus credenciales e intenta de nuevo.' });
      return;
    }

    const mappedErrors = {};
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        mappedErrors[key] = value;
      } else if (typeof value === 'string') {
        mappedErrors[key === 'error' ? 'global' : key] = [value];
      }
    }
    setServerErrors(mappedErrors);
    toast.danger('Corrige los errores en el formulario', { description: 'Hay campos con errores de validación del servidor.' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    const emailErrors = executeValidators(form.correo, [required, validEmail]);
    const passwordErrors = executeValidators(form.contrasena, [required]);

    if (emailErrors.length > 0 || passwordErrors.length > 0) {
      setServerErrors({ correo: emailErrors, contrasena: passwordErrors });
      toast.danger('Corrige los errores en el formulario', { description: 'Verifica que el correo y la contraseña sean válidos.' });
      return;
    }

    setServerErrors({});
    setSubmitting(true);

    try {
      const res = await handleLogin(form.correo, form.contrasena);
      if (res?.success) {
        toast.success(`¡Bienvenido, ${res?.user.userName}!`, { description: `Has iniciado sesión correctamente como ${res?.user.email}.` });
        navigate('/');
      } else {
        toast.danger('Error al iniciar sesión', { description: error || 'Ocurrió un error desconocido' });
      }
    } catch (err) {
      handleLoginError(err);
    } finally {
      setSubmitting(false);
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
          <IconContainer size="xl">
            <Hand className="size-10 text-accent" />
          </IconContainer>
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
          <div className="flex flex-col gap-2 text-center mb-2">
            <IconContainer size="md" className="mb-2">
              <ArrowRightToSquare className="w-6 h-6 text-accent" />
            </IconContainer>
            <h2>Iniciar sesión</h2>
            <p className="text-sm text-muted">
              ¡Bienvenido de vuelta! Por favor, ingrese sus credenciales.
            </p>
          </div>

          <Form className="flex flex-col gap-6 w-full" onSubmit={handleSubmit}>
            <TextField
              name="correo"
              isRequired
              isInvalid={
                (attemptedSubmit &&
                  executeValidators(form.correo, [
                    required,
                    validEmail,
                  ]).length > 0) ||
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
                onChange={(e) => handleInputChange("correo", e.target.value)}
                autoComplete="email"
              />
              {serverErrors.correo ? (
                <FieldError>{serverErrors.correo[0]}</FieldError>
              ) : (
                attemptedSubmit &&
                executeValidators(form.correo, [
                  required,
                  validEmail,
                ]).map((error) => <FieldError key={error}>{error}</FieldError>)
              )}
            </TextField>
            <TextField
              name="contrasena"
              isRequired
              isInvalid={
                (attemptedSubmit &&
                  executeValidators(form.contrasena, [required])
                    .length > 0) ||
                !!serverErrors.contrasena
              }
              fullWidth
              variant="secondary"
            >
              <Label>Contraseña</Label>
              <div className="relative flex items-center">
                <Input
                  type={passwordVisible ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.contrasena}
                  onChange={(e) =>
                    handleInputChange("contrasena", e.target.value)
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
                  onPress={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? <EyeSlash /> : <Eye />}
                </Button>
              </div>
              {serverErrors.contrasena ? (
                <FieldError>{serverErrors.contrasena[0]}</FieldError>
              ) : (
                attemptedSubmit &&
                executeValidators(form.contrasena, [required]).map(
                  (error) => <FieldError key={error}>{error}</FieldError>,
                )
              )}
            </TextField>
            {serverErrors.global && (
              <FieldError>{serverErrors.global[0]}</FieldError>
            )}
            {error && <FieldError>{"" + error}</FieldError>}

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
                    <ArrowRightToSquare />
                  )}
                  {isPending ? 'Ingresando...' : 'Iniciar sesión'}
                </>
              )}
            </Button>
          </Form>

          <div className="text-center">
            <p className="text-sm">
              ¿No tienes cuenta?{" "}
              <Link
                className="text-accent decoration-accent"
                onPress={() => navigate('/registrar')}
              >
                Regístrate
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </ScrollShadow>
  );
}
