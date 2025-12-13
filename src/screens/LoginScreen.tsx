import React, { useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

const BG = '#0f172a';
const PRIMARY = '#FA812F';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pwRef = useRef<TextInput>(null);

  async function onSubmit() {
    if (!username.trim() || !password) {
      setErr('Please enter your username and password.');
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const res = await createClient().post('/login.php', { username, password });
      // Normalize role from legacy `type` so navigation can rely on `user.role`
      const u = res?.data?.user ?? {};
      login(res.data.token, { ...u, role: u?.role ?? u?.type ?? null });
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Check your credentials';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 }}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>Welcome back</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              To Shafak Al-Khaleej
            </Text>
          </View>

          {/* Sheet / Card */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
            }}
          >
            {/* Brand badge */}
            <View style={{ alignItems: 'center', marginTop: -52, marginBottom: 16 }}>
              <View
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  backgroundColor: PRIMARY,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>S</Text>
              </View>
            </View>

            {/* Error */}
            {err ? (
              <View
                style={{
                  backgroundColor: '#fef2f2',
                  borderColor: '#fecaca',
                  borderWidth: 1,
                  padding: 12,
                  borderRadius: 12,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: '#b91c1c' }}>{err}</Text>
              </View>
            ) : null}

            {/* Username */}
            <Text style={{ color: MUTED, fontWeight: '700', fontSize: 12 }}>USERNAME</Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: BORDER,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginTop: 6,
                marginBottom: 14,
              }}
            >
              <TextInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                style={{ fontSize: 16 }}
                returnKeyType="next"
                textContentType="username"
                autoComplete="username"
              />
            </View>

            {/* Password */}
            <Text style={{ color: MUTED, fontWeight: '700', fontSize: 12 }}>PASSWORD</Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: BORDER,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginTop: 6,
              }}
            >
              <TextInput
                key={showPw ? 'pw-visible' : 'pw-hidden'}
                ref={pwRef}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                autoComplete="password"
                importantForAutofill="yes"
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                style={{ fontSize: 16 }}
                returnKeyType="done"
                onSubmitEditing={onSubmit}
              />
            </View>
            <Pressable
              onPress={() => { setShowPw((s) => !s); setTimeout(() => pwRef.current?.focus(), 0); }}
              hitSlop={10}
              style={{ alignSelf: 'flex-end', marginTop: 8 }}
            >
              <Text style={{ color: PRIMARY, fontWeight: '700' }}>
                {showPw ? 'Hide' : 'Show'} password
              </Text>
            </Pressable>

            {/* Sign in button */}
            <Pressable
              onPress={onSubmit}
              disabled={loading}
              style={{
                marginTop: 24,
                backgroundColor: PRIMARY,
                opacity: loading ? 0.6 : 1,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </Text>
            </Pressable>

            {/* Footer */}
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Pressable onPress={() => setErr('If you forgot your password, contact admin.')}>
                <Text style={{ color: MUTED }}>Forgot password?</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
