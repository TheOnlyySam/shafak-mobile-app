import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Car } from '../types';

type RootStackParamList = {
  CarEdit: { car?: Car } | undefined;
};

type ListItem = { id: string; label: string };

export default function CarEditScreen() {
  const { token } = useAuth();
  const client = createClient(token);
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'CarEdit'>>();
  const editing = route.params?.car;

  const [loading, setLoading] = useState(false);
  const [listsLoading, setListsLoading] = useState(true);

  // form state
  const [makingYear, setYear] = useState(String(editing?.year ?? ''));
  const [vin, setVin] = useState(editing?.vin ?? '');
  const [modelId, setModelId] = useState<string>(editing?.modelid as any ?? '');
  const [destination, setDestination] = useState(editing?.destination ?? '');
  const [status, setStatus] = useState(editing?.status ?? '');
  const [eta, setEta] = useState(editing?.eta ?? ''); // YYYY-MM-DD
  const [containerNumber, setContainer] = useState(editing?.containerNumber ?? '');
  const [title, setTitle] = useState((editing?.title ? '1' : '0') as any);
  const [agentId, setAgentId] = useState<string>((editing?.agent_id as any) ?? '');
  const [terminalId, setTerminalId] = useState<string>((editing?.terminalid as any) ?? '');
  const [note, setNote] = useState((editing as any)?.note ?? '');

  // pick lists
  const [agents, setAgents] = useState<ListItem[]>([]);
  const [models, setModels] = useState<ListItem[]>([]);
  const [terminals, setTerminals] = useState<ListItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [a, m, t] = await Promise.all([
          client.get('/agents.php'),
          client.get('/models.php'),
          client.get('/terminals.php'),
        ]);
        setAgents(a.data?.map((r: any) => ({ id: r.id, label: r.username })) ?? []);
        setModels(m.data?.map((r: any) => ({ id: r.id, label: r.name })) ?? []);
        setTerminals(t.data?.map((r: any) => ({ id: r.id, label: [r.state, r.stateCode].filter(Boolean).join(' / ') })) ?? []);
      } catch (e) {
        // lists are optional; form still usable with raw IDs
      } finally {
        setListsLoading(false);
      }
    })();
  }, []);

  async function save() {
    setLoading(true);
    try {
      const payload: any = {
        id: editing?.id,
        makingYear: makingYear ? Number(makingYear) : null,
        vin,
        modelid: modelId || null,
        destination,
        status,
        eta,
        containerNumber,
        title: title === '1' ? 1 : 0,
        userid: agentId || null,
        terminalid: terminalId || null,
        note,
      };
      const res = await client.post('/car_save.php', payload);
      if (res.data?.ok) {
        Alert.alert('Saved', 'Car changes were saved.', [{ text: 'OK', onPress: () => nav.goBack() }]);
      } else {
        throw new Error(res.data?.error || 'Save failed');
      }
    } catch (e: any) {
      Alert.alert('Save failed', e?.response?.data?.error || e?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontWeight: '800', fontSize: 18, marginBottom: 12 }}>
        {editing ? 'Edit Car' : 'Add Car'}
      </Text>

      {listsLoading ? <ActivityIndicator /> : null}

      <Field label="Making Year">
        <TextInput value={makingYear} onChangeText={setYear} keyboardType="number-pad" style={ti} />
      </Field>

      <Field label="VIN">
        <TextInput value={vin} onChangeText={setVin} autoCapitalize="characters" style={ti} />
      </Field>

      <Field label="Model ID (picklist optional)">
        <TextInput value={modelId} onChangeText={setModelId} placeholder="e.g. 8ab0e0..." style={ti} />
        {/* If you want a dropdown, swap this TextInput for @react-native-picker/picker */}
      </Field>

      <Field label="Agent (User ID)">
        <TextInput value={agentId} onChangeText={setAgentId} placeholder="user id" style={ti} />
      </Field>

      <Field label="Terminal ID">
        <TextInput value={terminalId} onChangeText={setTerminalId} placeholder="terminal id" style={ti} />
      </Field>

      <Field label="Destination">
        <TextInput value={destination} onChangeText={setDestination} style={ti} />
      </Field>

      <Field label="Status">
        <TextInput value={status} onChangeText={setStatus} placeholder="LOADED / WAREHOUSE ..." style={ti} />
      </Field>

      <Field label="ETA (YYYY-MM-DD)">
        <TextInput value={eta} onChangeText={setEta} placeholder="2025-11-18" style={ti} />
      </Field>

      <Field label="Container #">
        <TextInput value={containerNumber} onChangeText={setContainer} style={ti} />
      </Field>

      <Field label="Title (0/1)">
        <TextInput value={String(title)} onChangeText={setTitle} keyboardType="number-pad" style={ti} />
      </Field>

      <Field label="Note">
        <TextInput value={note} onChangeText={setNote} style={[ti, { height: 90 }]} multiline />
      </Field>

      <Pressable
        onPress={save}
        disabled={loading}
        style={{
          backgroundColor: '#2e6dd8',
          padding: 14,
          borderRadius: 8,
          opacity: loading ? 0.6 : 1,

          // iOS only shadow (very subtle)
          shadowColor: '#000',
          shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0,
          shadowRadius: Platform.OS === 'ios' ? 8 : 0,
          shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 4 } : { width: 0, height: 0 },

          // Android: force no elevation
          elevation: 0,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
          {loading ? 'Saving…' : 'Save'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}
const ti = { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 } as const;
