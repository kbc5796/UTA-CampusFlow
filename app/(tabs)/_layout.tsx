// _layout.tsx — UTA-branded tab navigator with auth gate
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { UTA } from '@/constants/theme';
import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Platform } from 'react-native';
import AuthScreen from '../AuthScreen';

export default function TabLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <AuthScreen onAuthSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: UTA.royalBlue,
        tabBarInactiveTintColor: UTA.gray400,
        tabBarButton: HapticTab,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: UTA.gray100,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 6,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Heat Map',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="flame.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="survey"
        options={{
          title: 'Survey',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}