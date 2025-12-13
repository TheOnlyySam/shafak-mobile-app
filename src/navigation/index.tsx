import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import AdminCarsScreen from '../screens/AdminCarsScreen';
import AgentCarsScreen from '../screens/AgentCarsScreen';
import AppTabs from './AppTabs';
import AdminSendNotificationScreen from '../screens/AdminSendNotificationScreen';

import { useAuth } from '../context/AuthContext';

type RootStackParamList = {
  Login: undefined;
  CarsHome: undefined;
  AdminCars: undefined;
  AgentCars: undefined;
  SendNotification: undefined;
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
          // 🔐 Login
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Sign In' }}
          />
        ) : (
          <>
            {/* 🚗 Main Cars Navigation (tabs screen) */}
            <Stack.Screen
              name="CarsHome"
              component={AppTabs}
              options={{ headerShown: false }}
            />

            {/* 🔧 Keep old screens available (optional navigation) */}
            {isAdmin ? (
              <Stack.Screen
                name="AdminCars"
                component={AdminCarsScreen}
                options={{ title: 'All Cars (Admin)' }}
              />
            ) : (
              <Stack.Screen
                name="AgentCars"
                component={AgentCarsScreen}
                options={{ title: 'My Cars' }}
              />
            )}
            {isAdmin && (
              <Stack.Screen
                name="SendNotification"
                component={AdminSendNotificationScreen}
                options={{ title: 'Send Notification' }}
              />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
