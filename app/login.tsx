import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router'; // Import Link from expo-router

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View className="flex-1 bg-light-100 justify-center px-6 py-12">
      {/* Title */}
      <Text className="text-3xl font-extrabold text-dark-100 text-center mb-4">
        Welcome Back
      </Text>
      <Text className="text-lg text-dark-200 text-center mb-6 opacity-80">
        Log in to continue your financial journey
      </Text>

      {/* Login Form Card */}
      <View className="space-y-4">
        {/* Email Field */}
        <View className="mb-4">
          <Text className="font-bold text-dark-100 mb-2">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-white p-4 rounded-lg shadow-lg text-dark-100"
          />
        </View>

        {/* Password Field */}
        <View className="mb-4">
          <Text className="font-bold text-dark-100 mb-2">Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            className="bg-white p-4 rounded-lg shadow-lg text-dark-100"
          />
        </View>

        {/* Login Button */}
        <TouchableOpacity className="bg-primary py-3 px-6 rounded-lg shadow-lg mb-4">
          <Text className="text-white text-center text-lg font-semibold">Log In</Text>
        </TouchableOpacity>

        {/* Link to Register */}
        <View className="flex-row justify-center mt-2">
          <Text className="text-dark-100">Don't have an account? </Text>
          <Link href="/register">
            <Text className="text-primary font-semibold">Sign up</Text>
          </Link>
        </View>

        {/* Demo Info */}
        <Text className="text-center text-sm mt-4 opacity-70">
          For demo: demo@example.com / password
        </Text>
      </View>
    </View>
  );
};

export default Login;
