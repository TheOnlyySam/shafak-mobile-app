import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { AppNotification } from '../types';

export default function NotificationsScreen() {
  const { token } = useAuth();
  const client = createClient(token);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const res = await client.get<AppNotification[]>('/notifications.php');
      setItems(Array.isArray(res.data) ? res.data : []);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <FlatList
      data={items}
      keyExtractor={(n) => String(n.id)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.time}>{item.createdAt}</Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>No notifications.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: { fontWeight: '800', marginBottom: 4 },
  body: { color: '#374151' },
  time: { marginTop: 6, fontSize: 12, color: '#9CA3AF' },
  empty: { textAlign: 'center', marginTop: 24, color: '#6B7280' },
});
