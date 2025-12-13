import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Car } from '../types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type CardKey = 'ALL' | 'NEW' | 'WAREHOUSE' | 'SHIPPING';

export default function CarsHomeScreen() {
  const { token } = useAuth();
  const client = createClient(token);
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN' || role === 'SUPER';

  const [cars, setCars] = useState<Car[]>([]);

  useEffect(() => {
    client.get<Car[]>('/cars.php').then(res => {
      setCars(Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  const stats = useMemo(() => {
    const all = cars.length;

    const warehouse = cars.filter(
      c => !!c.warehouseDate && !c.containerNumber
    ).length;

    const shipping = cars.filter(
      c => !!c.containerNumber
    ).length;

    const newlyAdded = cars.filter(
      c => !c.warehouseDate && !c.containerNumber
    ).length;

    return { all, newlyAdded, warehouse, shipping };
  }, [cars]);

  function openList(type: CardKey) {
    navigation.navigate('Cars', { type });
  }

  return (
    <View style={[styles.container, { paddingBottom: 90 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cars Dashboard</Text>
          <Text style={styles.subtitle}>Overview of your vehicles</Text>
        </View>

        <Pressable style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={24} color="#111827" />
        </Pressable>
      </View>

      <View style={styles.grid}>
        <DashboardCard
          label="All Cars"
          count={stats.all}
          icon={<MaterialCommunityIcons name="car-multiple" size={26} color="#111827" />}
          onPress={() => openList('ALL')}
        />
        <DashboardCard
          label="New Added"
          count={stats.newlyAdded}
          icon={<Ionicons name="sparkles-outline" size={26} color="#111827" />}
          onPress={() => openList('NEW')}
        />
        <DashboardCard
          label="Warehouse"
          count={stats.warehouse}
          icon={<MaterialCommunityIcons name="warehouse" size={26} color="#111827" />}
          onPress={() => openList('WAREHOUSE')}
        />
        <DashboardCard
          label="Shipping"
          count={stats.shipping}
          icon={<Ionicons name="boat-outline" size={26} color="#FA812F" />}
          highlight
          onPress={() => openList('SHIPPING')}
        />
      </View>
    </View>
  );
}

function DashboardCard({
  label,
  count,
  icon,
  onPress,
  highlight,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  onPress: () => void;
  highlight?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        highlight && styles.cardHighlight,
      ]}
    >
      <View style={styles.cardTop}>
        {icon}
        <Text style={styles.cardCount}>{count}</Text>
      </View>
      <Text style={styles.cardLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    color: '#6B7280',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHighlight: {
    borderColor: '#FA812F',
    backgroundColor: '#FFF7ED',
  },
  cardCount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
  },
  cardLabel: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
});
