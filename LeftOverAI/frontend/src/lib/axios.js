import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: 'http://localhost:9000/api',
  withCredentials: true, // Keep this for cookie support
  timeout: 30000,
});


