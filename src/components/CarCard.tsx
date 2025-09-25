// src/components/CarCard.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import type { Car } from '../types';

type Props = {
  car: Car;
  onGallery?: (carId: string) => void;
  onEdit?: (car: Car) => void;   // NEW
};

export default function CarCard({ car, onGallery, onEdit }: Props) {
  const title = [car.model, car.year].filter(Boolean).join(' — ') || car.title || 'Vehicle';

  async function copyVIN() { if (car.vin) await Clipboard.setStringAsync(car.vin); }

  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 14, backgroundColor: '#f7f7f7', borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
      <Image
        source={car.image ? { uri: car.image } : undefined}
        style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: '#eee' }}
        contentFit="cover"
        cachePolicy="memory-disk"
        onError={(err) => console.log('img error:', car.image, (err as any)?.message ?? String(err))}
      />

      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: 6 }}>{title}</Text>
        {car.vin ? <Text style={{ color: '#555', marginBottom: 6 }}>{car.vin}</Text> : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {car.destination ? <Text><Text style={{ fontWeight: '700' }}>Destination: </Text>{car.destination}</Text> : null}
          {car.status ? <Text><Text style={{ fontWeight: '700' }}>Status: </Text>{car.status}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {car.eta ? <Text><Text style={{ fontWeight: '700' }}>ETA: </Text>{car.eta}</Text> : null}
          {car.containerNumber ? <Text><Text style={{ fontWeight: '700' }}>Container: </Text>{car.containerNumber}</Text> : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 18, marginTop: 8, alignItems: 'center' }}>
          <Pressable onPress={() => onGallery?.(car.id)}>
            <Text style={{ color: 'green', fontWeight: '700' }}>gallery</Text>
          </Pressable>
          {car.vin ? (
            <Pressable onPress={copyVIN}>
              <Text style={{ color: '#ff8a00', fontWeight: '700' }}>Copy VIN</Text>
            </Pressable>
          ) : null}
          {onEdit ? (
            <Pressable onPress={() => onEdit(car)} style={{ marginLeft: 'auto' }}>
              <Text style={{ color: '#2e6dd8', fontWeight: '700' }}>Edit</Text>
            </Pressable>
          ) : null}
        </View>

        {car.agent_username ? (
          <Text style={{ marginTop: 6, color: '#666' }}>
            <Text style={{ fontWeight: '700' }}>Agent: </Text>{car.agent_username}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
