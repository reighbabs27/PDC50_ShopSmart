import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

// Holds only public account details. The session itself lives in an HttpOnly
// cookie that JavaScript cannot read.
export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getCurrentCustomer();
      setCustomer(data?.customer ?? null);
    } catch {
      setCustomer(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (credentials) => {
    const data = await api.login(credentials);
    setCustomer(data.customer);
    return data.customer;
  }, []);

  const register = useCallback(async (details) => {
    const data = await api.register(details);
    setCustomer(data.customer);
    return data.customer;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setCustomer(null);
    }
  }, []);

  const value = useMemo(
    () => ({ customer, checking, login, register, logout, refresh }),
    [customer, checking, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
