import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/contexts/authContext";

export default function SecurityScreen() {
  const [current, setCurrent] = useState("");
  const [next1, setNext1] = useState("");
  const [next2, setNext2] = useState("");

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [show2FAInfo, setShow2FAInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { changePassword } = useAuth();

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleChangePassword = async () => {
    if (!current || !next1 || !next2) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (next1 !== next2) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    if (current === next1) {
      Alert.alert(
        "Error",
        "New password must be different from current password"
      );
      return;
    }

    const passwordError = validatePassword(next1);
    if (passwordError) {
      Alert.alert("Password Requirement", passwordError);
      return;
    }

    setIsLoading(true);
    const res = await changePassword(current, next1);

    if (res.success) {
      Alert.alert("Success", "Password changed successfully");
      setCurrent("");
      setNext1("");
      setNext2("");
      setIsLoading(false);
    } else {
      Alert.alert("Error", res.msg);
      setIsLoading(false);
    }
  };

  const handleToggle2FA = () => {
    if (!twoFA) {
      Alert.alert(
        "Enable 2FA",
        "This feature will be set up in the next update. For now, you can prepare by downloading an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy."
      );
    } else {
      Alert.alert("Disable 2FA", "Are you sure you want to disable 2FA?", [
        { text: "Cancel", onPress: () => setTwoFA(true) },
        { text: "Disable", onPress: () => setTwoFA(false) },
      ]);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-dark-100">Security</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} className="px-4">
        {/* Password Section */}
        <Text className="text-gray-500 mt-6 mb-3 font-semibold">Password</Text>
        <View className="rounded-2xl bg-gray-50 p-4">
          <Field
            label="Current password"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry={!showCurrentPw}
            rightIcon={showCurrentPw ? "eye-off" : "eye"}
            onRightIconPress={() => setShowCurrentPw(!showCurrentPw)}
            editable={!isLoading}
          />
          <Field
            label="New password"
            value={next1}
            onChangeText={setNext1}
            secureTextEntry={!showNewPw}
            rightIcon={showNewPw ? "eye-off" : "eye"}
            onRightIconPress={() => setShowNewPw(!showNewPw)}
            editable={!isLoading}
          />
          <Field
            label="Confirm new password"
            value={next2}
            onChangeText={setNext2}
            secureTextEntry={!showConfirmPw}
            rightIcon={showConfirmPw ? "eye-off" : "eye"}
            onRightIconPress={() => setShowConfirmPw(!showConfirmPw)}
            editable={!isLoading}
          />

          {/* Password Requirements */}
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <Text className="text-xs text-blue-800 font-semibold mb-2">
              Password must contain:
            </Text>
            <Text className="text-xs text-blue-800 mb-1">
              • At least 8 characters
            </Text>
            <Text className="text-xs text-blue-800 mb-1">
              • At least 1 uppercase letter (A-Z)
            </Text>
            <Text className="text-xs text-blue-800">
              • At least 1 number (0-9)
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={isLoading}
            className={`${
              isLoading ? "bg-gray-400" : "bg-violet-500"
            } rounded-2xl py-3 items-center`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Update Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Two-Factor Authentication Section */}
        <Text className="text-gray-500 mt-8 mb-3 font-semibold">
          Two-factor authentication
        </Text>
        <View className="rounded-2xl bg-gray-50 p-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-gray-800 font-semibold">Enable 2FA</Text>
            <TouchableOpacity
              onPress={handleToggle2FA}
              className={`px-3 py-1.5 rounded-full ${
                twoFA ? "bg-green-100" : "bg-gray-200"
              }`}
            >
              <Text className={`text-xs font-semibold ${twoFA ? "text-green-700" : "text-gray-700"}`}>
                {twoFA ? "On" : "Off"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setShow2FAInfo(true)}
            className="flex-row items-center mb-3"
          >
            <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
            <Text className="ml-2 text-gray-600 font-medium">How 2FA works</Text>
          </TouchableOpacity>

          <View className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Text className="text-xs text-blue-800 mb-1 font-semibold">
              Coming Soon:
            </Text>
            <Text className="text-xs text-blue-800">
              When enabled, you'll be asked for a one-time code from your
              authenticator app or SMS at sign-in.
            </Text>
          </View>
        </View>

        {/* Session Management */}
        <Text className="text-gray-500 mt-8 mb-3 font-semibold">
          Active Sessions
        </Text>
        <View className="rounded-2xl bg-gray-50 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-gray-800 font-semibold mb-1">
                This Device
              </Text>
              <Text className="text-xs text-gray-500">Currently signed in</Text>
            </View>
            <View className="bg-green-100 px-2 py-1 rounded-full">
              <Text className="text-xs text-green-700 font-semibold">Active</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 2FA Info Modal */}
      <Modal
        visible={show2FAInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShow2FAInfo(false)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-semibold text-dark-100">
                Two-Factor Authentication
              </Text>
              <TouchableOpacity onPress={() => setShow2FAInfo(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-4 leading-6">
              Two-factor authentication adds an extra layer of security to your
              account. In addition to your password, you'll need to provide a
              second form of verification.
            </Text>

            <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <Text className="text-sm font-semibold text-blue-900 mb-3">
                How it works:
              </Text>
              <Text className="text-sm text-blue-800 mb-2">
                1. Download an authenticator app (Google Authenticator,
                Microsoft Authenticator, or Authy)
              </Text>
              <Text className="text-sm text-blue-800 mb-2">
                2. Scan a QR code from our system
              </Text>
              <Text className="text-sm text-blue-800">
                3. Enter a 6-digit code each time you sign in
              </Text>
            </View>

            <Text className="text-sm text-gray-600 mb-6">
              <Text className="font-semibold">Benefits:</Text> Protects your
              account from unauthorized access even if someone knows your
              password.
            </Text>

            <TouchableOpacity
              onPress={() => setShow2FAInfo(false)}
              className="bg-violet-500 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  rightIcon?: string;
  onRightIconPress?: () => void;
  editable?: boolean;
}

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  rightIcon,
  onRightIconPress,
  editable = true,
}: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-gray-700 mb-2 font-semibold">{label}</Text>
      <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3">
        <TextInput
          className="flex-1 py-3 text-dark-100"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          editable={editable}
          placeholderTextColor="#9CA3AF"
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} className="py-3 pl-2">
            <Ionicons name={rightIcon as any} size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}