/**
 * Normaliza el string de rol a mayúsculas
 */
export const normalizeRole = (role) => String(role || '').toUpperCase();

/**
 * Retorna la ruta de inicio según el rol del usuario
 */
export const getHomeRouteByRole = (role) => {
  const normalized = normalizeRole(role);

  switch (normalized) {
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
export const isAdmin = (role) => normalizeRole(role) === 'ADMIN';

/**
 * Verifica si el rol es de tipo cliente
 */
export const isClient = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'CLIENTE' || normalized === 'CLIENT';
};

/**
 * Verifica si el rol es de tipo usuario
 */
export const isUser = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'USER' || normalized === 'USUARIO';
};
