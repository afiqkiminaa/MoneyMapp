import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
} from "react-native";

import * as ImagePicker from "expo-image-picker";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/config/firebase";
import { useAuth } from "@/contexts/authContext";
import Toast from "react-native-toast-message";

const OCR_API_URL = "https://money-map-ocr.vercel.app/api/extract-text";

const categories = [
  "Food",
  "Rent",
  "Utilities",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Health",
  "Education",
  "Travel",
  "Other",
];

const AddExpense = () => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState("Food");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [loadingOCR, setLoadingOCR] = useState(false);

  const { user } = useAuth();

  const handleDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const handleOCR = async () => {
    try {
      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.7,
      });

      if (result.canceled) return;

      const base64Image = result.assets[0].base64;

      setLoadingOCR(true);

      const response = await fetch(OCR_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image }),
      });

      // Check if the response status is NOT OK (e.g., 4xx or 5xx)
      if (!response.ok) {
        const rawText = await response.text();
        setLoadingOCR(false);
        Toast.show({
          type: "error",
          text1: "OCR API Error",
          text2: `Status ${response.status}: ${rawText.substring(0, 100)}... (Check server logs)`,
        });
        return; // Stop processing if response is not OK
      }
      
      const data = await response.json();
      setLoadingOCR(false);

      if (data.error) {
        Toast.show({
          type: "error",
          text1: "OCR Error",
          text2: data.error,
        });
        return;
      }
      
      // 1. Apply extracted Amount
      if (data.amount && !isNaN(Number(data.amount))) {
        setAmount(data.amount);
      }
      
      // 2. Apply extracted Date
      if (data.date) {
        // Attempt to parse the string date into a Date object
        const parsedDate = new Date(data.date);
        
        // Check if parsing resulted in a valid date (not 'Invalid Date')
        if (!isNaN(parsedDate.getTime())) {
          setDate(parsedDate);
        } else {
          console.log("Failed to parse date from OCR:", data.date);
        }
      }

      Toast.show({
        type: "success",
        text1: "Receipt Scanned",
        text2: "Amount and date extracted successfully!",
      });
    } catch (err) {
      console.log(err);
      setLoadingOCR(false);
      Toast.show({
        type: "error",
        text1: "Failed to scan",
        text2: "Please try again",
      });
    }
  };

  const handleSaveExpense = async () => {
    if (!amount || isNaN(Number(amount))) {
      Toast.show({
        type: "error",
        text1: "Invalid Amount",
        text2: "Please enter a valid number (e.g., 12.50)",
      });
      return;
    }

    if (!user?.uid) {
      Toast.show({
        type: "error",
        text1: "Authentication Error",
        text2: "User not logged in",
      });
      return;
    }

    try {
      const expenseData = {
        amount: parseFloat(amount),
        date: date.toISOString(),
        category,
        notes,
        isRecurring,
        createdAt: serverTimestamp(),
      };

      await addDoc(
        collection(firestore, "users", user.uid, "expenses"),
        expenseData
      );

      Toast.show({
        type: "success",
        text1: "Expense Saved",
        text2: "Your expense has been recorded successfully",
      });

      setAmount("");
      setNotes("");
      setCategory("Food");
      setIsRecurring(false);
      setDate(new Date());
    } catch (error) {
      console.error("Error saving expense: ", error);
      Toast.show({
        type: "error",
        text1: "Error Saving Expense",
        text2: "Please try again",
      });
    }
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 py-6">
      {/* Header */}
      <View className="items-center mb-4">
        <Text className="text-4xl font-bold text-dark-100 mt-7 mb-1">
          Add Expense
        </Text>
        <Text className="text-base text-dark-200 mb-3">
          Record your daily expenses
        </Text>
      </View>

      {/* Amount */}
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
      </View>

      {/* Date */}
      <Text className="text-sm font-medium text-gray-600 mb-1">Date</Text>
      <TouchableOpacity
        className="flex-row justify-between items-center border border-gray-300 rounded-xl px-4 py-2 mb-4"
        onPress={() => setShowDatePicker((prev) => !prev)}
      >
        <Text className="text-black">{date.toLocaleDateString()}</Text>
        <Ionicons name="calendar-outline" size={20} color="#999" />
      </TouchableOpacity>

      {showDatePicker && (
        <View className="mb-4">
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "calendar"}
            onChange={handleDateChange}
          />
        </View>
      )}

      {/* OCR */}
      <TouchableOpacity
        className="border border-violet-400 rounded-xl py-3 items-center justify-center mb-4"
        onPress={handleOCR}
      >
        {loadingOCR ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text className="text-violet-600 font-semibold">📷 Scan Receipt</Text>
        )}
      </TouchableOpacity>

      {/* Category */}
      <Text className="text-sm font-medium text-gray-600 mb-2">Category</Text>
      <View className="flex-row flex-wrap mb-4">
        {categories.map((item) => (
          <Pressable
            key={item}
            onPress={() => setCategory(item)}
            className={`px-3 py-2 m-1 rounded-full ${
              category === item ? "bg-violet-400" : "bg-gray-100"
            }`}
          >
            <Text className={category === item ? "text-white" : "text-black"}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Notes */}
      <Text className="text-sm font-medium text-gray-600 mb-1">Notes</Text>
      <View className="flex-row border border-gray-300 rounded-xl px-4 py-2 mb-4">
        <TextInput
          className="flex-1 text-black"
          placeholder="Add details of spending..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* Recurring */}
      <View className="flex-row items-center mb-6">
        <Switch value={isRecurring} onValueChange={setIsRecurring} />
        <Text className="ml-3 text-gray-700">This is a recurring expense</Text>
      </View>

      {/* Save */}
      <TouchableOpacity
        className="bg-violet-400 rounded-xl py-4 items-center mb-9"
        onPress={handleSaveExpense}
      >
        <Text className="text-white font-bold">Save Expense</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AddExpense;