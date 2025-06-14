import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';  // Import Link from expo-router

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');

  return (
    <View className="flex-1 bg-light-100 justify-center px-6 py-12">
      <Text className="text-3xl font-extrabold text-dark-100 text-center mb-4">
        Create Your Account
      </Text>
      <Text className="text-lg text-dark-200 text-center mb-6 opacity-80">
        Start tracking your expenses
      </Text>

      {/* Full Name Label and Input */}
      <Text className="font-bold text-dark-100 mb-2">Full Name</Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Enter your full name"
        className="bg-white p-4 rounded-lg shadow-lg mb-4 text-dark-100"
      />

      {/* Email Label and Input */}
      <Text className="font-bold text-dark-100 mb-2">Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        keyboardType="email-address"
        className="bg-white p-4 rounded-lg shadow-lg mb-4 text-dark-100"
      />

      {/* Password Label and Input */}
      <Text className="font-bold text-dark-100 mb-2">Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Create a password"
        secureTextEntry
        className="bg-white p-4 rounded-lg shadow-lg mb-4 text-dark-100"
      />

      {/* Role Selection */}
      <View className="flex-row justify-between mb-6">
        <TouchableOpacity
          onPress={() => setRole('student')}
          className={`py-2 px-4 rounded-lg border-2 border-primary ${role === 'student' ? 'bg-primary text-white' : 'text-primary'}`}
        >
          <Text className="text-lg">Student</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setRole('professional')}
          className={`py-2 px-4 rounded-lg border-2 border-primary ${role === 'professional' ? 'bg-primary text-white' : 'text-primary'}`}
        >
          <Text className="text-lg">Professional</Text>
        </TouchableOpacity>
      </View>

      {/* Create Account Button */}
      <TouchableOpacity className="bg-primary py-3 px-6 rounded-lg shadow-lg mb-6">
        <Text className="text-white text-center text-lg font-semibold">Create Account</Text>
      </TouchableOpacity>

      {/* Sign In Link */}
      <View className="flex-row justify-center">
        <Text className="text-dark-100">Already have an account? </Text>
        <Link
          href="/login"  // Link to the Login page (path will be based on your project structure)
        >
          <Text className="text-primary font-semibold">Sign in</Text>
        </Link>
      </View>
    </View>
  );
};

export default Register;
