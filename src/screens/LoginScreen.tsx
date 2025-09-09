import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      const res = await createClient().post('/login.php', { username, password });
      login(res.data.token, res.data.user);
    } catch (e: any) {
      console.log(e?.response?.data || e?.message);
      Alert.alert('Login failed', e?.response?.data?.error ?? 'Check your credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Welcome</Text>
      <Text>Username</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}
      />
      <Text>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}
      />
      <Button title={loading ? 'Signing in…' : 'Sign In'} onPress={onSubmit} disabled={loading} />
    </View>
  );
}
