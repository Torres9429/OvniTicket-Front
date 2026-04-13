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

const AES_KEY = import.meta.env.VITE_AES_SECRET_KEY;
const HMAC_KEY = import.meta.env.VITE_HMAC_SECRET_KEY;

let keysValidated = false;

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

  const ciphertext = await encryptPayload(payload, AES_KEY, HMAC_KEY);
  const response = await authApi.post(url, { ciphertext });

  if (response?.data?.ciphertext) {
    const data = await decryptPayload(response.data.ciphertext, AES_KEY, HMAC_KEY);
    return { ...response, data };
  }

  return response;
}

/**
 * Iniciar Sesión — endpoint público
 * @param {{ correo: string, contrasena: string }} credentials
 */
export const login = async (credentials) => {
  return postEncrypted('/auth/login/', credentials);
};

/**
 * Registro de usuario normal — endpoint auth/registro/usuario/
 * @param {{ nombre: string, apellidos?: string, correo: string, contrasena: string, fecha_nacimiento: string }} userData
 */
export const registerUser = async (userData) => {
  return postEncrypted('/auth/registro/usuario/', userData);
};

/**
 * Registro de cliente/organizador — endpoint auth/registro/cliente/
 * @param {{ nombre: string, apellidos?: string, correo: string, contrasena: string, fecha_nacimiento: string }} clientData
 */
export const registerClient = async (clientData) => {
  return postEncrypted('/auth/registro/cliente/', clientData);
};

/**
 * Refrescar token JWT
 * @param {{ refresh: string }} token
 */
export const refreshToken = async (token) => {
  return authApi.post('/auth/refresh/', { refresh: token });
};

export default authApi;
