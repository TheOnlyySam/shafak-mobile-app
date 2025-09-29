import React, { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, Modal, Pressable, Text, ActivityIndicator, Dimensions, SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Car } from '../types';
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

export default function AgentCarsScreen() {
  const { token, logout } = useAuth();
  const client = createClient(token);
  const [cars, setCars] = useState<Car[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // gallery modal
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function load() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await client.get<Car[]>('/cars.php');
      console.log('cars count:', Array.isArray(res.data) ? res.data.length : res.data);
      setCars(Array.isArray(res.data) ? res.data : []);
      // log first image to sanity-check
      if (Array.isArray(res.data) && res.data.length) {
        console.log('first image:', res.data[0]?.image);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Request failed';
      console.log('cars load error:', e?.response?.status, e?.response?.data || e?.message);
      setError(`${e?.response?.status ?? ''} ${msg}`);
    } finally {
      setRefreshing(false);
    }
  }

  async function openGallery(carId: string) {
    setGalleryOpen(true);
    setLoadingGallery(true);
    try {
      const res = await client.get<string[]>('/car_images.php', { params: { carId } });
      setGalleryImages(Array.isArray(res.data) ? res.data : []);
    } catch {
      setGalleryImages([]);
    } finally {
      setLoadingGallery(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Cars</Text>
        <Pressable onPress={logout} style={styles.chip}>
          <Text style={styles.chipText}>Sign Out</Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={{ color: '#dc2626', textAlign: 'center', marginTop: 24 }}>{error}</Text>
      ) : !refreshing && cars.length === 0 ? (
        <Text style={{ color: THEME.subText, textAlign: 'center', marginTop: 24 }}>No cars found for your account.</Text>
      ) : null}

      <FlatList
        data={cars}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={THEME.accent} colors={[THEME.accent]} />}
        renderItem={({ item }) => <CarCard car={item} onGallery={openGallery} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
      />

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
