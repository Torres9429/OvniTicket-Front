import { clienteApi } from './api';

/**
 * Roles — lectura para FK selects
 */

/** Listar todos los roles */
export const obtenerRoles = () => clienteApi.get('/roles/');
