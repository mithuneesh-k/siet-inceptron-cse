import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('SIET_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('SIET_token');
      localStorage.removeItem('SIET_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
