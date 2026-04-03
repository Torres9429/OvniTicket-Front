import axios from 'axios';

const AES_SECRET_KEY = import.meta.env.VITE_AES_SECRET_KEY;
const HMAC_SECRET_KEY = import.meta.env.VITE_HMAC_SECRET_KEY;

console.log(AES_SECRET_KEY, HMAC_SECRET_KEY);

const BASE_URL = 'http://127.0.0.1:8000/api';

export const getEvents = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/eventos`);
    console.log("eventos: ", response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};