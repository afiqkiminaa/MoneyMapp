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

const Register = () => {
  const emailRef = useRef("");
  const passwordRef = useRef("");
  const nameRef = useRef("");
  const confirmPasswordRef = useRef("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register: registerUser, signInWithGoogle } = useAuth();

  const getFriendlyErrorMessage = (errorMsg: string) => {
    if (errorMsg.includes("email-already-in-use")) {
      return "This email is already registered. Try logging in instead.";
    }
    if (errorMsg.includes("invalid-email")) {
      return "Please enter a valid email address.";
    }
    if (errorMsg.includes("weak-password")) {
      return "Your password is too weak. Please try a stronger one.";
    }
    if (errorMsg.includes("network-request-failed")) {
      return "Network error. Please check your internet connection.";
    }
    return "Something went wrong. Please try again later.";
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number";
    return null;
  };

  const handleSubmit = async () => {
    if (!emailRef.current || !passwordRef.current || !nameRef.current) {
      Toast.show({
        type: "info",
        text1: "Missing Information",
        text2: "Please fill in all fields to create your account.",
      });
      return;
    }

    if (passwordRef.current !== confirmPasswordRef.current) {
      Toast.show({
        type: "error",
        text1: "Passwords don't match",
        text2: "Please double-check your password confirmation.",
      });
      return;
    }

    const passwordError = validatePassword(passwordRef.current);
    if (passwordError) {
      Toast.show({
        type: "error",
        text1: "Weak Password",
        text2: passwordError,
      });
      return;
    }

    setIsLoading(true);
    const res = await registerUser(
      emailRef.current,
      passwordRef.current,
      nameRef.current
    );

    setIsLoading(false);

    if (!res.success) {
      Toast.show({
        type: "error",
        text1: "Sign Up Failed",
        text2: getFriendlyErrorMessage(res.msg),
      });
    } else {
      // success handling for verification
      Toast.show({
        type: "success",
        text1: "Verification Sent!",
        text2: "Please check your email to verify your account before logging in.",
        visibilityTime: 6000, // Show longer so they can read it
      });
      router.replace("/login");
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    const res = await signInWithGoogle();
    setIsLoading(false);
    
    if (!res.success) {
      Toast.show({
        type: "error",
        text1: "Google Sign-Up Failed",
        text2: "We couldn't connect to Google. Please try again.",
      });
    } else {
      router.replace("/login");
    }
  };

  return (
    <View className="flex-1 bg-light-100 px-6 py-12">
      <Text className="text-3xl font-extrabold text-dark-100 text-center mt-10 mb-4">
        Create Your Account
      </Text>
      <Text className="text-lg text-dark-200 text-center mb-8 opacity-80">
        Start tracking your expenses
      </Text>

      {/* UserName */}
      <Text className="font-bold text-dark-100 mb-2">UserName</Text>
      <TextInput
        onChangeText={(text) => (nameRef.current = text)}
        placeholder="Enter your username"
        editable={!isLoading}
        className="bg-white p-4 rounded-lg shadow-lg mb-4 text-dark-100"
      />

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
      <View className="flex-row items-center bg-white rounded-lg shadow-lg mb-4">
        <TextInput
          onChangeText={(text) => (passwordRef.current = text)}
          placeholder="Create a password (8+ characters)"
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

      {/* Confirm Password */}
      <Text className="font-bold text-dark-100 mb-2">Confirm Password</Text>
      <View className="flex-row items-center bg-white rounded-lg shadow-lg mb-4">
        <TextInput
          onChangeText={(text) => (confirmPasswordRef.current = text)}
          placeholder="Confirm your password"
          secureTextEntry={!showConfirmPassword}
          editable={!isLoading}
          className="flex-1 p-4 text-dark-100"
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          className="pr-4"
        >
          <Ionicons
            name={showConfirmPassword ? "eye-off" : "eye"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>

      {/* Password Requirements Info */}
      <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
        <Text className="text-xs text-blue-800">
          Password must contain: at least 8 characters, 1 uppercase letter, and 1 number
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isLoading}
        className={`${
          isLoading ? "bg-gray-400" : "bg-primary"
        } py-3 px-6 rounded-lg shadow-lg mb-4`}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-center text-lg font-semibold">
            Create Account
          </Text>
        )}
      </TouchableOpacity>

      {/* Divider */}
      <View className="flex-row items-center mb-4">
        <View className="flex-1 h-px bg-gray-300" />
        <Text className="mx-3 text-gray-500">Or sign up with</Text>
        <View className="flex-1 h-px bg-gray-300" />
      </View>

      {/* Google Sign-Up Button */}
      <TouchableOpacity
        onPress={handleGoogleSignUp}
        disabled={isLoading}
        className="flex-row items-center justify-center bg-white border-2 border-gray-200 py-3 px-6 rounded-lg shadow-lg mb-6"
      >
        <Ionicons name="logo-google" size={20} color="#4285F4" />
        <Text className="text-dark-100 text-center text-lg font-semibold ml-2">
          Google
        </Text>
      </TouchableOpacity>

      {/* Sign In Link */}
      <View className="flex-row justify-center">
        <Text className="text-dark-100">Already have an account? </Text>
        <Link href="/login">
          <Text className="text-primary font-semibold">Sign in</Text>
        </Link>
      </View>
    </View>
  );
};

export default Register;