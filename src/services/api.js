import axios from 'axios';

const AES_SECRET_KEY = process.env.AES_SECRET_KEY;
const HMAC_SECRET_KEY = process.env.HMAC_SECRET_KEY;

console.log(AES_SECRET_KEY, HMAC_SECRET_KEY);

const BASE_URL = 'http://localhost:8080/api';

export const getEvents = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/eventos`);
    return response.data;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};