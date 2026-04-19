import { apiClient } from './api';

/**
 * CRUD de Usuarios
 */

/** Listar todos los usuarios */
export const getUsers = () => apiClient.get('/usuarios/');

/** Obtener un usuario por ID */
export const getUser = (id) => apiClient.get(`/usuarios/${id}/`);

/** Crear usuario */
export const createUser = (data) => apiClient.post('/usuarios/', data);

/** Actualizar usuario completo */
export const updateUser = (id, data) => apiClient.put(`/usuarios/${id}/`, data);

/** Eliminar usuario */
export const deleteUser = (id) => apiClient.delete(`/usuarios/${id}/`);

/** Obtener usuarios por rol */
export const getUsersByRole = (roleId) => apiClient.get(`/usuarios/por-rol/${roleId}/`);

/** Aprobar usuario pendiente */
export const approveUser = (id) => apiClient.patch(`/usuarios/${id}/aprobar/`);

/** Reactivar usuario inactivo */
export const reactivateUser = (id) => apiClient.patch(`/usuarios/${id}/reactivar/`);

/** Desactivar usuario */
export const deactivateUser = (id) => apiClient.patch(`/usuarios/${id}/desactivar/`);
