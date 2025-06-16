import { Stack } from "expo-router";
import './globals.css';
import { AuthProvider } from "@/contexts/authContext";
import React from "react";
import Toast from 'react-native-toast-message'; 

const StackLayout = () => {
  return <Stack screenOptions={{ headerShown: false }} />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <StackLayout />
      <Toast /> 
    </AuthProvider>
  );
}
