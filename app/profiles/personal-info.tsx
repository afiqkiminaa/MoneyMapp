import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/authContext";
import { firestore } from "@/config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { router } from "expo-router";

type ProfileForm = {
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  occupation?: string;
};

const PersonalInfo = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postcode: "",
    country: "",
    occupation: "",
  });

  const loadProfile = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const ref = doc(firestore, "users", user.uid, "profile", "main");
      const snap = await getDoc(ref);
      const baseEmail = user.email || "";
      const baseName = (user as any)?.name || user?.name || "";

      if (snap.exists()) {
        const data = snap.data() as Partial<ProfileForm>;
        setForm((prev) => ({
          ...prev,
          email: baseEmail || data.email || "",
          fullName: data.fullName || baseName || "",
          phone: data.phone || "",
          dateOfBirth: data.dateOfBirth || "",
          gender: data.gender || "",
          addressLine1: data.addressLine1 || "",
          addressLine2: data.addressLine2 || "",
          city: data.city || "",
          state: data.state || "",
          postcode: data.postcode || "",
          country: data.country || "",
          occupation: data.occupation || "",
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          email: baseEmail,
          fullName: baseName,
        }));
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateField = (key: keyof ProfileForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!user?.uid) {
      Alert.alert("Not signed in", "Please log in again.");
      return;
    }
    if (!form.fullName?.trim()) {
      Alert.alert("Validation", "Full name is required.");
      return;
    }
    if (!form.email?.trim()) {
      Alert.alert("Validation", "Email is required.");
      return;
    }

    setSaving(true);
    try {
      const ref = doc(firestore, "users", user.uid, "profile", "main");
      await setDoc(
        ref,
        {
          ...form,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      Alert.alert("Success", "Your personal information has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save profile.");
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
    <View className="flex-1 bg-white">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Personal Information</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Section: Basic */}
        <Text className="text-sm text-gray-500 mb-2 font-semibold">Basic Details</Text>
        <View className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <Field 
            label="Full Name" 
            value={form.fullName} 
            onChangeText={(t) => updateField("fullName", t)} 
          />
          <Field 
            label="Email" 
            value={form.email} 
            onChangeText={(t) => updateField("email", t)} 
            keyboardType="email-address" 
          />
          <Field 
            label="Phone" 
            value={form.phone || ""} 
            onChangeText={(t) => updateField("phone", t)} 
            keyboardType="phone-pad" 
          />
          <Field 
            label="Date of Birth (YYYY-MM-DD)" 
            value={form.dateOfBirth || ""} 
            onChangeText={(t) => updateField("dateOfBirth", t)} 
            placeholder="2000-01-15"
          />
          <Field 
            label="Gender" 
            value={form.gender || ""} 
            onChangeText={(t) => updateField("gender", t)} 
            placeholder="e.g., Male, Female, Other"
          />
          <Field 
            label="Occupation" 
            value={form.occupation || ""} 
            onChangeText={(t) => updateField("occupation", t)} 
          />
        </View>

        {/* Section: Address */}
        <Text className="text-sm text-gray-500 mt-6 mb-2 font-semibold">Address</Text>
        <View className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <Field 
            label="Address Line 1" 
            value={form.addressLine1 || ""} 
            onChangeText={(t) => updateField("addressLine1", t)} 
          />
          <Field 
            label="Address Line 2" 
            value={form.addressLine2 || ""} 
            onChangeText={(t) => updateField("addressLine2", t)} 
          />
          <Field 
            label="City" 
            value={form.city || ""} 
            onChangeText={(t) => updateField("city", t)} 
          />
          <Field 
            label="State" 
            value={form.state || ""} 
            onChangeText={(t) => updateField("state", t)} 
          />
          <Field 
            label="Postcode" 
            value={form.postcode || ""} 
            onChangeText={(t) => updateField("postcode", t)} 
            keyboardType="number-pad" 
          />
          <Field 
            label="Country" 
            value={form.country || ""} 
            onChangeText={(t) => updateField("country", t)} 
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          disabled={saving}
          onPress={handleSave}
          className={`mt-6 rounded-2xl px-4 py-3 items-center justify-center ${saving ? "bg-gray-300" : "bg-violet-500"}`}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default PersonalInfo;

const Field = ({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "number-pad";
  placeholder?: string;
}) => (
  <View>
    <Text className="text-xs text-gray-600 mb-1 font-medium">{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholder={placeholder || label}
      className="bg-white rounded-xl px-3 py-3 border border-gray-200"
      placeholderTextColor="#D1D5DB"
    />
  </View>
);