import { useEffect, useState } from 'react';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function useUnreadNotifications() {
  const { token } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!token) return;

    const client = createClient(token);

    const load = async () => {
      try {
        const res = await client.get('/notifications_unread_count.php');
        setCount(res.data?.count ?? 0);
      } catch {
        setCount(0);
      }
    };

    load();
    const interval = setInterval(load, 15000); // every 15s

    return () => clearInterval(interval);
  }, [token]);

  return { count };
}
