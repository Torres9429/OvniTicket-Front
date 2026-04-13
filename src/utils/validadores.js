/**
 * Validadores de campos para formularios
 * Cada función retorna un string de error si es inválido, o null si es válido
 */

/**
 * Ejecuta una lista de validadores sobre un valor y retorna un arreglo de mensajes de error.
 * @param {*} value - Valor a validar
 * @param {Function[]} fns - Lista de funciones validadoras
 * @returns {string[]}
 */
export const executeValidators = (value, fns) => {
  const errors = [];
  for (const fn of fns) {
    const error = fn(value);
    if (error) errors.push(error);
  }
  return errors;
};

/**
 * Formatea milisegundos restantes como "m:ss".
 * @param {number} ms
 * @returns {string}
 */
export const formatTimeRemaining = (ms) => {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const required = (value) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return 'Este campo es obligatorio';
  }
  return null;
};

export const validEmail = (value) => {
  if (!value) return null;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(value)) {
    return 'Ingrese un correo electrónico válido';
  }
  return null;
};

export const validPassword = (value) => {
  if (!value) return null;
  if (value.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  return null;
};
