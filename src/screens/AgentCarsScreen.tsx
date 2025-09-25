import React, { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, Modal, Pressable, Text, ActivityIndicator, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Car } from '../types';
import CarCard from '../components/CarCard';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <Pressable onPress={logout}><Text style={{ color: '#2e6dd8' }}>Sign Out</Text></Pressable>
      </View>

      {error ? (
        <Text style={{ color: 'red', textAlign: 'center', marginTop: 24 }}>{error}</Text>
      ) : !refreshing && cars.length === 0 ? (
        <Text style={{ color: '#666', textAlign: 'center', marginTop: 24 }}>No cars found for your account.</Text>
      ) : null}

      <FlatList
        data={cars}
        keyExtractor={(it) => String(it.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        renderItem={({ item }) => <CarCard car={item} onGallery={openGallery} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#ddd' }} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Modal visible={galleryOpen} animationType="slide" onRequestClose={() => setGalleryOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={() => setGalleryOpen(false)}><Text style={{ color: '#fff' }}>Close</Text></Pressable>
            <Text style={{ color: '#aaa' }}>{galleryImages.length} photos</Text>
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
    </View>
  );
}
