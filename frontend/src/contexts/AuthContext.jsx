import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('SIET_user')); } catch { return null; }
  });

  const login = useCallback(async (email, password) => {
    const { data } = await client.post('/auth/login', { email, password });
    localStorage.setItem('SIET_token', data.token);
    localStorage.setItem('SIET_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await client.post('/auth/register', formData);
    localStorage.setItem('SIET_token', data.token);
    localStorage.setItem('SIET_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('SIET_token');
    localStorage.removeItem('SIET_user');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await client.get(`/users/${user.id}`);
      localStorage.setItem('SIET_user', JSON.stringify(data));
      setUser(data);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const handleUpdate = () => {
      client.get(`/users/${user.id}`).then(({ data }) => {
        localStorage.setItem('SIET_user', JSON.stringify(data));
        setUser(data);
      }).catch(() => {});
    };

    window.addEventListener('scoreUpdated', handleUpdate);
    window.addEventListener('pendingUpdated', handleUpdate);
    return () => {
      window.removeEventListener('scoreUpdated', handleUpdate);
      window.removeEventListener('pendingUpdated', handleUpdate);
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
