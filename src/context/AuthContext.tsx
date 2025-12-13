import React, { createContext, useContext, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { createClient } from '../api/client';

async function registerForPushNotifications(apiToken: string) {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const expoToken = (await Notifications.getExpoPushTokenAsync()).data;

  const client = createClient(apiToken);
  await client.post('/push_token_save.php', {
    expo_token: expoToken,
    platform: Platform.OS,
  });
}

type Ctx = {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<Ctx>({
  token: null,
  user: null,
  login: () => {},
  logout: () => {}
});


export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        const storedUser = await AsyncStorage.getItem('auth_user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to restore auth', e);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      login: async (t: string, u: User) => {
        setToken(t);
        setUser(u);
        try {
          await AsyncStorage.setItem('auth_token', t);
          await AsyncStorage.setItem('auth_user', JSON.stringify(u));
        } catch (e) {
          console.error('Failed to persist auth', e);
        }
        registerForPushNotifications(t).catch(console.error);
      },
      logout: async () => {
        setToken(null);
        setUser(null);
        try {
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('auth_user');
        } catch (e) {
          console.error('Failed to clear auth', e);
        }
      }
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
