import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { markAllNotificationsRead } from '../api/notifications';

type ApiNotification = {
  id?: number | string | null;
  title?: string | null;
  body?: string | null;
  audience?: 'ALL' | 'AGENT' | string | null;
  agentId?: string | null;      // your DB column
  createdAt?: string | null;    // your DB column (timestamp)
  is_read: number;
};

type AppNotification = {
  id: number | null;
  title: string;
  body: string;
  audience: 'ALL' | 'AGENT';
  agentId: string | null;
  createdAt: string; // normalized ISO-like string
  is_read: number;   // 0 = unread, 1 = read
};

function toSafeString(v: unknown, fallback: string) {
  if (typeof v === 'string' && v.trim().length) return v;
  return fallback;
}

function normalizeAudience(v: unknown): 'ALL' | 'AGENT' {
  const up = String(v || '').toUpperCase();
  return up === 'AGENT' ? 'AGENT' : 'ALL';
}

/**
 * MySQL timestamp usually comes as: "2025-12-13 10:10:35"
 * iOS Date parsing can fail on that.
 * Convert to ISO-ish: "2025-12-13T10:10:35"
 */
function normalizeMySqlDate(input: unknown): string {
  const s = typeof input === 'string' ? input.trim() : '';
  if (!s) return new Date().toISOString();

  // already ISO
  if (s.includes('T')) return s;

  // convert "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
  if (s.includes(' ')) return s.replace(' ', 'T');

  return s;
}

export default function NotificationsScreen() {
  const { token } = useAuth();
  const client = createClient(token);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;

    setRefreshing(true);
    try {
      const res = await client.get<ApiNotification[]>('/notifications.php');
      const rows = Array.isArray(res.data) ? res.data : [];

      const normalized: AppNotification[] = rows.map((n) => {
        const idNum =
          typeof n.id === 'number'
            ? n.id
            : typeof n.id === 'string' && n.id.trim() !== '' && !Number.isNaN(Number(n.id))
              ? Number(n.id)
              : null;

        const createdAtNorm = normalizeMySqlDate(n.createdAt);

        return {
          id: idNum,
          title: toSafeString(n.title, 'No title'),
          body: toSafeString(n.body, 'No message'),
          audience: normalizeAudience(n.audience),
          agentId: typeof n.agentId === 'string' ? n.agentId : null,
          createdAt: createdAtNorm,
          is_read: Number(n.is_read) === 1 ? 1 : 0,
        };
      });

      setItems(normalized);
    } finally {
      setRefreshing(false);
    }
  }, [token]);


  // Mark read when screen is opened (and reload after)
  useFocusEffect(
    useCallback(() => {
      if (!token) return;

      // 1️⃣ Load notifications first
      load().then(() => {
        // 2️⃣ Immediately mark them as read
        setItems((prev) =>
          prev.map((n) => ({ ...n, is_read: 1 }))
        );

        // 3️⃣ Sync backend (fire & forget)
        markAllNotificationsRead(token).catch(() => {});
      });

      return () => {};
    }, [token, load])
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(item, index) => {
        // guarantee unique key even if id missing
        const base = item.id !== null ? `notif-${item.id}` : `notif-x-${index}`;
        return `${base}-${item.createdAt}`;
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      renderItem={({ item }) => {
        const unread = item.is_read === 0;
        const d = new Date(item.createdAt);
        const timeLabel = isNaN(d.getTime()) ? '' : d.toLocaleString();

        return (
          <View style={[styles.card, unread && styles.unread]}>
            <View style={styles.row}>
              {unread && <View style={styles.dot} />}

              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                {!!timeLabel && <Text style={styles.time}>{timeLabel}</Text>}
              </View>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <Text style={styles.empty}>No notifications yet</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: { fontWeight: '700', fontSize: 15, marginBottom: 6, color: '#111827' },
  body: { color: '#374151', fontSize: 14 },
  time: { marginTop: 10, fontSize: 12, color: '#9CA3AF' },
  empty: { textAlign: 'center', marginTop: 40, color: '#6B7280' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unread: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginRight: 10,
    marginTop: 6,
  },
});
