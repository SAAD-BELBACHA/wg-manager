import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { apiRequest } from '@/api/client';
import { AuthResponse, Household, User } from '@/types/api';

const TOKEN_KEY = 'zofri.authToken';

type AuthContextValue = {
  booting: boolean;
  token: string | null;
  user: User | null;
  household: Household | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (inviteCode: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function saveToken(token: string | null) {
  if (Platform.OS === 'web') {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
    return;
  }

  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

async function loadToken() {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);

  const applyAuth = useCallback(async (data: AuthResponse) => {
    setToken(data.token);
    setUser(data.user);
    setHousehold(data.wg || null);
    await saveToken(data.token);
  }, []);

  const clearAuth = useCallback(async () => {
    setToken(null);
    setUser(null);
    setHousehold(null);
    await saveToken(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const storedToken = token || await loadToken();
    if (!storedToken) return;

    try {
      const data = await apiRequest<{ user: User; wg: Household | null }>('/auth/me', {
        token: storedToken
      });
      setToken(storedToken);
      setUser(data.user);
      setHousehold(data.wg);
    } catch {
      await clearAuth();
    }
  }, [clearAuth, token]);

  useEffect(() => {
    refreshMe().finally(() => setBooting(false));
  }, [refreshMe]);

  const value = useMemo<AuthContextValue>(() => ({
    booting,
    token,
    user,
    household,
    login: async (email, password) => {
      const data = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      await applyAuth(data);
    },
    register: async (username, email, password) => {
      const data = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: { username, email, password }
      });
      await applyAuth(data);
    },
    createHousehold: async (name) => {
      if (!token) throw new Error('Nicht angemeldet.');
      const data = await apiRequest<{ wg: Household }>('/wg/create', {
        method: 'POST',
        token,
        body: { name }
      });
      setHousehold(data.wg);
    },
    joinHousehold: async (inviteCode) => {
      if (!token) throw new Error('Nicht angemeldet.');
      const data = await apiRequest<{ wg: Household }>('/wg/join', {
        method: 'POST',
        token,
        body: { invite_code: inviteCode }
      });
      setHousehold(data.wg);
    },
    logout: async () => {
      if (token) {
        try {
          await apiRequest('/auth/logout', { method: 'POST', token });
        } catch {
          // best-effort: still clear the local session even if the revoke call fails
        }
      }
      await clearAuth();
    },
    refreshMe
  }), [applyAuth, booting, clearAuth, household, refreshMe, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
