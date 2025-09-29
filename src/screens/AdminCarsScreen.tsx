// src/screens/AdminCarsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Modal, RefreshControl, Alert, Pressable,
  ActivityIndicator, Dimensions, SafeAreaView, StatusBar, StyleSheet
} from 'react-native';
import { Image } from 'expo-image';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Car } from '../types';
import CarForm from '../components/CarForm';
import CarCard from '../components/CarCard';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const THEME = {
  bg: '#F7F8FA',
  cardBg: '#FFFFFF',
  text: '#1F2937',
  subText: '#6B7280',
  border: '#E5E7EB',
  accent: '#2e6dd8',
  muted: '#9CA3AF',
  overlay: 'rgba(0,0,0,0.6)',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.cardBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: THEME.text },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  chipText: { color: THEME.accent, fontWeight: '600' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: THEME.border },
  listContent: { paddingBottom: 24, paddingHorizontal: 12 },
  galleryTopBar: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: THEME.overlay,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  galleryCount: { color: '#fff', opacity: 0.9, fontSize: 13 },
  galleryClose: { color: '#fff', fontWeight: '600' },
});

export default function AdminCarsScreen() {
  const { token, logout } = useAuth();
  const client = createClient(token);

  const [cars, setCars] = useState<Car[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Car | null>(null);
  const [saving, setSaving] = useState(false);

  // --- gallery state (same as Agent) ---
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function load() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await client.get<Car[]>('/cars.php');
      setCars(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Request failed';
      setError(`${e?.response?.status ?? ''} ${msg}`);
    } finally {
      setRefreshing(false);
    }
  }
  useEffect(() => { load(); }, []);

  // exactly like Agent, normalize id to string
  async function openGallery(carId: string) {
    const id = String(carId);
    setGalleryOpen(true);
    setLoadingGallery(true);
    try {
      const res = await client.get<string[]>('/car_images.php', { params: { carId: id } });
      setGalleryImages(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      console.log('admin gallery load error:', e?.response?.status, e?.response?.data || e?.message);
      setGalleryImages([]);
    } finally {
      setLoadingGallery(false);
    }
  }

  async function onSubmit(payload: any) {
    setSaving(true);
    try {
      const res = await client.post('/car_save.php', payload);
      if (!res.data?.ok) throw new Error(res.data?.error || 'Save failed');

      const carId = payload.id ?? res.data?.id; // handle create vs edit
      if (carId && payload._uploadedFile) {
        // put it into car_images (gallery) AND set as main
        await client.post('/car_image_set.php', {
          carId,
          image: payload._uploadedFile, // this is the bare filename we just uploaded
          type: 'CAR',
          makeMain: true,
        });
      }

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Cars (Admin)</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => { setEditing(null); setModalOpen(true); }} style={styles.chip}>
            <Text style={styles.chipText}>Add Car</Text>
          </Pressable>
          <Pressable onPress={logout} style={styles.chip}>
            <Text style={styles.chipText}>Sign Out</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <Text style={{ color: '#dc2626', textAlign: 'center', marginTop: 24 }}>{error}</Text>
      ) : !refreshing && cars.length === 0 ? (
        <Text style={{ color: THEME.subText, textAlign: 'center', marginTop: 24 }}>No cars found.</Text>
      ) : null}

      <FlatList
        data={cars}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={THEME.accent} colors={[THEME.accent]} />}
        renderItem={({ item }) => (
          <CarCard
            car={item}
            onGallery={openGallery}                  // <-- IMPORTANT
            onEdit={(car) => { setEditing(car); setModalOpen(true); }}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
      />

      {/* Add/Edit Car modal */}
      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}>
          <CarForm
            initial={editing ?? undefined}
            onCancel={() => setModalOpen(false)}
            onSubmit={onSubmit as any}
          />
        </View>
      </Modal>

      {/* Gallery modal (same UX as Agent) */}
      <Modal visible={galleryOpen} animationType="slide" onRequestClose={() => setGalleryOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={styles.galleryTopBar}>
            <Pressable onPress={() => setGalleryOpen(false)}><Text style={styles.galleryClose}>Close</Text></Pressable>
            <Text style={styles.galleryCount}>{galleryImages.length} photos</Text>
          </View>

          {loadingGallery ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <FlatList
              data={galleryImages}
              keyExtractor={(u, i) => u + i}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={{ width: SCREEN_W, height: SCREEN_H - 60, justifyContent: 'center', alignItems: 'center' }}>
                  <Image
                    source={{ uri: item }}
                    style={{ width: SCREEN_W, height: SCREEN_H - 60 }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={250}
                    onError={(error) => {
                      const msg = (error as any)?.message ?? String(error);
                      console.log('gallery img error:', item, msg);
                    }}
                  />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
