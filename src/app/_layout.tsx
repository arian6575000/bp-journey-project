import React from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { migrateDatabase } from '../database/db';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="bp-journey.db" onInit={migrateDatabase}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
