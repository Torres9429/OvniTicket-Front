/**
 * Cliente API con Cifrado Automático + JWT
 *
 * Cifra payloads salientes con AES-256-CBC + HMAC-SHA256
 * Descifra respuestas que contengan campo "ciphertext"
 * Incluye Bearer token automáticamente desde localStorage
 */

import axios from 'axios';
import { descifrarPayload, validarLlavesCripto } from './cifrado';

const URL_BASE = 'http://127.0.0.1:8000/api';
const CLAVE_SECRETA_AES = import.meta.env.VITE_AES_SECRET_KEY;
const CLAVE_SECRETA_HMAC = import.meta.env.VITE_HMAC_SECRET_KEY;

// Validar claves al cargar
try {
  validarLlavesCripto(CLAVE_SECRETA_AES, CLAVE_SECRETA_HMAC);
} catch (error) {
  console.error(error);
  if (import.meta.env.PROD) throw error;
}

// ============================================================================
// INSTANCIA AXIOS
// ============================================================================

const instanciaAxios = axios.create({
  baseURL: URL_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ============================================================================
// INTERCEPTOR DE REQUEST — JWT Bearer Token
// ============================================================================

instanciaAxios.interceptors.request.use(
  (configuracion) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      configuracion.headers.Authorization = `Bearer ${token}`;
    }
    return configuracion;
  },
  (error) => Promise.reject(error)
);

// ============================================================================
// INTERCEPTOR DE RESPUESTA — Descifrar + Refresh automático en 401
// ============================================================================

let refrescando = null;

instanciaAxios.interceptors.response.use(
  async (respuesta) => {
    try {
      if (respuesta.data && respuesta.data.ciphertext) {
        const descifrado = await descifrarPayload(
          respuesta.data.ciphertext,
          CLAVE_SECRETA_AES,
          CLAVE_SECRETA_HMAC
        );
        respuesta.data = descifrado;
      }
      return respuesta;
    } catch (error) {
      console.error('Error descifrando respuesta:', error);
      return Promise.reject({
        message: 'Fallo al descifrar la respuesta del servidor',
        originalError: error,
        respuesta,
      });
    }
  },
  async (error) => {
    const peticionOriginal = error.config;

    if (error.response?.status === 401 && !peticionOriginal._reintento) {
      peticionOriginal._reintento = true;
      const refreshToken = localStorage.getItem('refresh');

      if (refreshToken) {
        try {
          if (!refrescando) {
            refrescando = axios.post(`${URL_BASE}/auth/refresh/`, { refresh: refreshToken });
          }
          const { data } = await refrescando;
          refrescando = null;

          localStorage.setItem('jwt', data.access);
          peticionOriginal.headers.Authorization = `Bearer ${data.access}`;
          return instanciaAxios(peticionOriginal);
        } catch (errRefresh) {
          refrescando = null;
          console.warn('Refresh token inválido — cerrando sesión');
        }
      }

      localStorage.removeItem('jwt');
      localStorage.removeItem('refresh');
      localStorage.removeItem('usuario');
      window.location.href = '/iniciar-sesion';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// MÉTODOS DEL CLIENTE API
// ============================================================================

export const clienteApi = {
  /**
   * GET — descifra automáticamente
   */
  async get(endpoint, configuracion = {}) {
    try {
      const respuesta = await instanciaAxios.get(endpoint, configuracion);
      return respuesta.data;
    } catch (error) {
      manejarError('GET', endpoint, error);
      throw error;
    }
  },

  /**
   * POST — envía payload en texto plano
   */
  async post(endpoint, datos, configuracion = {}) {
    try {
      const respuesta = await instanciaAxios.post(endpoint, datos, configuracion);
      return respuesta.data;
    } catch (error) {
      manejarError('POST', endpoint, error);
      throw error;
    }
  },

  /**
   * PUT — envía payload en texto plano
   */
  async put(endpoint, datos, configuracion = {}) {
    try {
      const respuesta = await instanciaAxios.put(endpoint, datos, configuracion);
      return respuesta.data;
    } catch (error) {
      manejarError('PUT', endpoint, error);
      throw error;
    }
  },

  /**
   * PATCH — envía payload en texto plano
   */
  async patch(endpoint, datos, configuracion = {}) {
    try {
      const respuesta = await instanciaAxios.patch(endpoint, datos, configuracion);
      return respuesta.data;
    } catch (error) {
      manejarError('PATCH', endpoint, error);
      throw error;
    }
  },

  /**
   * DELETE
   */
  async delete(endpoint, configuracion = {}) {
    try {
      const respuesta = await instanciaAxios.delete(endpoint, configuracion);
      return respuesta.data;
    } catch (error) {
      manejarError('DELETE', endpoint, error);
      throw error;
    }
  },

  /** Acceso directo a axios para casos especiales */
  instancia: instanciaAxios,
};

// ============================================================================
// MANEJO DE ERRORES
// ============================================================================

function manejarError(metodo, endpoint, error) {
  if (error.response) {
    const estado = error.response.status;
    const mensaje = error.response.data?.error || 'Error desconocido';
    console.error(`${metodo} ${endpoint} falló (${estado}):`, mensaje);

    switch (estado) {
      case 400: console.error('  → Datos inválidos. Verifica los datos enviados.'); break;
      case 401: console.error('  → No autenticado. Sesión expirada.'); break;
      case 403:
        if (mensaje.includes('Tampering') || mensaje.includes('HMAC')) {
          console.error('  → ALERTA DE SEGURIDAD: ¡Los datos fueron modificados!');
        } else {
          console.error('  → No tienes permisos para esta acción.');
        }
        break;
      case 404: console.error('  → Recurso no encontrado.'); break;
      case 500: console.error('  → Error interno del servidor.'); break;
      default: console.error(`  → Error HTTP ${estado}`);
    }
  } else if (error.request) {
    console.error(`Sin respuesta del servidor (${metodo} ${endpoint})`);
  } else {
    console.error(`Error: ${error.message}`);
  }
}

export default clienteApi;
