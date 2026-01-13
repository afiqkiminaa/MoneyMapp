import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert } from "react-native";
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
    q: "Why don't I see some transactions?",
    a: "Pull down to refresh. If you're offline, new entries sync once you reconnect.",
  },
  {
    q: "How do I change my email or password?",
    a: "Email can be edited in Personal Information. Password can be changed in Security.",
  },
  {
    q: "How do I export my data?",
    a: "Currently, we don't support direct export. Contact our support team for data export requests.",
  },
  {
    q: "Is my data secure?",
    a: "Yes, all data is encrypted and stored securely on Firebase. We never share your information with third parties.",
  },
];

export default function HelpCenterScreen() {
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (i: number) => setOpen(open === i ? null : i);

  const handleEmailSupport = () => {
    Linking.openURL("mailto:support@moneymap.app?subject=Support%20Request").catch(() => {
      Alert.alert("Error", "Could not open email client");
    });
  };

  const handleWhatsApp = () => {
    Linking.openURL("https://wa.me/60195214496").catch(() => {
      Alert.alert("Error", "Could not open WhatsApp. Make sure it's installed.");
    });
  };

  const handleDocumentation = () => {
    Linking.openURL("https://docs.moneymap.app").catch(() => {
      Alert.alert("Error", "Could not open documentation");
    });
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 pt-14 pb-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Help Center</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} className="px-4">
        {/* FAQs Section */}
        <Text className="text-gray-500 mt-4 mb-2 font-semibold">FAQs</Text>
        <View className="rounded-2xl bg-gray-50 overflow-hidden">
          {faqs.map((f, idx) => (
            <View key={idx}>
              <TouchableOpacity 
                onPress={() => toggle(idx)} 
                className="px-4 py-4 flex-row items-center justify-between"
              >
                <Text className="text-gray-900 font-medium pr-4 flex-1">{f.q}</Text>
                <Ionicons 
                  name={open === idx ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color="#6b7280" 
                />
              </TouchableOpacity>
              {open === idx && (
                <View className="bg-gray-100/50">
                  <Text className="text-gray-600 px-4 pb-4 leading-5">
                    {f.a}
                  </Text>
                </View>
              )}
              {idx !== faqs.length - 1 && <View className="h-px bg-gray-200" />}
            </View>
          ))}
        </View>

        {/* Need More Help Section */}
        <Text className="text-gray-500 mt-6 mb-2 font-semibold">Need More Help?</Text>
        <View className="rounded-2xl bg-gray-50 overflow-hidden">
          <Action
            icon="mail-outline"
            label="Email Support"
            description="Get help via email"
            onPress={handleEmailSupport}
            isFirst
          />
          <Divider />
          <Action
            icon="logo-whatsapp"
            label="WhatsApp"
            description="Quick support on WhatsApp"
            onPress={handleWhatsApp}
          />
          <Divider />
          <Action
            icon="document-text-outline"
            label="Documentation"
            description="View full documentation"
            onPress={handleDocumentation}
            isLast
          />
        </View>

        {/* Contact Info */}
        <View className="mt-6 bg-violet-50 rounded-2xl p-4 border border-violet-200">
          <View className="flex-row mb-2">
            <Ionicons name="help-circle-outline" size={20} color="#7C3AED" />
            <Text className="ml-2 font-semibold text-violet-900">Contact Information</Text>
          </View>
          <Text className="text-sm text-violet-800 ml-7">
            Email: support@moneymap.app{"\n"}
            WhatsApp: +6019 521 4496{"\n"}
            Response time: 24-48 hours
          </Text>
        </View>

        {/* App Info */}
        <View className="mt-6 bg-gray-50 rounded-2xl p-4">
          <Text className="text-xs text-gray-600 font-semibold mb-1">APP INFORMATION</Text>
          <Text className="text-sm text-gray-700 font-medium">MoneyMap v1.0.0</Text>
          <Text className="text-xs text-gray-500 mt-2">
            © 2025 MoneyMap. All rights reserved.{"\n"}
            Built with care for your financial wellness.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Action({
  icon,
  label,
  description,
  onPress,
  isFirst,
  isLast,
}: {
  icon: any;
  label: string;
  description: string;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      className="py-4 px-4 flex-row items-center justify-between active:bg-gray-200"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center flex-1">
        <View className="w-10 h-10 rounded-lg bg-white items-center justify-center">
          <Ionicons name={icon} size={20} color="#6B7280" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-gray-800 font-semibold text-sm">{label}</Text>
          <Text className="text-gray-500 text-xs">{description}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View className="h-px bg-gray-200" />;
}