import React from 'react';
import { SafeAreaView } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigation from './src/navigation';

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <RootNavigation />
      </SafeAreaView>
    </AuthProvider>
  );
}
