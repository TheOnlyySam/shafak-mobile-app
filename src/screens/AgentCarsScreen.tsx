import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Button } from 'react-native';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Car } from '../types';

export default function AgentCarsScreen() {
  const { token, logout } = useAuth();
  const client = createClient(token);
  const [cars, setCars] = useState<Car[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
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
          </View>
        )}
      />
    </View>
  );
}
