import axios from 'axios';
import { encryptPayload, decryptPayload, validateCryptoKeys } from './cifrado';

//const BASE_URL = 'https://ovniticketsystem.onrender.com/api';
const BASE_URL = 'http://127.0.0.1:8000/api';

const authApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - add JWT token to requests
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 with token refresh and extract data from all successful responses
authApi.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Si es error 401 (Unauthorized) y no es un reintento
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh');
        if (!refreshToken) {
          // No hay refresh token, rechazar
          return Promise.reject(error);
        }

        // Intentar refrescar el token
        const response = await axios.post(`${BASE_URL}/auth/refresh/`, {
          refresh: refreshToken
        });

        const newToken = response.data?.access;
        if (newToken) {
          // Guardar el nuevo token
          localStorage.setItem('jwt', newToken);

          // Actualizar el header de la solicitud original
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          // Reintentar la solicitud original
          return authApi(originalRequest);
        }
      } catch (refreshError) {
        // Si el refresh falla, limpiar la sesión
        localStorage.removeItem('jwt');
        localStorage.removeItem('refresh');
        localStorage.removeItem('usuario');

        // Redirigir al login (mejor hacerlo desde el componente que use esto)
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

const AES_KEY = import.meta.env.VITE_AES_SECRET_KEY;
const HMAC_KEY = import.meta.env.VITE_HMAC_SECRET_KEY;

let keysValidated = false;

function isEncryptedPayloadError(error) {
  const status = error?.response?.status;
  const errorMessage = String(error?.response?.data?.error || '').toLowerCase();

  if (status !== 400 && status !== 403) {
    return false;
  }

  return (
    errorMessage.includes('descifrar payload') ||
    errorMessage.includes('integridad de payload') ||
    errorMessage.includes('hmac')
  );
}

function areKeysConfigured() {
  return Boolean(AES_KEY && HMAC_KEY);
}

function ensureKeys() {
  if (!areKeysConfigured()) {
    return false;
  }

  if (!keysValidated) {
    validateCryptoKeys(AES_KEY, HMAC_KEY);
    keysValidated = true;
  }
  return true;
}

async function postEncrypted(url, payload) {
  if (!ensureKeys()) {
    return authApi.post(url, payload);
  }

  try {
    const ciphertext = await encryptPayload(payload, AES_KEY, HMAC_KEY);
    const response = await authApi.post(url, { ciphertext });

    if (response?.ciphertext) {
      const data = await decryptPayload(response.ciphertext, AES_KEY, HMAC_KEY);
      return data;
    }

    return response;
  } catch (error) {
    // Compatibilidad: si el backend rechaza el payload cifrado, reintenta en plano una sola vez.
    if (isEncryptedPayloadError(error)) {
      return authApi.post(url, payload);
    }
    throw error;
  }
}

/**
 * Login — public endpoint
 * @param {{ correo: string, contrasena: string }} credentials
 */
export const login = async (credentials) => {
  return postEncrypted('/auth/login/', credentials);
};

/**
 * User registration — endpoint auth/registro/usuario/
 * @param {{ nombre: string, apellidos?: string, correo: string, contrasena: string, fecha_nacimiento: string }} userData
 */
export const registerUser = async (userData) => {
  return postEncrypted('/auth/registro/usuario/', userData);
};

/**
 * Client/organizer registration — endpoint auth/registro/cliente/
 * @param {{ nombre: string, apellidos?: string, correo: string, contrasena: string, fecha_nacimiento: string }} clientData
 */
export const registerClient = async (clientData) => {
  return postEncrypted('/auth/registro/cliente/', clientData);
};

/**
 * Refresh JWT token
 * @param {{ refresh: string }} token
 */
export const refreshToken = async (token) => {
  return authApi.post('/auth/refresh/', { refresh: token });
};

/**
 * Direct API client for custom requests (response data is extracted via interceptor)
 */
export const apiClient = authApi;

export default authApi;