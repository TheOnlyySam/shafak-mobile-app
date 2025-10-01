// src/screens/AdminCarsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, FlatList, Modal, RefreshControl, Alert, Pressable,
  ActivityIndicator, Dimensions, SafeAreaView, StatusBar, StyleSheet
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: THEME.text, textAlign: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  chipText: { color: THEME.accent, fontWeight: '600' },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    justifyContent: 'center',
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FA812F',
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '700' },
  signOutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFF4EC',
    borderWidth: 1,
    borderColor: '#FA812F',
  },
  signOutBtnText: { color: '#FA812F', fontWeight: '700' },
  shipChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FA812F',
  },
  shipChipText: { color: '#FFFFFF', fontWeight: '700' },
  shippingChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF4EC', // soft orange background
    borderWidth: 1,
    borderColor: '#FA812F',
  },
  shippingChipText: { color: '#FA812F', fontWeight: '700' },
  deleteChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FEE2E2', // soft red background
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  deleteChipText: { color: '#B91C1C', fontWeight: '700' },
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
  filters: { padding: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: THEME.border },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff'
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff'
  },
  filterChipActive: { borderColor: '#FA812F', backgroundColor: '#FFF4EC' },
  filterChipText: { fontWeight: '700', color: '#374151' },
  filterChipTextActive: { color: '#FA812F' },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 16 },
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

  // --- filters (client-only) ---
  const [q, setQ] = useState('');

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

  const filteredCars = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return cars;
    return cars.filter((c) => {
      const it: any = c;
      const hay = [
        it.vin, it.lot, it.containerNumber, it.destination,
        it.make, it.model, it.terminalState, it.agent_name, it.agent_username, it.id
      ].map((x: any) => (x ?? '').toString().toLowerCase()).join(' ');
      return hay.includes(ql);
    });
  }, [cars, q]);

  function openShip(car: Car) {
    // Prefill SHIPPED while keeping ETA / containerNumber / everything else from DB
    setEditing({ ...(car as any), status: 'SHIPPED' } as any);
    setModalOpen(true);
  }

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

  async function pickLocalPhotos(): Promise<string[]> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return [];
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.length) return [];
    return res.assets.map(a => a.uri);
  }

  async function uploadOne(localUri: string): Promise<{ file: string; url: string } | null> {
    const name = localUri.split('/').pop() || 'photo.jpg';
    const ext  = (name.split('.').pop() || '').toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    const form = new FormData();
    form.append('file', { uri: localUri, name, type } as any);

    const r = await client.post('/upload_image.php', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const file = r.data?.file;
    const url  = r.data?.url;
    return file && url ? { file, url } : null;
  }

  /** kind: 'CAR' | 'SHIPPING' */
  async function addPhotosToCar(carId: string | number, kind: 'CAR' | 'SHIPPING') {
    const uris = await pickLocalPhotos();
    if (!uris.length) return;

    let ok = 0;
    for (const uri of uris) {
      try {
        const up = await uploadOne(uri);
        if (!up?.file) continue;

        await client.post('/car_image_set.php', {
          carId,
          image: up.file,     // server expects a bare filename or full URL
          type: kind,         // 'CAR' -> car_images, 'SHIPPING' -> car_shipping_images
          makeMain: 0,
        });
        ok++;
      } catch (e: any) {
        console.log('attach error:', e?.response?.data || e?.message);
      }
    }

    Alert.alert('Upload complete', `Added ${ok} photo${ok === 1 ? '' : 's'}.`);
  }

  async function doDelete(carId: string | number) {
    try {
      await client.post('/car_delete.php', { id: carId });
      await load();
    } catch (e: any) {
      console.log('delete error:', e?.response?.data);
      const msg = e?.response?.data?.detail || e?.response?.data?.error || e?.message || 'Failed to delete';
      Alert.alert('Error', msg);
    }
  }

  function confirmDelete(car: Car) {
    Alert.alert(
      'Delete listing?',
      'This will remove the car and its images from the gallery. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => doDelete((car as any).id) },
      ]
    );
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
        <Text style={styles.headerTitle}>Admin</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => { setEditing(null); setModalOpen(true); }}
            style={styles.addBtn}
          >
            <Text style={styles.addBtnText}>Add Car</Text>
          </Pressable>
          <Pressable onPress={logout} style={styles.signOutBtn}>
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </Pressable>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {/* Search */}
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="Search VIN, LOT, Container, Destination, Model…"
            placeholderTextColor="#9CA3AF"
            value={q}
            onChangeText={setQ}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {error ? (
        <Text style={{ color: '#dc2626', textAlign: 'center', marginTop: 24 }}>{error}</Text>
      ) : !refreshing && filteredCars.length === 0 ? (
        <Text style={styles.empty}>No matching cars.</Text>
      ) : null}

      <FlatList
        data={filteredCars}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={THEME.accent} colors={[THEME.accent]} />}
        renderItem={({ item }) => (
          <View>
            <CarCard
              car={item}
              onGallery={openGallery}
              onEdit={(car) => { setEditing(car); setModalOpen(true); }}
            />
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 8 }}>
              <Pressable onPress={() => openShip(item)} style={styles.shipChip}>
                <Text style={styles.shipChipText}>Ship</Text>
              </Pressable>
              <Pressable onPress={() => addPhotosToCar(item.id, 'SHIPPING')} style={styles.shippingChip}>
                <Text style={styles.shippingChipText}>Add Shipping Photos</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} style={styles.deleteChip}>
                <Text style={styles.deleteChipText}>Delete</Text>
              </Pressable>
            </View>
          </View>
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
