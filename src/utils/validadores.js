/**
 * Validadores de campos para formularios
 * Cada función retorna un string de error si es inválido, o null si es válido
 */

export const requerido = (value) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return 'Este campo es obligatorio';
  }
  return null;
};

export const correoValido = (value) => {
  if (!value) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Ingrese un correo electrónico válido';
  }
  return null;
};

export const contrasenaValida = (value) => {
  if (!value) return null;
  if (value.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  return null;
};
