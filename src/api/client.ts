import axios from 'axios';
import Constants from 'expo-constants';

const baseURL =
  (Constants.expoConfig?.extra as any)?.apiBaseUrl ||
  'https://shafakalkhaleej.com/api';

export function createClient(token?: string | null) {
  const client = axios.create({ baseURL });
  if (token) client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  return client;
}
