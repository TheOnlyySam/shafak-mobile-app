import axios from 'axios';
import Constants from 'expo-constants';

const baseURL =
  (Constants.expoConfig?.extra as any)?.apiBaseUrl ||
  'https://shafakalkhaleej.com/public/api';

export function createClient(token?: string | null) {
  const client = axios.create({ baseURL });

  if (token) {
    client.interceptors.request.use((config) => {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;

      // Fallback for servers that drop Authorization:
      config.params = { ...(config.params || {}), token };

      return config;
    });
  }

  return client;
}
