import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useUnreadNotifications } from '../hooks/useUnreadNotifications';

import CarsHomeScreen from '../screens/CarsHomeScreen';
import AdminCarsScreen from '../screens/AdminCarsScreen';
import AgentCarsScreen from '../screens/AgentCarsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import UserSettingsScreen from '../screens/UserSettingsScreen';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN' || role === 'SUPER';
  const { count: unreadCount } = useUnreadNotifications();
console.log('🔔 unreadCount:', unreadCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FA812F',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case 'Home':
              return <Ionicons name="grid-outline" size={size} color={color} />;
            case 'Cars':
              return <MaterialCommunityIcons name="car-multiple" size={size} color={color} />;
            case 'Notifications':
              return <Ionicons name="notifications-outline" size={size} color={color} />;
            case 'Settings':
              return <Ionicons name="settings-outline" size={size} color={color} />;
            default:
              return null;
          }
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={CarsHomeScreen}
        options={{ title: 'Home' }}
      />

      <Tab.Screen
        name="Cars"
        component={isAdmin ? AdminCarsScreen : AgentCarsScreen}
        options={{ title: 'All Cars' }}
      />

      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '700',
          },
        }}
      />

      <Tab.Screen
        name="Settings"
        component={UserSettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}
