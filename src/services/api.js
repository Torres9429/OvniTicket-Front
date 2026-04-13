import axios from 'axios';
import { encryptPayload, decryptPayload, validateCryptoKeys } from './cifrado';

const BASE_URL = 'http://127.0.0.1:8000/api';

const authApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - attach JWT automatically when available
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - extract data from all successful responses
authApi.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
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