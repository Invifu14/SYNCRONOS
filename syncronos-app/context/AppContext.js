import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { registerForPushNotificationsAsync } from '../utils/notifications';

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
  const [socket, setSocket] = useState(null);
  const pushRegistrationAttempted = useRef(false);

  const apiFetch = useCallback((path, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (sessionToken) {
      headers.set('x-session-token', sessionToken);
    }
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
  }, [baseUrl, sessionToken]);

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

    const path = sessionToken ? `/sesion/${sessionToken}` : `/perfil/${user.id}`;
    const response = await apiFetch(path);
    if (!response.ok) return null;

    const data = await response.json();
    const nextUser = data.usuario ?? data;
    setUserState(nextUser);
    return nextUser;
  }, [apiFetch, sessionToken, user?.id]);

  const logout = useCallback(async () => {
    try {
      const currentToken = sessionToken;
      const currentUserId = user?.id;

      await sessionStorage.removeItem(SESSION_TOKEN_KEY);

      if (currentToken && currentUserId) {
        try {
          await fetch(`${baseUrl}/usuarios/${currentUserId}/push-token`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-session-token': currentToken,
            },
            body: JSON.stringify({ push_token: '' }),
          });
        } catch (_error) {
          // Ignore push token cleanup failures during logout.
        }
      }

      if (currentToken) {
        await fetch(`${baseUrl}/sesion/${currentToken}`, { method: 'DELETE' });
      }
    } catch (error) {
      console.error('No se pudo cerrar la sesion', error);
    } finally {
      pushRegistrationAttempted.current = false;
      setSocket((currentSocket) => {
        currentSocket?.disconnect();
        return null;
      });
      setSessionToken(null);
      setUserState(null);
    }
  }, [baseUrl, sessionToken, user?.id]);

  useEffect(() => {
    if (!sessionToken || !user?.id) {
      setSocket((currentSocket) => {
        currentSocket?.disconnect();
        return null;
      });
      return undefined;
    }

    const nextSocket = io(baseUrl, {
      transports: ['websocket'],
      auth: { token: sessionToken },
    });

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
      setSocket((currentSocket) => (currentSocket === nextSocket ? null : currentSocket));
    };
  }, [baseUrl, sessionToken, user?.id]);

  useEffect(() => {
    if (!sessionToken || !user?.id || pushRegistrationAttempted.current) return;

    let active = true;
    pushRegistrationAttempted.current = true;

    const registerPushToken = async () => {
      try {
        const { token } = await registerForPushNotificationsAsync();
        if (!active || !token) return;

        await fetch(`${baseUrl}/usuarios/${user.id}/push-token`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': sessionToken,
          },
          body: JSON.stringify({ push_token: token }),
        });
      } catch (error) {
        console.error('No se pudo registrar el token push', error);
      }
    };

    registerPushToken();

    return () => {
      active = false;
    };
  }, [baseUrl, sessionToken, user?.id]);

  const value = {
    user,
    setUser,
    sessionToken,
    sessionReady,
    baseUrl,
    apiFetch,
    socket,
    completeLogin,
    restoreSession,
    refreshUser,
    logout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
