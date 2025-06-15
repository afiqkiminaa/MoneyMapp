import { Text, View } from "react-native";
import React from 'react'
import { useAuth } from "@/contexts/authContext";

export default function Index() {
  const { user } = useAuth();
  console.log("user: ", user);
  return (
    <View className="flex-1 justify-center items-center">
      <Text className="text-5xl text-accent font-bold">Welcome to MoneyMap!</Text>
    </View>
  );
}
