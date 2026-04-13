import axios from 'axios';
import { cifrarPayload, descifrarPayload, validarLlavesCripto } from './cifrado';

const BASE_URL = 'http://127.0.0.1:8000/api';

const apiAutenticacion = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const AES_KEY = import.meta.env.VITE_AES_SECRET_KEY;
const HMAC_KEY = import.meta.env.VITE_HMAC_SECRET_KEY;

let llavesValidadas = false;

function estanLlavesConfiguradas() {
  return Boolean(AES_KEY && HMAC_KEY);
}

function asegurarLlaves() {
  if (!estanLlavesConfiguradas()) {
    return false;
  }

  if (!llavesValidadas) {
    validarLlavesCripto(AES_KEY, HMAC_KEY);
    llavesValidadas = true;
  }
  return true;
}

async function postCifrado(url, payload) {
  if (!asegurarLlaves()) {
    return apiAutenticacion.post(url, payload);
  }

  const ciphertext = await cifrarPayload(payload, AES_KEY, HMAC_KEY);
  const response = await apiAutenticacion.post(url, { ciphertext });

  if (response?.data?.ciphertext) {
    const data = await descifrarPayload(response.data.ciphertext, AES_KEY, HMAC_KEY);
    return { ...response, data };
  }

  return response;
}

/**
 * Iniciar Sesión — endpoint público
 * @param {{ correo: string, contrasena: string }} credenciales
 */
export const iniciarSesion = async (credenciales) => {
  return postCifrado('/auth/login/', credenciales);
};

/**
 * Registro de usuario normal — endpoint auth/registro/usuario/
 * @param {{ nombre: string, apellidos?: string, correo: string, contrasena: string, fecha_nacimiento: string }} datosUsuario
 */
export const registrarUsuario = async (datosUsuario) => {
  return postCifrado('/auth/registro/usuario/', datosUsuario);
};

/**
 * Registro de cliente/organizador — endpoint auth/registro/cliente/
 * @param {{ nombre: string, apellidos?: string, correo: string, contrasena: string, fecha_nacimiento: string }} datosCliente
 */
export const registrarCliente = async (datosCliente) => {
  return postCifrado('/auth/registro/cliente/', datosCliente);
};

/**
 * Refrescar token JWT
 * @param {{ refresh: string }} token
 */
export const refrescarToken = async (token) => {
  return apiAutenticacion.post('/auth/refresh/', { refresh: token });
};

export default apiAutenticacion;
