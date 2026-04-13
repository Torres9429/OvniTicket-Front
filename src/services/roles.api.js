import { apiClient } from './api';

/**
 * Roles — lectura para FK selects
 */

/** Listar todos los roles */
export const getRoles = () => apiClient.get('/roles/');
