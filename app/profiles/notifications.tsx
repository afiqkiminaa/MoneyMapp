// app/profiles/notifications.tsx
import React, { useState } from "react";
import { View, Text, Switch, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function NotificationsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const [dailyDigest, setDailyDigest] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);

  const [budgetAlertPct, setBudgetAlertPct] = useState("80"); // alert at 80%

  const onSave = () => {
    // TODO: persist to Firestore or secure storage
    // e.g., await setDoc(doc(firestore, `users/${uid}/settings/notifications`), {...})
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} className="flex-1 bg-white">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-dark-100">Notifications</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} className="px-4">
        {/* Delivery channels */}
        <Text className="text-gray-500 mt-3 mb-2">Delivery channels</Text>
        <View className="rounded-2xl bg-gray-50 p-3">
          <RowSwitch label="Push notifications" value={pushEnabled} onValueChange={setPushEnabled} />
          <Divider />
          <RowSwitch label="Email" value={emailEnabled} onValueChange={setEmailEnabled} />
          <Divider />
          <RowSwitch label="SMS" value={smsEnabled} onValueChange={setSmsEnabled} />
        </View>

        {/* Event types */}
        <Text className="text-gray-500 mt-6 mb-2">What to notify</Text>
        <View className="rounded-2xl bg-gray-50 p-3">
          <RowSwitch label="Daily digest (spend + balances)" value={dailyDigest} onValueChange={setDailyDigest} />
          <Divider />
          <RowSwitch label="Weekly report (categories & trends)" value={weeklyReport} onValueChange={setWeeklyReport} />
        </View>

        {/* Budget alerts */}
        <Text className="text-gray-500 mt-6 mb-2">Budget alerts</Text>
        <View className="rounded-2xl bg-gray-50 p-4">
          <Text className="text-gray-800 mb-2">Alert me when monthly budget usage reaches (%)</Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 bg-white rounded-xl border border-gray-200 px-3 py-2"
              keyboardType="number-pad"
              maxLength={3}
              value={budgetAlertPct}
              onChangeText={setBudgetAlertPct}
              placeholder="e.g. 80"
            />
            <Text className="text-gray-500">%</Text>
          </View>
          <Text className="text-xs text-gray-500 mt-2">
            You’ll receive an alert when any category or overall budget hits this threshold.
          </Text>
        </View>

        <TouchableOpacity onPress={onSave} className="mt-6 bg-violet-400 rounded-2xl py-3 items-center">
          <Text className="text-white font-semibold">Save</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RowSwitch({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text className="text-gray-800">{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}
function Divider() {
  return <View className="h-px bg-gray-200" />;
}
