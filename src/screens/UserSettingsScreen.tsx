import React from 'react';
import { View, Text, Pressable, SafeAreaView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const THEME = {
  bg: '#F7F8FA',
  card: '#FFFFFF',
  text: '#1F2937',
  subText: '#6B7280',
  accent: '#FA812F',
  border: '#E5E7EB',
};

export default function UserSettingsScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="person-circle-outline" size={64} color={THEME.accent} />

        <Text style={styles.name}>
          {user?.name || user?.username || 'User'}
        </Text>

        <Text style={styles.role}>
          Role: {String(user?.role || 'USER').toUpperCase()}
        </Text>
      </View>

      <View style={styles.section}>
        <Pressable style={styles.button} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    padding: 16,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 12,
  },
  role: {
    fontSize: 14,
    color: THEME.subText,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  button: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: THEME.accent,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
