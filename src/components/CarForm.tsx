// src/components/CarForm.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator
} from 'react-native';
import type { Car, CarSavePayload, Brand, Model, Agent, Terminal } from '../types';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Props = {
  initial?: Partial<Car>;
  onCancel: () => void;
  onSubmit: (payload: CarSavePayload) => void | Promise<void>;
  loading?: boolean;
};

const STATUS_OPTIONS = ['LOADED', 'WAREHOUSE', 'SHIPPED', 'ON HOLD'] as const;
const AUCTION_OPTIONS = ['COPART', 'IAAI', 'MANHEIM'] as const;

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

// Helper to normalize mojibake text (e.g., UTF-8 misencoded as Latin-1)
const normalizeText = (s?: string | null) => {
  if (!s) return '';
  // Heuristic: only convert if we see common mojibake markers
  return /[ÃÂâ€]/.test(s) ? decodeURIComponent(escape(s)) : s;
};

function PickerModal<T extends { id: string; name?: string | null; username?: string | null }>(
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
            renderItem={({ item }) => (
              <Pressable onPress={() => { onPick(item); onClose(); }} style={{ padding: 16 }}>
                <Text style={{ fontSize: 16 }}>
                  {normalizeText((item as any).name ?? (item as any).username ?? '')}
                </Text>
              </Pressable>
            )}
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

  // ---- state (vehicle)
  const [makingYear, setYear] = useState(String(initial?.makingYear ?? initial?.year ?? ''));
  const [vin, setVin] = useState(initial?.vin ?? '');
  const [brandId, setBrandId] = useState<string | null>((initial as any)?.brandId ?? null);
  const [brandName, setBrandName] = useState<string | null>(initial?.make ?? null);
  const [modelid, setModelId] = useState<string | null>((initial as any)?.modelid ?? null);
  const [modelName, setModelName] = useState<string | null>(initial?.model ?? null);
  const [color, setColor] = useState((initial as any)?.color ?? '');
  const [lot, setLot] = useState((initial as any)?.lot ?? '');
  const [carKey, setCarKey] = useState<0 | 1>((initial as any)?.carKey ?? 0);
  const [title, setTitle] = useState<0 | 1>(
    typeof initial?.title === 'number' ? (initial?.title as 0 | 1) : (initial?.title ? 1 : 0)
  );
  const [issueDate, setIssueDate] = useState((initial as any)?.issueDate ?? '');

  // ---- assignment
  const [userid, setUserId] = useState((initial as any)?.userid ?? initial?.agent_id ?? '');
  const [terminalid, setTerminalId] = useState((initial as any)?.terminalid ?? '');

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

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingTerms, setLoadingTerms] = useState(false);

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
      const rows = (r.data as any[]).map((a) => ({
        id: String((a as any).id),
        name: normalizeText((a as any).name ?? (a as any).username ?? ''),
        username: (a as any).username ?? null,
      }));
      setAgents(rows as any);
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
      const rows = (r.data as any[]).map((m) => ({
        ...m,
        // unify possible keys from API: brandId / brandid / brand_id
        brandId: (m as any).brandId ?? (m as any).brandid ?? (m as any).brand_id ?? null,
      }));
      const filtered = rows.filter((m: any) => m.brandId === brand);
      setModels(filtered as any);
    } catch (e: any) {
      console.log('models load error', e?.response?.status, e?.response?.data || e?.message);
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  }

  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);

  useEffect(() => {
    // optional: warm caches in background
    fetchBrands();
    fetchAgents();
    fetchTerms();
  }, []);

  useEffect(() => {
    if (!brandId) { setModels([]); return; }
    fetchModelsFor(brandId);
  }, [brandId]);

  function save() {
    const payload: CarSavePayload = {
      id,
      // vehicle
      makingYear: makingYear ? Number(makingYear) : null,
      vin: vin || null,
      brandId: brandId ?? null,
      modelid: modelid ?? null,
      color: color || null,
      lot: lot || null,
      carKey: carKey ?? 0,
      title: title ?? 0,
      issueDate: issueDate || null,

      // assignment
      userid: userid || null,
      terminalid: terminalid || null,

      // logistics
      auctionType: auctionType ?? null,
      destination: destination || null,
      status: status || null,
      eta: eta || null,
      containerNumber: containerNumber || null,

      note: note || null,
    };
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
                {normalizeText(
                  agents.find(a => a.id === userid)?.name ??
                  agents.find(a => a.id === userid)?.username ??
                  (userid ? userid : 'Choose agent')
                )}
              </Text>
            </Pressable>
          </View>
          <View style={{ padding: 12 }}>
            <Label>Terminal</Label>
            <Pressable onPress={() => { setTermOpen(true); fetchTerms(); }} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 16 }}>
                {terms.find(t => t.id === terminalid)?.name || (terminalid ? terminalid : 'Choose terminal')}
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
            <Input value={destination} onChangeText={setDestination} placeholder="e.g. Um-Casr" />
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
        <Pressable disabled={loading} onPress={save} style={{ flex: 1, backgroundColor: '#2e6dd8', opacity: loading ? 0.6 : 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{loading ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>

      {/* pickers */}
      <PickerModal<Brand>
        visible={brandOpen}
        title="Choose brand"
        data={brands}
        loading={loadingBrands}
        onPick={(b) => { setBrandId(b.id); setBrandName(b.name || ''); setModelId(null); setModelName(null); }}
        onClose={() => setBrandOpen(false)}
      />
      <PickerModal<Model>
        visible={modelOpen}
        title="Choose model"
        data={models}
        loading={loadingModels}
        onPick={(m) => { setModelId(m.id); setModelName(m.name || ''); }}
        onClose={() => setModelOpen(false)}
      />
      <PickerModal<Agent>
        visible={agentOpen}
        title="Choose agent"
        data={agents}
        loading={loadingAgents}
        onPick={(a) => setUserId(a.id)}
        onClose={() => setAgentOpen(false)}
      />
      <PickerModal<Terminal>
        visible={termOpen}
        title="Choose terminal"
        data={terms}
        loading={loadingTerms}
        onPick={(t) => setTerminalId(t.id)}
        onClose={() => setTermOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}
