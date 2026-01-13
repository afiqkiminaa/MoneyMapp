import { Stack, useRouter, useSegments } from "expo-router";
import './globals.css';
import { AuthProvider, useAuth } from "@/contexts/authContext";
import React, { useEffect } from "react";
import Toast from 'react-native-toast-message';
import { View, Text, ActivityIndicator } from "react-native"; 

const RootLayoutNav = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0] === 'tabs';

    if (user && !inTabsGroup) {
      router.replace("/tabs/home");
    } else if (!user) {
      // User is not logged in; navigating to auth screens handles itself
    }
  }, [user, isLoading]);

  // This covers the "split second" load time without using error-prone native modules.
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        {/*  replace this Text with  Logo Image */}
        {/* <Image source={require("../assets/images/logo.png")} className="w-32 h-32" resizeMode="contain" /> */}
        
        <Text className="text-4xl font-extrabold text-violet-600 tracking-tighter">
          MoneyMap
        </Text>
        <ActivityIndicator size="small" color="#7c3aed" className="mt-4" />
      </View>
    );
  }

  // Conditional rendering based on auth state
  if (!user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgotPassword" />
      </Stack>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="tabs" />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
      <Toast />
    </AuthProvider>
  );
}