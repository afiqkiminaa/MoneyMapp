import React, { useEffect, useState } from "react";
import { View, Text, Switch, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/contexts/authContext";
import { firestore } from "@/config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

type NotificationSettings = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  budgetAlertPct: string;
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    dailyDigest: false,
    weeklyReport: true,
    budgetAlertPct: "80",
  });

  useEffect(() => {
    loadSettings();
  }, [user?.uid]);

  const loadSettings = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const ref = doc(firestore, "users", user.uid, "settings", "notifications");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setSettings(snap.data() as NotificationSettings);
      }
    } catch (e: any) {
      console.error("Error loading settings:", e);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    if (!user?.uid) {
      Alert.alert("Error", "Not signed in");
      return;
    }

    // Validate budget alert percentage
    const pct = parseInt(settings.budgetAlertPct);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      Alert.alert("Validation", "Budget alert percentage must be between 1 and 100.");
      return;
    }

    setSaving(true);
    try {
      const ref = doc(firestore, "users", user.uid, "settings", "notifications");
      await setDoc(ref, {
        ...settings,
        updatedAt: new Date(),
      }, { merge: true });
      Alert.alert("Success", "Notification settings saved.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} className="flex-1 bg-white">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Notifications</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} className="px-4">
        {/* Delivery channels */}
        <Text className="text-gray-500 mt-3 mb-2 font-semibold">Delivery Channels</Text>
        <View className="rounded-2xl bg-gray-50 p-3">
          <RowSwitch 
            label="Push notifications" 
            value={settings.pushEnabled} 
            onValueChange={(v) => updateSetting("pushEnabled", v)} 
          />
          <Divider />
          <RowSwitch 
            label="Email" 
            value={settings.emailEnabled} 
            onValueChange={(v) => updateSetting("emailEnabled", v)} 
          />
          <Divider />
          <RowSwitch 
            label="SMS" 
            value={settings.smsEnabled} 
            onValueChange={(v) => updateSetting("smsEnabled", v)} 
          />
        </View>

        {/* Event types */}
        <Text className="text-gray-500 mt-6 mb-2 font-semibold">What to Notify</Text>
        <View className="rounded-2xl bg-gray-50 p-3">
          <RowSwitch 
            label="Daily digest (spend + balances)" 
            value={settings.dailyDigest} 
            onValueChange={(v) => updateSetting("dailyDigest", v)} 
          />
          <Divider />
          <RowSwitch 
            label="Weekly report (categories & trends)" 
            value={settings.weeklyReport} 
            onValueChange={(v) => updateSetting("weeklyReport", v)} 
          />
        </View>

        {/* Budget alerts */}
        <Text className="text-gray-500 mt-6 mb-2 font-semibold">Budget Alerts</Text>
        <View className="rounded-2xl bg-gray-50 p-4">
          <Text className="text-gray-800 mb-2 font-medium">Alert me when monthly budget usage reaches (%)</Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 bg-white rounded-xl border border-gray-200 px-3 py-2"
              keyboardType="number-pad"
              maxLength={3}
              value={settings.budgetAlertPct}
              onChangeText={(t) => updateSetting("budgetAlertPct", t)}
              placeholder="e.g. 80"
            />
            <Text className="text-gray-500 font-medium">%</Text>
          </View>
          <Text className="text-xs text-gray-500 mt-2">
            You'll receive an alert when any category or overall budget hits this threshold.
          </Text>
        </View>

        <TouchableOpacity 
          disabled={saving}
          onPress={onSave} 
          className={`mt-6 rounded-2xl py-3 items-center ${saving ? "bg-gray-300" : "bg-violet-500"}`}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Save Settings</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RowSwitch({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text className="text-gray-800">{label}</Text>
      <Switch 
        value={value} 
        onValueChange={onValueChange}
        trackColor={{ false: "#E5E7EB", true: "#DDD6FE" }}
        thumbColor={value ? "#8B5CF6" : "#F3F4F6"}
      />
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-gray-200" />;
}