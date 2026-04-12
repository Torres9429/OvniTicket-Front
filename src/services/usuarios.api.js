import { clienteApi } from './api';

/**
 * CRUD de Usuarios
 */

/** Listar todos los usuarios */
export const obtenerUsuarios = () => clienteApi.get('/usuarios/');

/** Obtener un usuario por ID */
export const obtenerUsuario = (id) => clienteApi.get(`/usuarios/${id}/`);

/** Crear usuario */
export const crearUsuario = (datos) => clienteApi.post('/usuarios/', datos);

/** Actualizar usuario completo */
export const actualizarUsuario = (id, datos) => clienteApi.put(`/usuarios/${id}/`, datos);

/** Eliminar usuario */
export const eliminarUsuario = (id) => clienteApi.delete(`/usuarios/${id}/`);

/** Obtener usuarios por rol */
export const obtenerUsuariosPorRol = (idRol) => clienteApi.get(`/usuarios/por-rol/${idRol}/`);

/** Aprobar usuario pendiente */
export const aprobarUsuario = (id) => clienteApi.patch(`/usuarios/${id}/aprobar/`);

/** Desactivar usuario */
export const desactivarUsuario = (id) => clienteApi.patch(`/usuarios/${id}/desactivar/`);
