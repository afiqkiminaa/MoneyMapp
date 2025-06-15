import { Stack } from "expo-router";
import './globals.css';
import { AuthProvider } from "@/contexts/authContext";
import React from "react";

const StackLayout = () => {
  return <Stack screenOptions={{ headerShown: false }}></Stack>;
};

// handle whole section
export default function RootLayout() {
  return (<AuthProvider>
    <StackLayout/>
  </AuthProvider>
  );
}
