import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken, type User } from './api';

interface AuthState {
  user: User | null;
  loading: boolean;
  needsProfile: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
  setNeedsProfile: (v: boolean) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);

  const refresh = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setNeedsProfile(false);
      setLoading(false);
      return;
    }
    try {
      const data = await api.me();
      setUser(data.user);
      setNeedsProfile(data.needsProfile);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    setToken(data.token);
    if (data.user) setUser(data.user);
    setNeedsProfile(data.needsProfile);
    if (!data.user) await refresh();
  };

  const register = async (email: string, password: string) => {
    const data = await api.register(email, password);
    setToken(data.token);
    setNeedsProfile(true);
    setUser(null);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setNeedsProfile(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, needsProfile, login, register, logout, refresh, setUser, setNeedsProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
