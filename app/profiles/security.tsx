import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function SecurityScreen() {
  const [current, setCurrent] = useState("");
  const [next1, setNext1] = useState("");
  const [next2, setNext2] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [show2FAInfo, setShow2FAInfo] = useState(false);

  const handleChangePassword = () => {
    if (next1.length < 8) return alert("New password must be at least 8 characters.");
    if (next1 !== next2) return alert("New passwords do not match.");
    // TODO: integrate with auth backend (Firebase Auth updatePassword, etc.)
    alert("Password changed.");
    setCurrent(""); setNext1(""); setNext2("");
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 pt-14 pb-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-dark-100">Security</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} className="px-4">
        <Text className="text-gray-500 mt-3 mb-2">Password</Text>
        <View className="rounded-2xl bg-gray-50 p-4">
          <Field
            label="Current password"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry={!showPw}
            rightIcon={showPw ? "eye-off" : "eye"}
            onRightIconPress={() => setShowPw(!showPw)}
          />
          <Field
            label="New password"
            value={next1}
            onChangeText={setNext1}
            secureTextEntry={!showPw}
            rightIcon={showPw ? "eye-off" : "eye"}
            onRightIconPress={() => setShowPw(!showPw)}
          />
          <Field
            label="Confirm new password"
            value={next2}
            onChangeText={setNext2}
            secureTextEntry={!showPw}
            rightIcon={showPw ? "eye-off" : "eye"}
            onRightIconPress={() => setShowPw(!showPw)}
          />
          <TouchableOpacity onPress={handleChangePassword} className="mt-3 bg-violet-400 rounded-2xl py-3 items-center">
            <Text className="text-white font-semibold">Update Password</Text>
          </TouchableOpacity>
          <Text className="text-xs text-gray-500 mt-2">Use at least 8 characters, with a mix of letters and numbers.</Text>
        </View>

        <Text className="text-gray-500 mt-6 mb-2">Two-factor authentication</Text>
        <View className="rounded-2xl bg-gray-50 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-gray-800">Enable 2FA</Text>
            <TouchableOpacity
              onPress={() => setTwoFA(!twoFA)}
              className={`px-2 py-1 rounded-full ${twoFA ? "bg-green-100" : "bg-gray-200"}`}
            >
              <Text className={`text-xs ${twoFA ? "text-green-700" : "text-gray-700"}`}>{twoFA ? "On" : "Off"}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShow2FAInfo(true)} className="mt-3 flex-row items-center">
            <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
            <Text className="ml-1 text-gray-500">How 2FA works</Text>
          </TouchableOpacity>
          <Text className="text-xs text-gray-500 mt-2">
            When enabled, you’ll be asked for a one-time code from your authenticator app or SMS at sign-in.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={show2FAInfo} transparent animationType="fade" onRequestClose={() => setShow2FAInfo(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-5 w-full">
            <Text className="text-lg font-semibold mb-2">Two-factor authentication</Text>
            <Text className="text-gray-600">
              Add an extra layer of security. Use an authenticator app (recommended) or SMS. You’ll scan a QR code on setup and enter a 6-digit code each time you sign in.
            </Text>
            <TouchableOpacity onPress={() => setShow2FAInfo(false)} className="self-end mt-4 px-4 py-2 rounded-xl bg-indigo-600">
              <Text className="text-white font-semibold">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({
  label, value, onChangeText, secureTextEntry, rightIcon, onRightIconPress,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  rightIcon?: any;
  onRightIconPress?: () => void;
}) {
  return (
    <View className="mb-3">
      <Text className="text-gray-700 mb-1">{label}</Text>
      <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3">
        <TextInput
          className="flex-1 py-2"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} className="py-2 pl-2">
            <Ionicons name={rightIcon} size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
