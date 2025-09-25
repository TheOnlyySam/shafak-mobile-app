// src/screens/AdminCarsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Modal, RefreshControl, Alert, Pressable } from 'react-native';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Car } from '../types';
import CarForm from '../components/CarForm';
import CarCard from '../components/CarCard';

export default function AdminCarsScreen() {
  const { token, logout } = useAuth();
  const client = createClient(token);

  const [cars, setCars] = useState<Car[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Car | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const res = await client.get<Car[]>('/cars.php');
      setCars(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load cars.');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onSubmit(payload: any) {
    setSaving(true);
    try {
      // car_save.php expects DB column names; payload is already shaped that way by CarForm
      const res = await client.post('/car_save.php', payload);
      if (!res.data?.ok) throw new Error(res.data?.error || 'Save failed');
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 16, flexDirection: 'row', gap: 16 }}>
        <Pressable onPress={() => { setEditing(null); setModalOpen(true); }}>
          <Text style={{ color: '#2e6dd8', fontWeight: '700' }}>Add Car</Text>
        </Pressable>
        <Pressable onPress={logout}>
          <Text style={{ color: '#2e6dd8' }}>Sign Out</Text>
        </Pressable>
      </View>

      <FlatList
        data={cars}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#ddd' }} />}
        renderItem={({ item }) => (
          <CarCard
            car={item}
            onEdit={(car) => { setEditing(car); setModalOpen(true); }}
          />
        )}
      />

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={{ flex: 1, padding: 16 }}>
          <CarForm
            initial={editing ?? undefined}
            loading={saving}
            onCancel={() => setModalOpen(false)}
            onSubmit={onSubmit}
          />
        </View>
      </Modal>
    </View>
  );
}
