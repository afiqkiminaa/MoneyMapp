// app/profiles/help-center.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

type FAQ = { q: string; a: string };

const faqs: FAQ[] = [
  {
    q: "How do I add an expense?",
    a: "Go to the Add tab (+) and fill in amount, category, date, and notes. Tap Save to record it.",
  },
  {
    q: "How can I set a monthly budget?",
    a: "Open the Budget tab and set limits per category. Usage updates in real time from your expenses.",
  },
  {
    q: "Why don’t I see some transactions?",
    a: "Pull down to refresh. If you’re offline, new entries sync once you reconnect.",
  },
  {
    q: "How do I change my email or password?",
    a: "Email can be edited in Personal Information. Password can be changed in Security.",
  },
];

export default function HelpCenterScreen() {
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (i: number) => setOpen(open === i ? null : i);

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 pt-14 pb-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-dark-100">Help Center</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} className="px-4">
        <Text className="text-gray-500 mt-3 mb-2">FAQs</Text>
        <View className="rounded-2xl bg-gray-50">
          {faqs.map((f, idx) => (
            <View key={idx} className="px-4">
              <TouchableOpacity onPress={() => toggle(idx)} className="py-4 flex-row items-center justify-between">
                <Text className="text-gray-900 font-medium pr-4">{f.q}</Text>
                <Ionicons name={open === idx ? "chevron-up" : "chevron-down"} size={18} color="#6b7280" />
              </TouchableOpacity>
              {open === idx && (
                <Text className="text-gray-600 -mt-1 pb-4">
                  {f.a}
                </Text>
              )}
              {idx !== faqs.length - 1 && <View className="h-px bg-gray-200" />}
            </View>
          ))}
        </View>

        <Text className="text-gray-500 mt-6 mb-2">Need more help?</Text>
        <View className="rounded-2xl bg-gray-50 p-4">
          <Action
            icon="mail-outline"
            label="Email support"
            onPress={() => Linking.openURL("mailto:support@moneymap.app?subject=Support%20Request")}
          />
          <Divider />
          <Action
            icon="logo-whatsapp"
            label="WhatsApp"
            onPress={() => Linking.openURL("https://wa.me/60123456789")}
          />
          <Divider />
          <Action
            icon="document-text-outline"
            label="View documentation"
            onPress={() => Linking.openURL("https://docs.moneymap.app")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="py-3 flex-row items-center">
      <Ionicons name={icon} size={18} color="#6b7280" />
      <Text className="ml-3 text-gray-800">{label}</Text>
    </TouchableOpacity>
  );
}
function Divider() {
  return <View className="h-px bg-gray-200" />;
}
