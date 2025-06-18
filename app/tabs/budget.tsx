import { firestore } from "@/config/firebase";
import { useAuth } from "@/contexts/authContext";
import { Feather, Ionicons } from "@expo/vector-icons";
import { parseISO } from "date-fns";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { ProgressBar } from "react-native-paper";

const categoryList = [
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

const BudgetPage = () => {
  const { user } = useAuth();
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingCategory, setEditingCategory] = useState("");

  const [newLimit, setNewLimit] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("Food");
  const [dropdownItems, setDropdownItems] = useState(
    categoryList.map((c) => ({ label: c, value: c }))
  );

  const currentMonthKey = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  const fetchBudgetData = async () => {
    const uid = user?.uid;
    if (!uid) return;

    try {
      setLoading(true);

      const expensesRef = collection(firestore, "users", uid, "expenses");
      const snapshot = await getDocs(expensesRef);
      const totals: { [category: string]: number } = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        const date = parseISO(data.date);
        const now = new Date();
        if (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        ) {
          totals[data.category] = (totals[data.category] || 0) + data.amount;
        }
      });

      const budgetRef = collection(
        firestore,
        "users",
        uid,
        "budgets",
        currentMonthKey,
        "categories"
      );
      const budgetSnap = await getDocs(budgetRef);

      const budgets: any[] = [];
      budgetSnap.forEach((doc) => {
        const cat = doc.id;
        const limit = doc.data().limit;
        const used = totals[cat] || 0;
        const percentage = (used / limit) * 100;

        // 3-color logic
        let color = "#22c55e"; // green
        if (percentage >= 100) color = "#ef4444"; // red
        else if (percentage >= 50) color = "#facc15"; // yellow

        budgets.push({
          category: cat,
          limit,
          used,
          percentage: Math.min(percentage, 100),
          color,
        });
      });

      setBudgetData(budgets);
    } catch (err) {
      console.error("Error fetching budgets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetData();
  }, []);

  const handleSaveBudget = async () => {
    const uid = user?.uid;
    if (!uid || !newCategory || !newLimit) return;

    const category = editMode ? editingCategory : newCategory;
    const ref = doc(
      firestore,
      "users",
      uid,
      "budgets",
      currentMonthKey,
      "categories",
      category
    );

    try {
      await setDoc(ref, { limit: parseFloat(newLimit) });

      setTimeout(() => {
        setShowModal(false);
        setNewLimit("");
        setDropdownOpen(false);
        setEditMode(false);
        setEditingCategory("");
        fetchBudgetData();
      }, 100);
    } catch (err) {
      Alert.alert("Error", "Failed to save budget.");
    }
  };

  const handleDeleteBudget = async (category: string) => {
    const uid = user?.uid;
    if (!uid) return;

    Alert.alert(
      "Delete Budget",
      `Are you sure you want to delete the budget for "${category}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const ref = doc(
              firestore,
              "users",
              uid,
              "budgets",
              currentMonthKey,
              "categories",
              category
            );
            await deleteDoc(ref);
            fetchBudgetData();
          },
        },
      ]
    );
  };

  const handleEditBudget = (category: string, limit: number) => {
    setEditMode(true);
    setEditingCategory(category);
    setNewCategory(category);
    setNewLimit(limit.toString());
    setShowModal(true);
    setDropdownOpen(false);
  };

  const getRecommendations = () => {
    return budgetData
      .map((b) => {
        if (b.used > b.limit)
          return `• ${b.category}: Consider increasing your budget. You’ve exceeded it.`;
        if (b.used < b.limit * 0.3)
          return `• ${b.category}: Spending is low. You might reduce the budget.`;
        return null;
      })
      .filter(Boolean);
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-8">
      <Text className="text-4xl font-bold text-dark-100 mt-5 mb-1 text-center">
        Budgets
      </Text>
      <Text className="text-base text-dark-200 mb-4 text-center">
        Setup your budget limits
      </Text>

      {budgetData.map((b, idx) => (
        <View key={idx} className="mb-5">
          <View className="flex-row justify-between items-center mb-1">
            <View>
              <Text className="font-medium text-dark-100">{b.category}</Text>
              <Text className="text-gray-500 text-sm">
                RM{b.used.toFixed(2)} / RM{b.limit.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => handleEditBudget(b.category, b.limit)}
              >
                <Feather name="edit" size={18} color="#4b5563" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteBudget(b.category)}>
                <Feather name="trash-2" size={18} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>

          <ProgressBar
            progress={b.percentage / 100}
            color={b.color}
            style={{ height: 8, borderRadius: 10 }}
          />

          <Text className="text-sm text-gray-500 mt-1">
            {b.used > b.limit
              ? "Over Budget! Limit exceeded."
              : `${Math.round(b.percentage)}% used, RM${(
                  b.limit - b.used
                ).toFixed(2)} remaining`}
          </Text>
        </View>
      ))}

      <View className="bg-blue-50 mt-8 p-4 rounded-xl border border-blue-100">
        <Text className="text-base font-bold mb-2 text-blue-700">
          Smart Budget Recommendations
        </Text>
        {getRecommendations().length > 0 ? (
          getRecommendations().map((rec, idx) => (
            <Text key={idx} className="text-blue-700 mb-1">
              {rec}
            </Text>
          ))
        ) : (
          <Text className="text-gray-500">No recommendations available.</Text>
        )}
      </View>

      <TouchableOpacity
        className="border border-violet-400 p-3 rounded-2xl items-center mt-8 mb-9"
        onPress={() => {
          setEditMode(false);
          setNewCategory("Food");
          setNewLimit("");
          setShowModal(true);
        }}
      >
        <Text className="text-violet-600 font-bold text-lg">
          + Add Budget Category
        </Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View className="flex-1 justify-center items-center bg-black/50 px-5">
          <View className="bg-white w-full p-6 rounded-xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-dark-100">
                {editMode ? "Edit Budget" : "Add New Budget"}
              </Text>
              <Pressable onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} />
              </Pressable>
            </View>

            {/* Category Dropdown */}
            {!editMode && (
              <>
                <Text className="mb-1 font-medium">Category</Text>
                <DropDownPicker
                  open={dropdownOpen}
                  value={newCategory}
                  items={dropdownItems}
                  setOpen={setDropdownOpen}
                  setValue={setNewCategory}
                  setItems={setDropdownItems}
                  zIndex={1000}
                  style={{
                    borderColor: "#ccc",
                    marginBottom: 20,
                  }}
                  dropDownContainerStyle={{ zIndex: 1000 }}
                />
              </>
            )}

            {/* Limit Input */}
            <Text className="mb-1 font-medium">Limit (Monthly)</Text>
            <TextInput
              value={newLimit}
              onChangeText={setNewLimit}
              keyboardType="numeric"
              placeholder="RM 0.00"
              className="border border-gray-300 rounded-md px-3 py-2 mb-4"
            />

            <TouchableOpacity
              className="bg-violet-500 rounded-md p-3"
              onPress={handleSaveBudget}
            >
              <Text className="text-white font-bold text-center">
                {editMode ? "Update Budget" : "Save Budget"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default BudgetPage;
