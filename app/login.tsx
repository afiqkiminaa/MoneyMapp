import { useAuth } from "@/contexts/authContext";
import { Link, router } from "expo-router";
import React, { useRef } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

const Login = () => {
  const emailRef = useRef("");
  const passwordRef = useRef("");

  const { login: loginUser } = useAuth();

  const handleLogin = async () => {
    if (!emailRef.current || !passwordRef.current) {
      Alert.alert("Login", "Please fill in all fields");
      return;
    }

    const res = await loginUser(emailRef.current, passwordRef.current);
    console.log("login result:", res);

    if (!res.success) {
      Alert.alert("Login Failed", res.msg);
    } else {
      Alert.alert("Login Successful", "Redirecting...");
      router.replace("/tabs/home");
    }
  };

  return (
    <View className="flex-1 bg-light-100 justify-center px-6 py-12">
      <Text className="text-3xl font-extrabold text-dark-100 text-center mb-4">
        Welcome Back
      </Text>
      <Text className="text-lg text-dark-200 text-center mb-6 opacity-80">
        Sign in to continue managing your finances
      </Text>

      {/* Email */}
      <Text className="font-bold text-dark-100 mb-2">Email</Text>
      <TextInput
        onChangeText={(text) => (emailRef.current = text)}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        className="bg-white p-4 rounded-lg shadow-lg mb-4 text-dark-100"
      />

      {/* Password */}
      <Text className="font-bold text-dark-100 mb-2">Password</Text>
      <TextInput
        onChangeText={(text) => (passwordRef.current = text)}
        placeholder="Enter your password"
        secureTextEntry
        className="bg-white p-4 rounded-lg shadow-lg mb-4 text-dark-100"
      />

      {/* Login Button */}
      <TouchableOpacity
        onPress={handleLogin}
        className="bg-primary py-3 px-6 rounded-lg shadow-lg mb-6"
      >
        <Text className="text-white text-center text-lg font-semibold">
          Sign In
        </Text>
      </TouchableOpacity>

      {/* Sign Up Link */}
      <View className="flex-row justify-center">
        <Text className="text-dark-100">Don't have an account? </Text>
        <Link href="/register">
          <Text className="text-primary font-semibold">Sign up</Text>
        </Link>
      </View>
    </View>
  );
};

export default Login;
