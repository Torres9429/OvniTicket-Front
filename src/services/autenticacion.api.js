import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/api';

const apiAutenticacion = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Iniciar Sesión — endpoint público
 * @param {{ correo: string, contrasena: string }} credenciales
 */
export const iniciarSesion = async (credenciales) => {
  return apiAutenticacion.post('/auth/login/', credenciales);
};

/**
 * Registro de usuario normal — endpoint auth/registro/usuario/
 * @param {{ nombre: string, apellidos?: string, correo: string, contrasena: string, fecha_nacimiento: string }} datosUsuario
 */
export const registrarUsuario = async (datosUsuario) => {
  return apiAutenticacion.post('/auth/registro/usuario/', datosUsuario);
};

/**
 * Registro de cliente/organizador — endpoint auth/registro/cliente/
 * @param {{ nombre: string, apellidos?: string, correo: string, contrasena: string, fecha_nacimiento: string }} datosCliente
 */
export const registrarCliente = async (datosCliente) => {
  return apiAutenticacion.post('/auth/registro/cliente/', datosCliente);
};

/**
 * Refrescar token JWT
 * @param {{ refresh: string }} token
 */
export const refrescarToken = async (token) => {
  return apiAutenticacion.post('/auth/refresh/', { refresh: token });
};

export default apiAutenticacion;
