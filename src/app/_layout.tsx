import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/contexts/AuthContext';
import { BookingProvider } from '@/contexts/BookingContext';
import { OwnerConfigProvider } from '@/contexts/OwnerConfigContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <OwnerConfigProvider>
          <BookingProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </BookingProvider>
        </OwnerConfigProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
