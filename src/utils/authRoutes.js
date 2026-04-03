export const normalizeRole = (role) => String(role || '').toUpperCase();

export const getHomePathByRole = (role) => {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case 'ADMIN':
      return '/';
    case 'CLIENTE':
    case 'CLIENT':
      return '/';
    case 'USER':
    case 'USUARIO':
      return '/';
    default:
      return '/login';
  }
};
