import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Modal, RefreshControl, Alert } from 'react-native';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Car } from '../types';
import CarForm from '../components/CarForm';

export default function AdminCarsScreen() {
  const { token, logout } = useAuth();
  const client = createClient(token);
  const [cars, setCars] = useState<Car[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Car | null>(null);

  async function load() {
    setRefreshing(true);
    try {
      const res = await client.get('/cars.php');
      setCars(res.data);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(form: Partial<Car> & { agentId: number }) {
    try {
      if (editing) {
        await client.post('/cars.php', { action: 'update', id: editing.id, ...form });
      } else {
        await client.post('/cars.php', { action: 'create', ...form });
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? 'Failed to save');
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
        <Button title="Add Car" onPress={() => { setEditing(null); setModalOpen(true); }} />
        <Button title="Sign Out" onPress={logout} />
      </View>

      <FlatList
        data={cars}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        renderItem={({ item }) => (
          <View style={{ padding: 16, borderBottomWidth: 1 }}>
            <Text style={{ fontWeight: '700' }}>
              {item.make} {item.model} {item.year ? `(${item.year})` : ''}
            </Text>
            {item.agent_name || item.agent_email ? (
              <Text>Agent: {item.agent_name ?? item.agent_email}</Text>
            ) : null}
            <View style={{ marginTop: 8 }}>
              <Button title="Edit" onPress={() => { setEditing(item); setModalOpen(true); }} />
            </View>
          </View>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={{ flex: 1, padding: 16 }}>
          <CarForm
            initial={
              editing
                ? {
                    make: editing.make,
                    model: editing.model,
                    year: editing.year ?? undefined,
                    agentId: editing.agent_id
                  }
                : undefined
            }
            onCancel={() => setModalOpen(false)}
            onSubmit={onSubmit as any}
          />
        </View>
      </Modal>
    </View>
  );
}
