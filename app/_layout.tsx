import { Stack } from "expo-router";
import './globals.css';

// handle whole section
export default function RootLayout() {
  return <Stack>
      <Stack.Screen
        name="tabs"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="register"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="login"
        options={{ headerShown: false }}
      />
  </Stack>
}
