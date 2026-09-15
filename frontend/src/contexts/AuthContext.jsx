import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

function normalizeUser(userData) {
  if (!userData) return null;
  const isAdmin = Boolean(
    userData.is_admin ||
    userData.role === 'admin' ||
    userData.role === 'faculty'
  );
  return {
    ...userData,
    is_admin: isAdmin
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('SIET_user');
      return stored ? normalizeUser(JSON.parse(stored)) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password) => {
    const { data } = await client.post('/auth/login', { email, password });
    const normalized = normalizeUser(data.user);
    localStorage.setItem('SIET_token', data.token);
    localStorage.setItem('SIET_user', JSON.stringify(normalized));
    setUser(normalized);
    return normalized;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await client.post('/auth/register', formData);
    const normalized = normalizeUser(data.user);
    localStorage.setItem('SIET_token', data.token);
    localStorage.setItem('SIET_user', JSON.stringify(normalized));
    setUser(normalized);
    return normalized;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('SIET_token');
    localStorage.removeItem('SIET_user');
    sessionStorage.removeItem('SIET_admin_scope');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await client.get(`/users/${user.id}`);
      const normalized = normalizeUser(data);
      localStorage.setItem('SIET_user', JSON.stringify(normalized));
      setUser(normalized);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const handleUpdate = () => {
      client.get(`/users/${user.id}`).then(({ data }) => {
        const normalized = normalizeUser(data);
        localStorage.setItem('SIET_user', JSON.stringify(normalized));
        setUser(normalized);
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
