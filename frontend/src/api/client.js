import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 60000, 
});

const CACHE_TTL = 60 * 1000;
const responseCache = new Map();

function buildCacheKey(config) {
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') return null;

  const baseURL = config.baseURL || client.defaults.baseURL || '';
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  const token = localStorage.getItem('SIET_token') || '';
  return `${baseURL}${url}?${params}::${token}`;
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('SIET_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const cacheKey = buildCacheKey(config);
  if (cacheKey) {
    config.metadata = { cacheKey };
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      config.adapter = async () => ({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: { 'x-cache': 'HIT' },
        config,
        request: null,
      });
    }
  }
  return config;
});

client.interceptors.response.use(
  (res) => {
    const cacheKey = res.config?.metadata?.cacheKey;
    if (cacheKey && res.config?.method?.toLowerCase() === 'get') {
      responseCache.set(cacheKey, { data: res.data, expiry: Date.now() + CACHE_TTL });
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('SIET_token');
      localStorage.removeItem('SIET_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export function clearApiCache() {
  responseCache.clear();
}

export default client;
