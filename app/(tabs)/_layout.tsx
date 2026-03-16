// _layout.tsx — tab navigator with auth gate
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { UTA } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Tabs } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { auth } from '../../firebase/firebase';
import AuthScreen from '../AuthScreen';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Listen to Firebase auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return unsubscribe;
  }, []);

  // Wait for Firebase to tell us the user status
  if (isLoggedIn === null) return null;

  // Show AuthScreen if not logged in
  if (!isLoggedIn) return <AuthScreen onAuthSuccess={() => setIsLoggedIn(true)} />;

  // Logged-in user sees tabs
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
      {/* Visible tabs */}
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

      {/* Hidden screen */}
      <Tabs.Screen
        name="bus-tracker"
        options={{
          title: 'Bus Tracker',
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}