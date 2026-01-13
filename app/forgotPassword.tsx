import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/authContext";

const ForgotPassword = () => {
  const emailRef = useRef("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { forgotPassword } = useAuth();

  const handlePasswordReset = async () => {
    if (!emailRef.current) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailRef.current)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    const res = await forgotPassword(emailRef.current);

    if (res.success) {
      setEmailSent(true);
      Alert.alert(
        "Success",
        "Password reset link has been sent to your email. Check your inbox and follow the instructions."
      );
    } else {
      Alert.alert("Error", res.msg);
    }
    setIsLoading(false);
  };

  const handleBackToLogin = () => {
    router.back();
  };

  if (emailSent) {
    return (
      <View className="flex-1 bg-light-100 px-6 py-12">
        <TouchableOpacity
          onPress={handleBackToLogin}
          className="flex-row items-center mb-8 mt-4"
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
          <Text className="text-lg font-semibold text-dark-100 ml-2">
            Back
          </Text>
        </TouchableOpacity>

        <View className="flex-1 items-center justify-center">
          <View className="bg-green-100 p-4 rounded-full mb-6">
            <Ionicons name="checkmark-circle" size={60} color="#10B981" />
          </View>

          <Text className="text-2xl font-extrabold text-dark-100 text-center mb-3">
            Check Your Email
          </Text>

          <Text className="text-lg text-dark-200 text-center mb-6 opacity-80">
            We've sent a password reset link to{"\n"}
            <Text className="font-semibold">{emailRef.current}</Text>
          </Text>

          <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 w-full">
            <Text className="text-sm text-blue-800 mb-2">
              <Text className="font-semibold">What happens next:</Text>
            </Text>
            <Text className="text-sm text-blue-800 mb-1">
              1. Click the link in the email
            </Text>
            <Text className="text-sm text-blue-800 mb-1">
              2. Follow the instructions to reset your password
            </Text>
            <Text className="text-sm text-blue-800">
              3. Return to login with your new password
            </Text>
          </View>

          <Text className="text-dark-200 text-center mb-6 opacity-80">
            The link expires in 1 hour
          </Text>

          <TouchableOpacity
            onPress={handleBackToLogin}
            className="bg-primary py-3 px-8 rounded-lg shadow-lg w-full"
          >
            <Text className="text-white text-center text-lg font-semibold">
              Back to Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setEmailSent(false)}
            className="mt-4 py-2"
          >
            <Text className="text-primary font-semibold text-center">
              Didn't receive the email? Try again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-100 px-6 py-12">
      {/* Back Button */}
      <TouchableOpacity
        onPress={handleBackToLogin}
        className="flex-row items-center mb-8 mt-4"
      >
        <Ionicons name="chevron-back" size={24} color="#111827" />
        <Text className="text-lg font-semibold text-dark-100 ml-2">Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <Text className="text-3xl font-extrabold text-dark-100 text-center mb-3">
        Reset Password
      </Text>
      <Text className="text-lg text-dark-200 text-center mb-8 opacity-80">
        Enter your email address and we'll send you a link to reset your
        password
      </Text>

      {/* Email Input */}
      <Text className="font-bold text-dark-100 mb-2">Email Address</Text>
      <TextInput
        onChangeText={(text) => (emailRef.current = text)}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!isLoading}
        className="bg-white p-4 rounded-lg shadow-lg mb-6 text-dark-100"
      />

      {/* Info Box */}
      <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <View className="flex-row items-center mb-2">
          <Ionicons name="information-circle" size={18} color="#0284C7" />
          <Text className="text-blue-800 font-semibold ml-2">Note:</Text>
        </View>
        <Text className="text-sm text-blue-800">
          You'll receive an email with a secure link to reset your password.
          The link will expire in 1 hour.
        </Text>
      </View>

      {/* Reset Button */}
      <TouchableOpacity
        onPress={handlePasswordReset}
        disabled={isLoading}
        className={`${
          isLoading ? "bg-gray-400" : "bg-primary"
        } py-3 px-6 rounded-lg shadow-lg mb-4`}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-center text-lg font-semibold">
            Send Reset Link
          </Text>
        )}
      </TouchableOpacity>

      {/* Help Text */}
      <Text className="text-center text-dark-200 opacity-80 text-sm">
        Remember your password?{" "}
        <TouchableOpacity onPress={handleBackToLogin}>
          <Text className="text-primary font-semibold">Sign in</Text>
        </TouchableOpacity>
      </Text>
    </View>
  );
};

export default ForgotPassword;