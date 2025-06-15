import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { useAuth } from '@/contexts/authContext';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';

const Profile = () => {
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <View className="flex-1 bg-light-100 justify-center items-center px-6">
      <Text className="text-4xl font-extrabold text-dark-100 mb-2">
        Profile Page
      </Text>

      <Text className="text-lg text-dark-200 mb-1">
        Welcome,
      </Text>
      <Text className="text-2xl font-bold text-primary mb-6">
        {user?.name || user?.email}
      </Text>

      <TouchableOpacity
        onPress={handleLogout}
        className="bg-red-500 py-3 px-6 rounded-lg shadow-lg"
      >
        <Text className="text-white text-lg font-semibold">Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Profile;
