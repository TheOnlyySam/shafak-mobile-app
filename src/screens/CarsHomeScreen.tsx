import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Car } from '../types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

type CardKey = 'ALL' | 'NEW' | 'WAREHOUSE' | 'SHIPPING';

export default function CarsHomeScreen() {
  const { token } = useAuth();
  const client = createClient(token);
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN' || role === 'SUPER';

  const insets = useSafeAreaInsets();

  const [cars, setCars] = useState<Car[]>([]);

  const [refreshing, setRefreshing] = useState(false);

  const loadCars = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const res = await client.get<Car[]>('/cars.php');
      setCars(Array.isArray(res.data) ? res.data : []);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadCars();
  }, [loadCars]);

  const isValidDate = (v?: unknown) => {
    if (v === null || v === undefined) return false;
    if (typeof v !== 'string') return false;
    const t = v.trim();
    if (!t) return false;
    if (t === '0000-00-00') return false;
    if (t.toLowerCase() === 'null') return false;
    return true;
  };

  const hasContainerNumber = (v?: unknown) => {
    if (v === null || v === undefined) return false;
    if (typeof v !== 'string') return false;
    return v.trim().length > 0;
  };

  // FINAL RULES (IGNORE STATUS COMPLETELY):
  // - New Added: purchaseDate only (purchaseDate valid, warehouseDate invalid, containerNumber empty)
  // - Warehouse: warehouseDate present (warehouseDate valid, containerNumber empty)
  // - Shipping: containerNumber present
  const isShippingCar = (c: any) => hasContainerNumber(c?.containerNumber);
  const isWarehouseCar = (c: any) => isValidDate(c?.warehouseDate) && !hasContainerNumber(c?.containerNumber);
  const isNewAddedCar = (c: any) =>
    isValidDate(c?.purchaseDate) &&
    !isValidDate(c?.warehouseDate) &&
    !hasContainerNumber(c?.containerNumber);

  const stats = useMemo(() => {
    const all = cars.length;
    const shipping = cars.filter(isShippingCar).length;
    const warehouse = cars.filter(isWarehouseCar).length;
    const newlyAdded = cars.filter(isNewAddedCar).length;
    return { all, newlyAdded, warehouse, shipping };
  }, [cars]);

  function openList(type: CardKey) {
    navigation.navigate('Cars', { type });
  }

  return (
    <SafeAreaView
      style={[styles.container, { paddingBottom: insets.bottom + 120 }]}
      edges={['top', 'bottom']}
    >
      <FlatList
        data={[1]}
        keyExtractor={() => 'dashboard'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadCars} />
        }
        renderItem={() => (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Cars Dashboard</Text>
                <Text style={styles.subtitle}>Overview of your vehicles</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  style={styles.bellBtn}
                  onPress={() => navigation.navigate('Notifications')}
                >
                  <Ionicons name="notifications-outline" size={24} color="#111827" />
                </Pressable>
                {isAdmin && (
                  <Pressable
                    style={styles.bellBtn}
                    onPress={() => navigation.navigate('SendNotification')}
                  >
                    <Ionicons name="megaphone-outline" size={22} color="#111827" />
                  </Pressable>
                )}
              </View>
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
                onPress={() => openList('SHIPPING')}
              />
            </View>

            {isAdmin && (
              <View style={styles.addCarWrapper}>
                <Pressable
                  onPress={() => navigation.navigate('AdminCars', { openForm: true })}
                  style={({ pressed }) => [
                    styles.addCarMainBtn,
                    pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                  ]}
                >
                  <Ionicons name="add-circle-outline" size={26} color="#FFFFFF" />
                  <Text style={styles.addCarMainText}>Add New Car</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      />
    </SafeAreaView>
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
      style={({ pressed }) => [
        { width: '48%' },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
      ]}
    >
      <LinearGradient
        colors={
          highlight
            ? ['#FA812F', '#FFB703']
            : ['#FFFFFF', '#F9FAFB']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          highlight && styles.cardHighlight,
        ]}
      >
        <View style={styles.cardTop}>
          {icon}
          <Text
            style={[
              styles.cardCount,
              highlight && { color: '#FFFFFF' },
            ]}
          >
            {count}
          </Text>
        </View>

        <Text
          style={[
            styles.cardLabel,
            highlight && { color: '#FFFFFF' },
          ]}
        >
          {label}
        </Text>

        <View style={styles.cardChevron}>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={highlight ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
      </LinearGradient>
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
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#6B7280',
    marginBottom: 20,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    borderRadius: 20,
    padding: 22,
    minHeight: 130,

    // iOS-only shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },

    // Android: force flat
    elevation: 0,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FA812F',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  addCarWrapper: {
    marginTop: 28,
    alignItems: 'center',
  },
  addCarMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FA812F',

    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },

    elevation: 0,
  },
  addCarMainText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  cardChevron: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
});
