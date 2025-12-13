import { createClient } from './client';

export async function markAllNotificationsRead(token: string) {
  const client = createClient(token);
  await client.post('/notifications_mark_read.php');
}
