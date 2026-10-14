import { createContext, useCallback, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { api, tokenStore } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: Record<string, unknown>) => Promise<User>;
  acceptToken: (token: string, user: User) => void;
  logout: () => void;
  setUser: Dispatch<SetStateAction<User | null>>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      return;
    }
    try {
      const { user } = await api.get<{ user: User }>('/auth/me');
      setUser(user);
    } catch {
      tokenStore.set(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setReady(true));
    const onUnauthorized = () => {
      tokenStore.set(null);
      setUser(null);
    };
    window.addEventListener('rpv:unauthorized', onUnauthorized);
    return () => window.removeEventListener('rpv:unauthorized', onUnauthorized);
  }, [refresh]);

  const acceptToken = useCallback((token: string, u: User) => {
    tokenStore.set(token);
    setUser(u);
  }, []);

  const value: AuthState = {
    user,
    ready,
    refresh,
    setUser,
    acceptToken,
    login: async (email, password) => {
      const r = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
      acceptToken(r.token, r.user);
      return r.user;
    },
    register: async (data) => {
      const r = await api.post<{ token: string; user: User }>('/auth/register', data);
      acceptToken(r.token, r.user);
      return r.user;
    },
    logout: () => {
      tokenStore.set(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
