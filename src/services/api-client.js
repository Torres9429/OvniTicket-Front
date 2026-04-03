/**
 * Cliente API con Cifrado Automático
 * 
 * Maneja cifrado/descifrado de payloads automáticamente
 * Compatible con backend Django con AESRenderer
 * 
 * Uso:
 * import { apiClient } from './api-client';
 * 
 * const user = await apiClient.get('/usuarios/');
 * const createdUser = await apiClient.post('/usuarios/', {name: 'John'});
 */

import axios from 'axios';
import {
  encryptPayload,
  decryptPayload,
  validateCryptoKeys,
} from './crypto';


const BASE_URL ='http://127.0.0.1:8000/api';
const AES_SECRET_KEY = import.meta.env.VITE_AES_SECRET_KEY;
const HMAC_SECRET_KEY = import.meta.env.VITE_HMAC_SECRET_KEY;


// Validar claves al cargar el módulo
try {
  validateCryptoKeys(AES_SECRET_KEY, HMAC_SECRET_KEY);
} catch (error) {
  console.error(error);
  // En desarrollo, permitir continuar; en producción, fallar
  if (import.meta.env.PROD) {
    throw error;
  }
}

// ============================================================================
// CLIENTE AXIOS BASE
// ============================================================================

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// ============================================================================
// INTERCEPTOR DE RESPUESTA - Descifrar automáticamente
// ============================================================================

axiosInstance.interceptors.response.use(
  async (response) => {
    try {
      // Si la respuesta tiene "ciphertext", descifrar
      if (response.data && response.data.ciphertext) {
        const decrypted = await decryptPayload(
          response.data.ciphertext,
          AES_SECRET_KEY,
          HMAC_SECRET_KEY
        );
        response.data = decrypted;
      }
      return response;
    } catch (error) {
      console.error('Error descifrando respuesta:', error);
      // Si falla el descifrado, rechazar la respuesta
      return Promise.reject({
        message: 'Failed to decrypt server response',
        originalError: error,
        response,
      });
    }
  },
  (error) => {
    console.error('Error en respuesta HTTP:', error.response?.status);
    return Promise.reject(error);
  }
);

// ============================================================================
// MÉTODOS DEL CLIENTE API
// ============================================================================

export const apiClient = {
  /**
   * GET - Obtener datos (descifra automáticamente)
   */
  async get(endpoint, config = {}) {
    try {
      const response = await axiosInstance.get(endpoint, config);
      return response.data;
    } catch (error) {
      handleError('GET', endpoint, error);
      throw error;
    }
  },

  /**
   * POST - Enviar datos cifrados
   */
  async post(endpoint, data, config = {}) {
    try {
      // Cifrar el payload antes de enviar
      const encrypted = await encryptPayload(
        data,
        AES_SECRET_KEY,
        HMAC_SECRET_KEY
      );

      const response = await axiosInstance.post(
        endpoint,
        { ciphertext: encrypted },
        config
      );
      return response.data;
    } catch (error) {
      handleError('POST', endpoint, error);
      throw error;
    }
  },

  /**
   * PUT - Actualizar datos cifrados
   */
  async put(endpoint, data, config = {}) {
    try {
      const encrypted = await encryptPayload(
        data,
        AES_SECRET_KEY,
        HMAC_SECRET_KEY
      );

      const response = await axiosInstance.put(
        endpoint,
        { ciphertext: encrypted },
        config
      );
      return response.data;
    } catch (error) {
      handleError('PUT', endpoint, error);
      throw error;
    }
  },

  /**
   * PATCH - Actualización parcial cifrada
   */
  async patch(endpoint, data, config = {}) {
    try {
      const encrypted = await encryptPayload(
        data,
        AES_SECRET_KEY,
        HMAC_SECRET_KEY
      );

      const response = await axiosInstance.patch(
        endpoint,
        { ciphertext: encrypted },
        config
      );
      return response.data;
    } catch (error) {
      handleError('PATCH', endpoint, error);
      throw error;
    }
  },

  /**
   * DELETE - Eliminar recurso
   */
  async delete(endpoint, config = {}) {
    try {
      const response = await axiosInstance.delete(endpoint, config);
      return response.data;
    } catch (error) {
      handleError('DELETE', endpoint, error);
      throw error;
    }
  },

  /**
   * Acceso directo a axios para casos especiales
   */
  instance: axiosInstance,
};

// ============================================================================
// MANEJO DE ERRORES
// ============================================================================

function handleError(method, endpoint, error) {
  if (error.response) {
    // El servidor respondió con status de error
    const status = error.response.status;
    const message = error.response.data?.error || 'Unknown error';

    console.error(`${method} ${endpoint} failed (${status}):`, message);

    switch (status) {
      case 400:
        console.error('  → Datos inválidos. Verifica el payload.');
        break;
      case 401:
        console.error('  → No autenticado. Necesitas iniciar sesión.');
        break;
      case 403:
        if (message.includes('Tampering') || message.includes('HMAC')) {
          console.error('  → ALERTA SEGURIDAD: El payload fue modificado!');
        } else {
          console.error('  → No tienes permisos para esta acción.');
        }
        break;
      case 404:
        console.error('  → Recurso no encontrado.');
        break;
      case 500:
        console.error('  → Error interno del servidor.');
        break;
      default:
        console.error(`  → Error HTTP ${status}`);
    }
  } else if (error.request) {
    console.error(`No response from server (${method} ${endpoint})`);
  } else {
    console.error(`Error: ${error.message}`);
  }
}

// ============================================================================
// EXPORTAR
// ============================================================================

export default apiClient;
