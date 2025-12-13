import React, { createContext, useContext, useMemo, useState } from 'react';
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

  const value = useMemo(
    () => ({
      token,
      user,
      login: (t: string, u: User) => {
        setToken(t);
        setUser(u);
        registerForPushNotifications(t).catch(console.error);
      },
      logout: () => {
        setToken(null);
        setUser(null);
      }
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
