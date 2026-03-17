import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useState } from 'react';

export const AppContext = createContext(null);

const SESSION_TOKEN_KEY = 'syncronos_session_token';
const memoryStorage = new Map();

const isStorageUnavailable = (error) => {
  const message = `${error?.message || error || ''}`;
  return message.includes('Native module is null');
};

const sessionStorage = {
  async getItem(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      if (isStorageUnavailable(error)) {
        return memoryStorage.get(key) ?? null;
      }
      throw error;
    }
  },
  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      if (isStorageUnavailable(error)) {
        memoryStorage.set(key, value);
        return;
      }
      throw error;
    }
  },
  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      if (isStorageUnavailable(error)) {
        memoryStorage.delete(key);
        return;
      }
      throw error;
    }
  },
};

export function AppProvider({ children, baseUrl }) {
  const [user, setUserState] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  const setUser = useCallback((nextUser) => {
    setUserState(nextUser);
  }, []);

  const completeLogin = useCallback(async (nextUser, token) => {
    setUserState(nextUser);
    setSessionToken(token);
    if (token) {
      await sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    }
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const storedToken = await sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (!storedToken) {
        setSessionReady(true);
        return;
      }

      const response = await fetch(`${baseUrl}/sesion/${storedToken}`);
      if (!response.ok) {
        await sessionStorage.removeItem(SESSION_TOKEN_KEY);
        setSessionReady(true);
        return;
      }

      const data = await response.json();
      setUserState(data.usuario ?? null);
      setSessionToken(data.token ?? storedToken);
    } catch (error) {
      console.error('No se pudo restaurar la sesion', error);
    } finally {
      setSessionReady(true);
    }
  }, [baseUrl]);

  const refreshUser = useCallback(async () => {
    if (!user?.id) return null;
    const response = await fetch(`${baseUrl}/perfil/${user.id}`);
    if (!response.ok) return null;
    const data = await response.json();
    setUserState(data);
    return data;
  }, [baseUrl, user?.id]);

  const logout = useCallback(async () => {
    try {
      const currentToken = sessionToken;
      await sessionStorage.removeItem(SESSION_TOKEN_KEY);
      if (currentToken) {
        await fetch(`${baseUrl}/sesion/${currentToken}`, { method: 'DELETE' });
      }
    } catch (error) {
      console.error('No se pudo cerrar la sesion', error);
    } finally {
      setSessionToken(null);
      setUserState(null);
    }
  }, [baseUrl, sessionToken]);

  const value = {
    user,
    setUser,
    sessionToken,
    sessionReady,
    baseUrl,
    completeLogin,
    restoreSession,
    refreshUser,
    logout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
