import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Picker } from '@react-native-picker/picker';

export default function AdminSendNotificationScreen() {
  const { token } = useAuth();
  const client = createClient(token);

  const [audience, setAudience] = useState<'ALL' | 'AGENT'>('ALL');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await client.get('/agents.php');
        setAgents(Array.isArray(res.data) ? res.data : []);
      } catch {
        setAgents([]);
      }
    }
    loadAgents();
  }, []);

  async function send() {
    if (!title || !body) {
      Alert.alert('Missing data', 'Title and message are required');
      return;
    }

    if (audience === 'AGENT' && !agentId) {
      Alert.alert('Missing agent', 'Please select an agent');
      return;
    }

    setSending(true);
    try {
      await client.post('/notifications_send.php', {
        audience,
        agentId: audience === 'AGENT' ? agentId : null,
        title,
        body,
      });

      Alert.alert('Sent ✅', 'Notification sent successfully');
      setTitle('');
      setBody('');
      setAgentId(null);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send Notification</Text>

      <View style={styles.row}>
        <Pressable
          style={[styles.chip, audience === 'ALL' && styles.active]}
          onPress={() => setAudience('ALL')}
        >
          <Text>All Users</Text>
        </Pressable>

        <Pressable
          style={[styles.chip, audience === 'AGENT' && styles.active]}
          onPress={() => setAudience('AGENT')}
        >
          <Text>Specific Agent</Text>
        </Pressable>
      </View>

      {audience === 'AGENT' && (
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={agentId}
            onValueChange={(v) => setAgentId(v)}
          >
            <Picker.Item label="Select agent…" value={null} />
            {agents.map((a) => (
              <Picker.Item key={a.id} label={a.name} value={a.id} />
            ))}
          </Picker>
        </View>
      )}

      <TextInput
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      <TextInput
        placeholder="Message"
        value={body}
        onChangeText={setBody}
        multiline
        style={[styles.input, { height: 100 }]}
      />

      <Pressable style={styles.send} onPress={send} disabled={sending}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          {sending ? 'Sending…' : 'Send'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  chip: {
    padding: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  active: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  send: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
});
