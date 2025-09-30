// src/components/CarForm.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator, Alert
} from 'react-native';
import type { Car, CarSavePayload, Brand, Model, Agent, Terminal } from '../types';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Image } from 'expo-image';

import * as ImagePicker from 'expo-image-picker';

// --- helpers to preserve existing IDs when the user doesn't change pickers ---
const pick = <T,>(...vals: (T | null | undefined | '')[]) =>
  vals.find(v => v !== undefined && v !== null && v !== '') as T | null;

const keep = <T,>(prev: T | null | undefined, next: T | null | undefined) =>
  (next === '' || next === null || next === undefined) ? (prev ?? null) : next;

const norm = (s?: string | null) => (s ?? '').toString().trim().toLowerCase();

const resolveBrandIdFromName = (name?: string | null, list: Brand[] = []) => {
  const n = norm(name);
  if (!n) return null;
  const found = list.find(b => norm((b as any).name) === n);
  return (found as any)?.id ?? null;
};

const resolveModelIdFromName = (name?: string | null, list: Model[] = []) => {
  const n = norm(name);
  if (!n) return null;
  const found = list.find(m => norm((m as any).name) === n);
  return (found as any)?.id ?? null;
};

type Props = {
  initial?: Partial<Car>;
  onCancel: () => void;
  onSubmit: (payload: CarSavePayload & Record<string, any>) => void | Promise<void>;
  loading?: boolean;
};

const STATUS_OPTIONS = ['LOADED', 'WAREHOUSE'] as const;
const AUCTION_OPTIONS = ['COPART', 'IAAI', 'MANHEIM'] as const;

// destination option shape for picker (id = slug)
type Dest = { id: string; slug: string; label: string };
const DEFAULT_DESTS: Dest[] = [
  { id: 'um-casr', slug: 'um-casr', label: 'Um-Casr' },
  { id: 'al-aqaba', slug: 'al-aqaba', label: 'Al-Aqaba' },
  { id: 'jabal-ali', slug: 'jabal-ali', label: 'Jabal-Ali' },
];

const TitleToggle = ({ value, onChange }: { value?: 0 | 1 | null; onChange: (v: 0 | 1) => void }) => (
  <View style={{ flexDirection: 'row', gap: 8 }}>
    {([0, 1] as const).map(v => {
      const active = (value ?? 0) === v;
      return (
        <Pressable
          key={v}
          onPress={() => onChange(v)}
          style={{
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
            borderColor: active ? '#2e6dd8' : '#e5e7eb', backgroundColor: active ? '#e6efff' : '#fff'
          }}>
          <Text style={{ fontWeight: '600', color: active ? '#1f4fb3' : '#374151' }}>{v ? 'Yes' : 'No'}</Text>
        </Pressable>
      );
    })}
  </View>
);

const Chips = ({ options, value, onChange }:
  { options: readonly string[]; value?: string | null; onChange: (v: string) => void }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {options.map(opt => {
      const active = opt === value;
      return (
        <Pressable key={opt} onPress={() => onChange(opt)}
          style={{
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
            borderColor: active ? '#2e6dd8' : '#e5e7eb', backgroundColor: active ? '#e6efff' : '#fff'
          }}>
          <Text style={{ fontWeight: '600', color: active ? '#1f4fb3' : '#374151' }}>{opt}</Text>
        </Pressable>
      );
    })}
  </View>
);

const Label = ({ children }: { children: React.ReactNode }) =>
  <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{children}</Text>;

const Input = (p: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    {...p}
    placeholderTextColor="#9ca3af"
    style={[{
      borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
      backgroundColor: p.editable === false ? '#f9fafb' : '#fff',
    }, p.style]}
  />
);

// NOTE: supports name OR label OR username, so we can reuse for Dest too
function PickerModal<T extends { id: string; name?: string | null; label?: string | null; username?: string | null }>(
  { visible, onClose, data, onPick, title, loading }:
  { visible: boolean; onClose: () => void; data: T[]; onPick: (opt: T) => void; title: string; loading?: boolean }
) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
          <Text style={{ fontSize: 18, fontWeight: '800' }}>{title}</Text>
        </View>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : data.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Text style={{ color: '#6b7280' }}>No items found.</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(it) => it.id}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />}
            renderItem={({ item }) => {
              const label =
                ((('name' in item ? (item as any).name : undefined) ??
                  (item as any).label ??
                  (item as any).username) ?? '').toString();
              return (
                <Pressable onPress={() => { onPick(item); onClose(); }} style={{ padding: 16 }}>
                  <Text style={{ fontSize: 16 }}>{label}</Text>
                </Pressable>
              );
            }}
          />
        )}
        <View style={{ padding: 12 }}>
          <Pressable onPress={onClose} style={{ padding: 14, backgroundColor: '#eef2ff', borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', color: '#1f4fb3' }}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function CarForm({ initial, onCancel, onSubmit, loading }: Props) {
  const id = useMemo(() => (initial as any)?.id as string | undefined, [initial]);
  const initialImage = (initial as any)?.image ?? (initial as any)?.image_url ?? null;
  const [imageUri, setImageUri] = useState<string | null>(initialImage);
  const [uploadingImage, setUploadingImage] = useState(false);

  // recently added shipping thumbs (this session only)
  const [shippingThumbs, setShippingThumbs] = useState<string[]>([]);
  const [uploadingShipping, setUploadingShipping] = useState(false);

  // ---- state (vehicle)
  const [makingYear, setYear] = useState(String(initial?.makingYear ?? initial?.year ?? ''));
  const [vin, setVin] = useState(initial?.vin ?? '');
  const [brandId, setBrandId] = useState<string | null>(
    pick((initial as any)?.brandId, (initial as any)?.brand_id, (initial as any)?.brandid)
  );
  const [brandName, setBrandName] = useState<string | null>(initial?.make ?? null);
  const [modelid, setModelId] = useState<string | null>(
    pick((initial as any)?.modelid, (initial as any)?.modelId, (initial as any)?.model_id)
  );
  const [modelName, setModelName] = useState<string | null>(initial?.model ?? null);
  const [color, setColor] = useState((initial as any)?.color ?? '');
  const [lot, setLot] = useState((initial as any)?.lot ?? '');
  const [carKey, setCarKey] = useState<0 | 1>((initial as any)?.carKey ?? 0);
  const [title, setTitle] = useState<0 | 1>(
    typeof initial?.title === 'number' ? (initial?.title as 0 | 1) : (initial?.title ? 1 : 0)
  );
  const [issueDate, setIssueDate] = useState((initial as any)?.issueDate ?? '');

  // ---- assignment
  const [userid, setUserId] = useState<string | null>(
    pick((initial as any)?.userid, (initial as any)?.userId, (initial as any)?.agent_id)
  );
  const [terminalid, setTerminalId] = useState<string | null>(
    pick((initial as any)?.terminalid, (initial as any)?.terminalId, (initial as any)?.terminal_id)
  );

  // ---- logistics
  const [auctionType, setAuctionType] =
    useState<'COPART' | 'IAAI' | 'MANHEIM' | null>((initial as any)?.auctionType ?? null);
  const [destination, setDestination] = useState(initial?.destination ?? '');
  const [status, setStatus] = useState(initial?.status ?? '');
  const [eta, setEta] = useState(initial?.eta ?? '');
  const [containerNumber, setContainer] = useState(initial?.containerNumber ?? '');
  const [note, setNote] = useState((initial as any)?.note ?? '');

  // ---- options (loaded from API)
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [terms, setTerms] = useState<Terminal[]>([]);
  const [dests, setDests] = useState<Dest[]>([]);

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [loadingDests, setLoadingDests] = useState(false);

  const { token } = useAuth();
  const client = createClient(token);

  async function fetchBrands() {
    if (brands.length) return;
    try {
      setLoadingBrands(true);
      const r = await client.get<Brand[]>('/brands.php');
      setBrands(r.data);
    } catch (e: any) {
      console.log('brands load error', e?.response?.status, e?.response?.data || e?.message);
    } finally {
      setLoadingBrands(false);
    }
  }

  async function fetchAgents() {
    if (agents.length) return;
    try {
      setLoadingAgents(true);
      const r = await client.get<Agent[]>('/agents.php');
      setAgents(r.data);
    } catch (e: any) {
      console.log('agents load error', e?.response?.status, e?.response?.data || e?.message);
    } finally {
      setLoadingAgents(false);
    }
  }

  async function fetchTerms() {
    if (terms.length) return;
    try {
      setLoadingTerms(true);
      const r = await client.get<Terminal[]>('/terminals.php');
      setTerms(r.data);
    } catch (e: any) {
      console.log('terminals load error', e?.response?.status, e?.response?.data || e?.message);
    } finally {
      setLoadingTerms(false);
    }
  }

  async function fetchModelsFor(brand: string) {
    try {
      setLoadingModels(true);
      const r = await client.get<Model[]>('/models.php', { params: { brandId: brand } });
      // client-side guard in case API returns all models
      const filtered = Array.isArray(r.data) ? r.data.filter((m: any) => !m?.brandId || m?.brandId === brand) : [];
      setModels(filtered);
    } catch (e: any) {
      console.log('models load error', e?.response?.status, e?.response?.data || e?.message);
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  }

  async function fetchDestinations() {
    if (dests.length) return;
    try {
      setLoadingDests(true);
      const r = await client.get('/destinations.php');
      const arr: any[] = Array.isArray(r.data)
        ? r.data
        : Array.isArray((r as any)?.data?.items)
          ? (r as any).data.items
          : [];
      const mapped: Dest[] = arr.map((it: any) => {
        if (typeof it === 'string') {
          const label = it;
          const slug = label.toLowerCase().replace(/\s+/g, '-');
          return { id: slug, slug, label };
        }
        const label = it?.label ?? it?.name ?? String(it ?? '');
        const slug = (it?.slug ?? label.toLowerCase().replace(/\s+/g, '-')) as string;
        return { id: slug, slug, label };
      });
      setDests(mapped.length ? mapped : DEFAULT_DESTS);
    } catch (e: any) {
      console.log('destinations load error', e?.response?.status, e?.response?.data || e?.message);
      setDests(DEFAULT_DESTS);
    } finally {
      setLoadingDests(false);
    }
  }


  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);

  useEffect(() => {
    // optional: warm caches
    fetchBrands();
    fetchAgents();
    fetchTerms();
    fetchDestinations();
  }, []);

  useEffect(() => {
    if (!brandId) { setModels([]); return; }
    fetchModelsFor(brandId);
  }, [brandId]);

  // If we only have brand *name* from the list API, map it to an ID once brands are loaded
  useEffect(() => {
    if (!brandId && brandName && brands.length) {
      const guess = resolveBrandIdFromName(brandName, brands);
      if (guess) {
        setBrandId(guess);
        const bn = (brands.find(b => (b as any).id === guess) as any)?.name;
        if (bn) setBrandName(bn);
      }
    }
  }, [brands, brandName, brandId]);

  // If we only have model *name*, map it to an ID once models (for the brand) are loaded
  useEffect(() => {
    if (brandId && !modelid && modelName && models.length) {
      const guess = resolveModelIdFromName(modelName, models);
      if (guess) {
        setModelId(guess);
        const mn = (models.find(m => (m as any).id === guess) as any)?.name;
        if (mn) setModelName(mn);
      }
    }
  }, [models, modelName, modelid, brandId]);

  // --- image picker helpers ---
  async function pickImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access to choose a picture.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets && res.assets.length) {
        const asset = res.assets[0];
        setImageUri(asset.uri);
      }
    } catch (e) {
      console.log('pickImage error', e);
    }
  }

  async function uploadImageIfNeeded(uri: string): Promise<{ url: string; file: string } | null> {
    if (!uri) return null;
    // If already a remote URL, skip uploading; we don't have a server filename.
    if (/^https?:\/\//i.test(uri)) return { url: uri, file: '' };

    setUploadingImage(true);
    try {
      const name = (uri.split('/').pop() || 'photo.jpg');
      const ext = (name.split('.').pop() || '').toLowerCase();
      const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      const form = new FormData();
      form.append('file', { uri, name, type } as any);

      const r = await client.post('/upload_image.php', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url =
        typeof r.data === 'string'
          ? r.data
          : (r.data?.url || r.data?.path || r.data?.location || '');
      const file = (r.data?.file || '').toString();

      if (!url) throw new Error('No upload URL returned');
      return { url, file };
    } catch (e: any) {
      console.log('uploadImage error', e?.response?.status, e?.response?.data || e?.message);
      Alert.alert('Upload failed', e?.response?.data?.error ?? e?.message ?? 'Could not upload image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  }

  // Add shipping photos and link to this car
  async function addShippingPhotos() {
    if (!id) {
      Alert.alert('Save car first', 'You can upload shipping photos after creating the car.');
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access to choose photos.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true as any,   // iOS 14+ supports this; other platforms will ignore
        selectionLimit: 0 as any,               // 0 = unlimited on supported platforms
        quality: 0.85,
      });

      const assets = (res as any)?.canceled ? [] : ((res as any)?.assets ?? []);
      if (!assets.length) return;

      setUploadingShipping(true);
      const newThumbs: string[] = [];

      for (const a of assets) {
        const uri = (a as any)?.uri;
        if (!uri) continue;

        // 1) upload the image file to server
        const up = await uploadImageIfNeeded(uri); // returns { url, file }
        if (!up?.url) continue;

        // 2) register it as a SHIPPING image for this car
        try {
          await client.post('/car_image_set.php', {
            carId: id,
            image: up.file || up.url,     // server accepts bare filename OR full URL
            type: 'SHIPPING',
          });
          newThumbs.push(up.url);
        } catch (e: any) {
          console.log('attach shipping image error', e?.response?.status, e?.response?.data || e?.message);
        }
      }

      if (newThumbs.length) {
        // show newest first
        setShippingThumbs(prev => [...newThumbs, ...prev]);
        Alert.alert('Done', `${newThumbs.length} shipping photo(s) added.`);
      }
    } catch (e) {
      console.log('addShippingPhotos error', e);
    } finally {
      setUploadingShipping(false);
    }
  }

  async function save() {
    // Upload the image if needed (local file URI -> remote URL + filename)
    let uploaded: { url: string; file: string } | null = null;
    let mainImage = imageUri ?? ((initial as any)?.image ?? (initial as any)?.image_url ?? null);
    if (imageUri && !/^https?:\/\//i.test(String(imageUri))) {
      uploaded = await uploadImageIfNeeded(String(imageUri));
      if (uploaded?.url) {
        mainImage = uploaded.url;
      }
    }

    // previous values from the existing record (support multiple casings)
    const prevBrandId    = pick((initial as any)?.brandId,    (initial as any)?.brand_id,    (initial as any)?.brandid);
    const prevModelId    = pick((initial as any)?.modelid,    (initial as any)?.modelId,     (initial as any)?.model_id);
    const prevUserId     = pick((initial as any)?.userid,     (initial as any)?.userId,      (initial as any)?.agent_id);
    const prevTerminalId = pick((initial as any)?.terminalid, (initial as any)?.terminalId,  (initial as any)?.terminal_id);

    // Resolve brand/model IDs if the edit form only had names
    const brandIdResolved =
      brandId ??
      resolveBrandIdFromName(brandName, brands) ??
      prevBrandId ??
      null;

    const modelIdResolved =
      modelid ??
      resolveModelIdFromName(modelName, models) ??
      prevModelId ??
      null;

    // Build payload; IMPORTANT: only include brand/model keys if we have a value,
    // otherwise the server might overwrite them with NULL.
    const payload: any = {
      id,
      // vehicle
      makingYear: makingYear ? Number(makingYear) : null,
      vin: vin || null,
      color: color || null,
      lot: lot || null,
      carKey: carKey ?? 0,
      title: title ?? 0,
      issueDate: issueDate || null,

      // assignment
      userid:     keep(prevUserId, userid),
      terminalid: keep(prevTerminalId, terminalid),

      // logistics
      auctionType: auctionType ?? null,
      destination: destination || null,
      status: status || null,
      eta: eta || null,
      containerNumber: containerNumber || null,

      note: note || null,

      // image (server-side main image field; include a few common aliases)
      image: mainImage || null,
      image_url: mainImage || null,

      // send the uploaded server filename so the screen can link it into car_images (and set as main)
      _uploadedFile: uploaded?.file ?? null,
    };

    if (brandIdResolved !== null && brandIdResolved !== undefined && brandIdResolved !== '') {
      payload.brandId = brandIdResolved;
    }
    if (modelIdResolved !== null && modelIdResolved !== undefined && modelIdResolved !== '') {
      payload.modelid = modelIdResolved;
    }

    // --- extra keys to satisfy the website controllers (camel) ---
    if (payload.modelid != null) payload.modelId = payload.modelid;
    if (payload.userid  != null) payload.userId  = payload.userid;
    if (payload.terminalid != null) payload.terminalId = payload.terminalid;
    payload.car_key = carKey ?? 0; // controller expects car_key presence
    // -------------------------------------------------------------

    onSubmit(payload);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1, backgroundColor: '#f6f7fb' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 120 }}>
        <Text style={{ fontSize: 20, fontWeight: '800' }}>
          {id ? 'Edit Car' : 'Add Car'} {id ? `· ${id.slice(0, 4)}` : ''}
        </Text>

        {/* AUCTION */}
        <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '700', marginTop: 18, marginBottom: 8 }}>
          AUCTION
        </Text>
        <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Auction Type</Label>
            <Chips options={AUCTION_OPTIONS as any} value={auctionType ?? ''} onChange={(v) => setAuctionType(v as any)} />
          </View>
        </View>

        {/* VEHICLE */}
        <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '700', marginTop: 18, marginBottom: 8 }}>
          VEHICLE
        </Text>
        <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Making Year</Label>
            <Input value={makingYear} onChangeText={setYear} keyboardType="number-pad" />
          </View>
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>VIN</Label>
            <Input value={vin} onChangeText={setVin} autoCapitalize="characters" />
          </View>

          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Photo</Label>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 88, height: 66, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' }}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <Text style={{ color: '#9ca3af' }}>No photo</Text>
                )}
              </View>

              <Pressable onPress={pickImage} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
                <Text style={{ fontWeight: '700', color: '#1f2937' }}>{imageUri ? 'Change photo' : 'Add photo'}</Text>
              </Pressable>

              {imageUri ? (
                <Pressable onPress={() => setImageUri(null)} style={{ marginLeft: 6, paddingHorizontal: 10, paddingVertical: 10 }}>
                  <Text style={{ color: '#ef4444', fontWeight: '700' }}>Remove</Text>
                </Pressable>
              ) : null}
            </View>

            {uploadingImage ? <Text style={{ color: '#6b7280', marginTop: 6 }}>Uploading…</Text> : null}
          </View>

          {/* shipping photos */}
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Shipping Photos</Label>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <Pressable
                onPress={addShippingPhotos}
                disabled={!id || uploadingShipping}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  backgroundColor: (!id || uploadingShipping) ? '#f3f4f6' : '#fff',
                  opacity: (!id || uploadingShipping) ? 0.6 : 1
                }}
              >
                <Text style={{ fontWeight: '700', color: '#1f2937' }}>
                  {(!id) ? 'Save car first' : (uploadingShipping ? 'Uploading…' : 'Add shipping photos')}
                </Text>
              </Pressable>
            </View>

            {shippingThumbs.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10 }}
                contentContainerStyle={{ paddingRight: 6 }}
              >
                {shippingThumbs.map((u, i) => (
                  <View key={u + i} style={{ width: 88, height: 66, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8 }}>
                    <Image source={{ uri: u }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>

          {/* brand picker */}
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Brand</Label>
            <Pressable onPress={() => { setBrandOpen(true); fetchBrands(); }} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 16 }}>{brandName || 'Choose brand'}</Text>
            </Pressable>
          </View>

          {/* model picker (depends on brand) */}
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Model</Label>
            <Pressable disabled={!brandId} onPress={() => { if (brandId) { fetchModelsFor(brandId); setModelOpen(true); } }}
              style={{
                borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12,
                backgroundColor: brandId ? '#fff' : '#f9fafb'
              }}>
              <Text style={{ fontSize: 16 }}>{modelName || (brandId ? 'Choose model' : 'Choose brand first')}</Text>
            </Pressable>
          </View>

          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Color</Label>
            <Input value={color} onChangeText={setColor} placeholder="e.g., Black" />
          </View>
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Lot</Label>
            <Input value={lot} onChangeText={setLot} placeholder="Lot number" />
          </View>

          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Car Key</Label>
            <TitleToggle value={carKey} onChange={(v) => setCarKey(v)} />
          </View>
          <View style={{ padding: 12 }}>
            <Label>Issue Date (YYYY-MM-DD)</Label>
            <Input value={issueDate} onChangeText={setIssueDate} placeholder="2025-09-16" />
          </View>
        </View>

        {/* ASSIGNMENT */}
        <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '700', marginTop: 18, marginBottom: 8 }}>
          ASSIGNMENT
        </Text>
        <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Agent</Label>
            <Pressable onPress={() => { setAgentOpen(true); fetchAgents(); }} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 16 }}>
                {(agents.find(a => (a as any).id === userid)?.name ??
                  agents.find(a => (a as any).id === userid)?.username ??
                  (userid ? userid : 'Choose agent'))}
              </Text>
            </Pressable>
          </View>
          <View style={{ padding: 12 }}>
            <Label>Terminal</Label>
            <Pressable onPress={() => { setTermOpen(true); fetchTerms(); }} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 16 }}>
                {terms.find(t => (t as any).id === terminalid)?.name || (terminalid ? terminalid : 'Choose terminal')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* LOGISTICS */}
        <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '700', marginTop: 18, marginBottom: 8 }}>
          LOGISTICS
        </Text>
        <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Destination</Label>
            <Pressable onPress={() => { setDestOpen(true); fetchDestinations(); }} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 16 }}>{destination || 'Choose destination'}</Text>
            </Pressable>
          </View>
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Status</Label>
            <Chips options={STATUS_OPTIONS as any} value={status || ''} onChange={setStatus} />
            <Input value={status} onChangeText={setStatus} placeholder="Or custom status…" style={{ marginTop: 8 }} />
          </View>
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>ETA (YYYY-MM-DD)</Label>
            <Input value={eta} onChangeText={setEta} placeholder="2025-11-18" />
          </View>
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Container #</Label>
            <Input value={containerNumber} onChangeText={setContainer} />
          </View>
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Label>Title</Label>
            <TitleToggle value={title} onChange={setTitle} />
          </View>
          <View style={{ padding: 12 }}>
            <Label>Note</Label>
            <Input value={note} onChangeText={setNote} multiline style={{ height: 100, textAlignVertical: 'top' }} />
          </View>
        </View>
      </ScrollView>

      {/* sticky bar */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', flexDirection: 'row', gap: 12 }}>
        <Pressable onPress={onCancel} style={{ flex: 1, backgroundColor: '#eef2ff', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ color: '#1f4fb3', fontWeight: '800' }}>Cancel</Text>
        </Pressable>
        <Pressable disabled={loading || uploadingImage} onPress={save} style={{ flex: 1, backgroundColor: '#2e6dd8', opacity: (loading || uploadingImage) ? 0.6 : 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{uploadingImage ? 'Uploading…' : (loading ? 'Saving…' : 'Save')}</Text>
        </Pressable>
      </View>

      {/* pickers */}
      <PickerModal<Brand>
        visible={brandOpen}
        title="Choose brand"
        data={brands}
        loading={loadingBrands}
        onPick={(b) => { setBrandId((b as any).id); setBrandName((b as any).name || ''); setModelId(null); setModelName(null); }}
        onClose={() => setBrandOpen(false)}
      />
      <PickerModal<Model>
        visible={modelOpen}
        title="Choose model"
        data={models}
        loading={loadingModels}
        onPick={(m) => { setModelId((m as any).id); setModelName((m as any).name || ''); }}
        onClose={() => setModelOpen(false)}
      />
      <PickerModal<Agent & { name?: string | null }>
        visible={agentOpen}
        title="Choose agent"
        data={agents as any}
        loading={loadingAgents}
        onPick={(a) => setUserId((a as any).id)}
        onClose={() => setAgentOpen(false)}
      />
      <PickerModal<Terminal>
        visible={termOpen}
        title="Choose terminal"
        data={terms}
        loading={loadingTerms}
        onPick={(t) => setTerminalId((t as any).id)}
        onClose={() => setTermOpen(false)}
      />
      <PickerModal<Dest>
        visible={destOpen}
        title="Choose destination"
        data={dests}
        loading={loadingDests}
        onPick={(d) => setDestination(d.label)}
        onClose={() => setDestOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}
