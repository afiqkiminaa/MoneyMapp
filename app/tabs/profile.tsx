import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import React from "react";
import { useAuth } from "@/contexts/authContext";
import { signOut } from "firebase/auth";
import { auth } from "@/config/firebase";
import { router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

const Profile = () => {
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
    <View className="bg-white pt-14 px-4 items-center">
      <Text className="text-4xl font-extrabold text-dark-100">Profile</Text>
      <Text className="text-base text-dark-200 mt-1 mb-2">Manage your account</Text>
    </View>


      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View className="px-5 mt-8">
          <View className="bg-light-100 rounded-xl py-5 px-4 shadow-md items-center">
            <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-2">
              <Ionicons name="person-outline" size={32} color="#888" />
            </View>
            <Text className="text-2xl font-semibold text-dark-100">
              {user?.name || "Your Name"}
            </Text>
            <Text className="text-sm text-dark-200 mb-2">
              {user?.email || "example@email.com"}
            </Text>
            <Text className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
              Student
            </Text>
          </View>
        </View>

        {/* Sections */}
        <View className="mt-8 px-5 space-y-6">
          {/* Account */}
          <View>
            <Text className="text-dark-100 font-semibold mb-2">Account</Text>

            <TouchableOpacity
              onPress={() => router.push("/tabs/home")} // Edit user page
              className="flex-row items-center justify-between py-3 border-b border-gray-200"
            >
              <Text className="text-dark-200">Personal Information</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-200">
              <Text className="text-dark-200">Notifications</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-200">
              <Text className="text-dark-200">Security</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Help & Support */}
          <View>
            <Text className="text-dark-100 font-semibold mb-2 mt-4">
              Help & Support
            </Text>
            <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-200">
              <Text className="text-dark-200">Help Center</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Log Out */}
      <View className="mt-8 px-6">
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          className="bg-red-100 border border-red-300 rounded-xl px-5 py-3 flex-row items-center justify-center space-x-2 shadow-md"
        >
          <MaterialIcons name="logout" size={20} color="#b91c1c" />
          <Text className="text-base font-semibold text-red-700">Log Out</Text>
        </TouchableOpacity>
      </View>


        {/* Footer */}
        <View className="mt-6 items-center">
          <Text className="text-xs text-dark-200">MoneyMap App v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default Profile;
