import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

// --- AUDIO & FILESYSTEM ---
import { Audio } from "expo-av";
// Using LEGACY import for Expo SDK 52+ compatibility
import { readAsStringAsync } from "expo-file-system/legacy"; 
// --------------------------

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { useAuth } from "@/contexts/authContext";
import Toast from "react-native-toast-message";

// --- CONFIGURATION ---
const OCR_API_URL = "https://money-map-ocr.vercel.app/api/extract-text";
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const categories = [
  "Food", "Rent", "Utilities", "Transportation", "Entertainment",
  "Shopping", "Health", "Education", "Travel", "Other",
];

const AddExpense = () => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState("Food");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [loadingOCR, setLoadingOCR] = useState(false);

  // --- VOICE STATE ---
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [processingVoice, setProcessingVoice] = useState(false);
  const { user } = useAuth();

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission denied", "Microphone access is needed.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      // Feedback to user that recording started
      Toast.show({ type: 'info', text1: '🎙️ Listening...', text2: 'Say: "Lunch 25 ringgit"' });
    } catch (err) {
      console.error("Start Recording Error:", err);
      Toast.show({ type: 'error', text1: 'Microphone Error', text2: 'Could not start recording.' });
    }
  };

  const stopRecordingAndAnalyze = async () => {
    if (!recording) return;

    setProcessingVoice(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) return;

      if (!GEMINI_API_KEY) {
        Toast.show({ type: 'error', text1: 'Config Error', text2: 'API Key missing.' });
        setProcessingVoice(false);
        return;
      }

      // Convert audio to Base64
      const base64Audio = await readAsStringAsync(uri, {
        encoding: "base64", 
      });

      const prompt = `
        Listen to this audio. The user is describing an expense.
        1. Extract the numeric amount (e.g. "50").
        2. Identify the category from this list: ${categories.join(", ")}.
        3. Return JSON ONLY: {"amount": "50", "category": "Food"}. 
        If uncertain, return {"amount": null}.
      `;

      // Using 'gemini-2.5-flash'
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "audio/mp4", 
                    data: base64Audio
                  }
                }
              ]
            }]
          }),
        }
      );

      const result = await response.json();
      
      // Check for API Errors
      if (result.error) {
        console.error("Gemini API Error:", result.error);
        throw new Error(result.error.message || "API Error");
      }

      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (textResponse) {
        const cleanJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(cleanJson);

        if (data.amount) {
          setAmount(data.amount.toString());
          
          // --- ✅ SUCCESS TOAST ---
          const extractedCat = data.category && categories.includes(data.category) ? data.category : category;
          if (data.category) setCategory(extractedCat);

          Toast.show({ 
            type: "success", 
            text1: "Voice Success! ✅", 
            text2: `Set to RM ${data.amount} (${extractedCat})` 
          });
        } else {
           // --- UNCERTAIN TOAST ---
           Toast.show({ 
            type: "error", 
            text1: "Could not understand ❓", 
            text2: "We heard you, but didn't find an amount. Try again." 
          });
        }
      } else {
        Toast.show({ type: "error", text1: "Error", text2: "No response from AI." });
      }

    } catch (error) {
      console.error("Voice Error:", error);
      // ---  ERROR TOAST ---
      Toast.show({ 
        type: "error", 
        text1: "Connection Failed ❌", 
        text2: "Please check your internet or try again." 
      });
    } finally {
      setProcessingVoice(false);
    }
  };

  const handleVoiceToggle = () => {
    if (recording) {
      stopRecordingAndAnalyze();
    } else {
      startRecording();
    }
  };

  // --- STANDARD HELPERS ---

  const handleDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const handleOCR = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.7,
      });

      if (result.canceled) return;
      const base64Image = result.assets[0].base64;
      setLoadingOCR(true);
      const response = await fetch(OCR_API_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });
      if (!response.ok) { setLoadingOCR(false); Toast.show({ type: "error", text1: "Scan Failed", text2: "Try again." }); return; }
      const data = await response.json();
      setLoadingOCR(false);
      if (data.amount) setAmount(data.amount);
      if (data.date) setDate(new Date(data.date));
      Toast.show({ type: "success", text1: "Scan Complete" });
    } catch (err) {
      setLoadingOCR(false);
      Toast.show({ type: "error", text1: "Error", text2: "Connection failed." });
    }
  };

  const handleSaveExpense = async () => {
    if (!amount || isNaN(Number(amount))) {
      Toast.show({ type: "error", text1: "Invalid Amount", text2: "Enter a number." }); return;
    }
    if (!user?.uid) { Toast.show({ type: "error", text1: "Login Required" }); return; }

    try {
      await addDoc(collection(firestore, "users", user.uid, "expenses"), {
        amount: parseFloat(amount),
        date: date.toISOString(),
        category,
        notes,
        isRecurring,
        createdAt: serverTimestamp(),
      });
      Toast.show({ type: "success", text1: "Expense Saved" });
      setAmount(""); setNotes(""); setCategory("Food"); setDate(new Date());
    } catch (error) {
      Toast.show({ type: "error", text1: "Save Failed" });
    }
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 py-6">
      <View className="items-center mb-4">
        <Text className="text-4xl font-bold text-dark-100 mt-7 mb-1">Add Expense</Text>
        <Text className="text-base text-dark-200 mb-3">Record your daily expenses</Text>
      </View>

      <Text className="text-sm font-medium text-gray-600 mb-1">Amount</Text>
      <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-2 mb-4">
        <Text className="text-gray-400 mr-2">RM</Text>
        <TextInput
          className="flex-1 text-black"
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#999"
          value={amount}
          onChangeText={setAmount}
        />
        <TouchableOpacity 
          onPress={handleVoiceToggle} 
          disabled={processingVoice}
          className={`ml-2 p-2 rounded-full ${recording ? 'bg-red-100' : ''}`}
        >
           {processingVoice ? (
             <ActivityIndicator size="small" color="#8b5cf6" />
           ) : (
             <Ionicons name={recording ? "stop" : "mic"} size={24} color={recording ? "red" : "#8b5cf6"} />
           )}
        </TouchableOpacity>
      </View>
      {recording && <Text className="text-red-500 text-xs text-center -mt-3 mb-3">Recording... Tap to stop</Text>}

      <Text className="text-sm font-medium text-gray-600 mb-1">Date</Text>
      <TouchableOpacity
        className="flex-row justify-between items-center border border-gray-300 rounded-xl px-4 py-2 mb-4"
        onPress={() => setShowDatePicker((prev) => !prev)}
      >
        <Text className="text-black">{date.toLocaleDateString()}</Text>
        <Ionicons name="calendar-outline" size={20} color="#999" />
      </TouchableOpacity>
      {showDatePicker && <DateTimePicker value={date} mode="date" display={Platform.OS === "ios" ? "spinner" : "calendar"} onChange={handleDateChange} />}

      <TouchableOpacity className="border border-violet-400 rounded-xl py-3 items-center justify-center mb-4" onPress={handleOCR}>
        {loadingOCR ? <ActivityIndicator size="small" /> : <Text className="text-violet-600 font-semibold">📷 Scan Receipt</Text>}
      </TouchableOpacity>

      <Text className="text-sm font-medium text-gray-600 mb-2">Category</Text>
      <View className="flex-row flex-wrap mb-4">
        {categories.map((item) => (
          <Pressable key={item} onPress={() => setCategory(item)} className={`px-3 py-2 m-1 rounded-full ${category === item ? "bg-violet-400" : "bg-gray-100"}`}>
            <Text className={category === item ? "text-white" : "text-black"}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <Text className="text-sm font-medium text-gray-600 mb-1">Notes</Text>
      <View className="flex-row border border-gray-300 rounded-xl px-4 py-2 mb-4">
        <TextInput className="flex-1 text-black" placeholder="Details..." placeholderTextColor="#999" multiline numberOfLines={3} value={notes} onChangeText={setNotes} />
      </View>

      <View className="flex-row items-center mb-6">
        <Switch value={isRecurring} onValueChange={setIsRecurring} />
        <Text className="ml-3 text-gray-700">Recurring expense</Text>
      </View>

      <TouchableOpacity className="bg-violet-400 rounded-xl py-4 items-center mb-9" onPress={handleSaveExpense}>
        <Text className="text-white font-bold">Save Expense</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AddExpense;