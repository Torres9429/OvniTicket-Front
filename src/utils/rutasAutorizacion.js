/**
 * Normaliza el string de rol a mayúsculas
 */
export const normalizarRol = (rol) => String(rol || '').toUpperCase();

/**
 * Retorna la ruta de inicio según el rol del usuario
 */
export const obtenerRutaInicioPorRol = (rol) => {
  const normalizado = normalizarRol(rol);

  switch (normalizado) {
    case 'ADMIN':
    case 'CLIENTE':
    case 'CLIENT':
    case 'USER':
    case 'USUARIO':
      return '/';
    default:
      return '/iniciar-sesion';
  }
};

/**
 * Verifica si el rol tiene permisos de administrador
 */
export const esAdmin = (rol) => normalizarRol(rol) === 'ADMIN';

/**
 * Verifica si el rol es de tipo cliente
 */
export const esCliente = (rol) => {
  const normalizado = normalizarRol(rol);
  return normalizado === 'CLIENTE' || normalizado === 'CLIENT';
};

/**
 * Verifica si el rol es de tipo usuario
 */
export const esUsuario = (rol) => {
  const normalizado = normalizarRol(rol);
  return normalizado === 'USER' || normalizado === 'USUARIO';
};
