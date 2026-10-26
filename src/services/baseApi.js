import axios from 'axios';

// The browser only calls our own /api routes. The RapidAPI key stays server-side
// in the Vite proxy configuration and is never exposed through VITE_* variables.
const baseApi = axios.create({
  baseURL: '/api/',
  timeout: 25000,
  headers: { Accept: 'application/json' },
});

export default baseApi;
