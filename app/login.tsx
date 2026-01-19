import { useAuth } from "@/contexts/authContext";
import { Link, router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

const Login = () => {
  const emailRef = useRef("");
  const passwordRef = useRef("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login: loginUser, signInWithGoogle } = useAuth();

  const getFriendlyLoginMessage = (errorMsg: string) => {
    // Check for verification error
    if (errorMsg.includes("email-not-verified")) {
      return "Please verify your email address before logging in. Check your inbox.";
    }

    if (errorMsg.includes("user-not-found") || errorMsg.includes("wrong-password") || errorMsg.includes("invalid-credential")) {
      return "Incorrect email or password. Please try again.";
    }
    if (errorMsg.includes("too-many-requests")) {
      return "Too many failed attempts. Please try again later.";
    }
    if (errorMsg.includes("network-request-failed")) {
      return "Network error. Please check your internet connection.";
    }
    return "Login failed. Please check your details.";
  };

  const handleLogin = async () => {
    if (!emailRef.current || !passwordRef.current) {
      Toast.show({
        type: "info",
        text1: "Missing Information",
        text2: "Please enter both your email and password.",
      });
      return;
    }

    setIsLoading(true);
    const res = await loginUser(emailRef.current, passwordRef.current);
    setIsLoading(false);

    if (!res.success) {
      Toast.show({
        type: "error",
        // Custom title for verification error
        text1: res.msg === "email-not-verified" ? "Verification Required" : "Access Denied",
        text2: getFriendlyLoginMessage(res.msg),
      });
    } else {
      router.replace("/tabs/home");
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const res = await signInWithGoogle();
    setIsLoading(false);
    
    if (!res.success) {
      Toast.show({
        type: "error",
        text1: "Google Sign-In",
        text2: "We couldn't sign you in with Google. Please try again.",
      });
    }
  };

  return (
    <View className="flex-1 bg-light-100 px-6 py-12">
      <Text className="text-3xl font-extrabold text-dark-100 text-center mt-10 mb-4">
        Welcome Back
      </Text>
      <Text className="text-lg text-dark-200 text-center mb-8 opacity-80">
        Sign in to continue managing your finances
      </Text>

      {/* Email */}
      <Text className="font-bold text-dark-100 mb-2">Email</Text>
      <TextInput
        onChangeText={(text) => (emailRef.current = text)}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!isLoading}
        className="bg-white p-4 rounded-lg shadow-lg mb-4 text-dark-100"
      />

      {/* Password */}
      <Text className="font-bold text-dark-100 mb-2">Password</Text>
      <View className="flex-row items-center bg-white rounded-lg shadow-lg mb-2">
        <TextInput
          onChangeText={(text) => (passwordRef.current = text)}
          placeholder="Enter your password"
          secureTextEntry={!showPassword}
          editable={!isLoading}
          className="flex-1 p-4 text-dark-100"
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          className="pr-4"
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>

      {/* Forgot Password Link */}
      <TouchableOpacity onPress={() => router.push("/forgotPassword")} className="mb-6">
        <Text className="text-primary font-semibold text-right">
          Forgot password?
        </Text>
      </TouchableOpacity>

      {/* Login Button */}
      <TouchableOpacity
        onPress={handleLogin}
        disabled={isLoading}
        className={`${
          isLoading ? "bg-gray-400" : "bg-primary"
        } py-3 px-6 rounded-lg shadow-lg mb-6`}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-center text-lg font-semibold">
            Sign In
          </Text>
        )}
      </TouchableOpacity>

      {/* Divider */}
      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-px bg-gray-300" />
        <Text className="mx-3 text-gray-500">Or continue with</Text>
        <View className="flex-1 h-px bg-gray-300" />
      </View>

      {/* Google Sign-In Button */}
      <TouchableOpacity
        onPress={handleGoogleLogin}
        disabled={isLoading}
        className="flex-row items-center justify-center bg-white border-2 border-gray-200 py-3 px-6 rounded-lg shadow-lg mb-6"
      >
        <Ionicons name="logo-google" size={20} color="#4285F4" />
        <Text className="text-dark-100 text-center text-lg font-semibold ml-2">
          Google
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