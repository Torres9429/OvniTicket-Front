import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/api';

const authApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const login = async (credentials) => {
  return authApi.post('/auth/login/', credentials);
};

export default authApi;
