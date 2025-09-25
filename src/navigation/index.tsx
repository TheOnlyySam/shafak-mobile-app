import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import AdminCarsScreen from '../screens/AdminCarsScreen';
import AgentCarsScreen from '../screens/AgentCarsScreen';
import { useAuth } from '../context/AuthContext';

type RootStackParamList = {
  Login: undefined;
  AdminCars: undefined;
  AgentCars: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigation() {
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN' || role === 'SUPER';

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign In' }} />
        ) : isAdmin ? (
          <Stack.Screen name="AdminCars" component={AdminCarsScreen} options={{ title: 'All Cars (Admin)' }} />
        ) : (
          <Stack.Screen name="AgentCars" component={AgentCarsScreen} options={{ title: 'My Cars' }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
