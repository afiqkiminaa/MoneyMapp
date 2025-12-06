import { firestore } from "@/config/firebase";
import { useAuth } from "@/contexts/authContext";
import { Feather, Ionicons, AntDesign } from "@expo/vector-icons";
import {
  addMonths,
  format,
  parseISO,
  startOfMonth,
  isSameMonth,
} from "date-fns";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
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

type CategoryTotals = Record<string, number>;
type BudgetLimit = { category: string; limit: number };
type Goal = { id: string; name: string; target: number };
type GoalTotals = Record<string, number>;

const BudgetPage = () => {
  const { user } = useAuth();

  // Tabs
  const [activeTab, setActiveTab] = useState<"budget" | "savings">("budget");

  // Budget UI
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingCategory, setEditingCategory] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("Food");
  const [dropdownItems, setDropdownItems] = useState(
    categoryList.map((c) => ({ label: c, value: c }))
  );

  // Month selection
  const [selectedDate, setSelectedDate] = useState<Date>(startOfMonth(new Date()));
  const monthLabel = format(selectedDate, "MMMM yyyy");
  const monthKey = `${selectedDate.getFullYear()}-${String(
    selectedDate.getMonth() + 1
  ).padStart(2, "0")}`;

  // Budget data
  const [loading, setLoading] = useState(true);
  const [monthlyTotals, setMonthlyTotals] = useState<CategoryTotals>({});
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const expensesRef = collection(firestore, "users", uid, "expenses");
    setLoading(true);
    const unsub = onSnapshot(
      expensesRef,
      (snapshot) => {
        const totals: CategoryTotals = {};
        snapshot.forEach((d) => {
          const data: any = d.data();
          const amt = Number(data?.amount);
          if (isNaN(amt)) return;
          let dt: Date | null = null;
          if (typeof data?.date === "string") {
            try { dt = parseISO(data.date); } catch { dt = null; }
          } else if (data?.date?.toDate) dt = data.date.toDate();
          else if (data?.date instanceof Date) dt = data.date;
          else if (data?.date) { try { dt = new Date(data.date); } catch { dt = null; } }
          if (!dt) return;
          if (isSameMonth(dt, selectedDate)) {
            const cat = data.category || "Other";
            totals[cat] = (totals[cat] || 0) + amt;
          }
        });
        setMonthlyTotals(totals);
        setLoading(false);
      },
      (err) => {
        console.error("onSnapshot(expenses) error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid, selectedDate]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const budgetRef = collection(
      firestore,
      "users",
      uid,
      "budgets",
      monthKey,
      "categories"
    );
    const unsub = onSnapshot(
      budgetRef,
      (snapshot) => {
        const limits: BudgetLimit[] = [];
        snapshot.forEach((d) => {
          const limitVal = Number(d.data()?.limit);
          if (!isNaN(limitVal)) limits.push({ category: d.id, limit: limitVal });
        });
        setBudgetLimits(limits);
      },
      (err) => console.error("onSnapshot(budgets) error:", err)
    );
    return () => unsub();
  }, [user?.uid, monthKey]);

  const budgetData = useMemo(() => {
    return budgetLimits.map(({ category, limit }) => {
      const used = monthlyTotals[category] || 0;
      const percentage = limit > 0 ? (used / limit) * 100 : used > 0 ? 100 : 0;
      let color = "#22c55e";
      if (percentage >= 100) color = "#ef4444";
      else if (percentage >= 50) color = "#facc15";
      return { category, limit, used, percentage: Math.min(percentage, 100), color };
    });
  }, [budgetLimits, monthlyTotals]);

  const handleSaveBudget = async () => {
    const uid = user?.uid;
    if (!uid || !newLimit) return;
    const category = editMode ? editingCategory : newCategory;
    const limitNum = parseFloat(newLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      Alert.alert("Invalid amount", "Please enter a valid budget limit.");
      return;
    }
    try {
      await setDoc(
        doc(firestore, "users", uid, "budgets", monthKey, "categories", category),
        { limit: limitNum }
      );
      setShowModal(false);
      setNewLimit("");
      setDropdownOpen(false);
      setEditMode(false);
      setEditingCategory("");
    } catch (err) {
      console.error("Failed to save budget:", err);
      Alert.alert("Error", "Failed to save budget.");
    }
  };

  const handleDeleteBudget = async (category: string) => {
    const uid = user?.uid;
    if (!uid) return;
    Alert.alert("Delete Budget", `Delete "${category}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(
              doc(firestore, "users", uid, "budgets", monthKey, "categories", category)
            );
          } catch (e) {
            console.error("Delete budget error:", e);
            Alert.alert("Error", "Failed to delete budget.");
          }
        },
      },
    ]);
  };

  const handleEditBudget = (category: string, limit: number) => {
    setEditMode(true);
    setEditingCategory(category);
    setNewCategory(category);
    setNewLimit(limit.toString());
    setShowModal(true);
    setDropdownOpen(false);
  };

  const getRecommendations = () =>
    budgetData
      .map((b) =>
        b.used > b.limit
          ? `• ${b.category}: Consider increasing your budget. You’ve exceeded it.`
          : b.used < b.limit * 0.3
          ? `• ${b.category}: Spending is low. You might reduce the budget.`
          : null
      )
      .filter(Boolean) as string[];

  // Savings state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalTotals, setGoalTotals] = useState<GoalTotals>({});
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordGoalId, setRecordGoalId] = useState<string | null>(null);
  const [recordItems, setRecordItems] = useState<{ label: string; value: string }[]>(
    []
  );
  const [recordAmount, setRecordAmount] = useState("");
  const [underBudgetStreakMonths, setUnderBudgetStreakMonths] = useState<number | null>(null);
  const [weeklyStreakWeeks, setWeeklyStreakWeeks] = useState<number | null>(null);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;

    const goalsRef = collection(firestore, "users", uid, "savings_goals");
    const unsubGoals = onSnapshot(goalsRef, (snap) => {
      const arr: Goal[] = [];
      snap.forEach((d) => {
        const data: any = d.data();
        const target = Number(data?.target);
        if (!data?.name || isNaN(target)) return;
        arr.push({ id: d.id, name: data.name, target });
      });
      setGoals(arr);
      setRecordItems(arr.map((g) => ({ label: g.name, value: g.id })));
      if (arr.length && !recordGoalId) setRecordGoalId(arr[0].id);
    });

    const recRef = query(
      collection(firestore, "users", uid, "savings_records"),
      orderBy("createdAt", "asc")
    );
    const unsubRecs = onSnapshot(recRef, (snap) => {
      const totals: GoalTotals = {};
      snap.forEach((d) => {
        const data: any = d.data();
        const amt = Number(data?.amount);
        const gId = data?.goalId;
        if (!gId || isNaN(amt)) return;
        totals[gId] = (totals[gId] || 0) + amt;
      });
      setGoalTotals(totals);
    });

    (async () => {
      try {
        const s = await getDoc(doc(firestore, "users", uid, "stats", "summary"));
        if (s.exists()) {
          const d: any = s.data();
          if (typeof d?.underBudgetStreakMonths === "number")
            setUnderBudgetStreakMonths(d.underBudgetStreakMonths);
          if (typeof d?.weeklyStreakWeeks === "number")
            setWeeklyStreakWeeks(d.weeklyStreakWeeks);
        }
      } catch {}
    })();

    return () => {
      unsubGoals();
      unsubRecs();
    };
  }, [user?.uid]);

  const handleAddGoal = async () => {
    const uid = user?.uid;
    if (!uid) return;
    const t = parseFloat(goalTarget);
    if (!goalName.trim() || isNaN(t) || t <= 0) {
      Alert.alert("Invalid input", "Please provide a goal name and a positive target.");
      return;
    }
    try {
      await addDoc(collection(firestore, "users", uid, "savings_goals"), {
        name: goalName.trim(),
        target: t,
        createdAt: serverTimestamp(),
      });
      setGoalName("");
      setGoalTarget("");
    } catch {
      Alert.alert("Error", "Failed to add goal.");
    }
  };

  const handleAddSaving = async () => {
    const uid = user?.uid;
    if (!uid || !recordGoalId) return;
    const amt = parseFloat(recordAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid amount", "Enter a positive number.");
      return;
    }
    try {
      await addDoc(collection(firestore, "users", uid, "savings_records"), {
        goalId: recordGoalId,
        amount: amt,
        createdAt: serverTimestamp(),
      });
      setRecordAmount("");
    } catch {
      Alert.alert("Error", "Failed to record saving.");
    }
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-8" nestedScrollEnabled>
      {/* Header + Tabs */}
      <View className="mt-3 mb-5">
       <Text className="text-4xl font-bold text-dark-100 mt-5 mb-1 text-center">Budgets</Text>
       <Text className="text-base text-dark-200 text-center">Setup your budgets and savings</Text>
        <View className="flex-row gap-x-3 mt-4 self-center">
          <TouchableOpacity
            onPress={() => setActiveTab("budget")}
            className={`px-4 py-2 rounded-xl ${activeTab === "budget" ? "bg-violet-500" : "bg-violet-100"}`}
          >
            <Text className={`${activeTab === "budget" ? "text-white" : "text-violet-700"} font-semibold`}>
              📊 Budget Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("savings")}
            className={`px-4 py-2 rounded-xl ${activeTab === "savings" ? "bg-pink-500" : "bg-pink-100"}`}
          >
            <Text className={`${activeTab === "savings" ? "text-white" : "text-pink-700"} font-semibold`}>
              🏦 Savings Goals
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Budget tab */}
      {activeTab === "budget" && (
        <>
          <View className="flex-row items-center justify-center mt-1 mb-6 gap-x-6">
            <TouchableOpacity onPress={() => setSelectedDate((d) => addMonths(d, -1))}>
              <AntDesign name="leftcircleo" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold">{monthLabel}</Text>
            <TouchableOpacity onPress={() => setSelectedDate((d) => addMonths(d, 1))}>
              <AntDesign name="rightcircleo" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {loading && budgetLimits.length === 0 ? (
            <Text className="text-gray-500 text-center mt-4">Loading…</Text>
          ) : budgetData.length === 0 ? (
            <Text className="text-gray-500 text-center mt-4">No budgets set for this month.</Text>
          ) : (
            budgetData.map((b, idx) => (
              <View key={idx} className="mb-5">
                <View className="flex-row justify-between items-center mb-1">
                  <View>
                    <Text className="font-medium text-dark-100">{b.category}</Text>
                    <Text className="text-gray-500 text-sm">
                      RM{b.used.toFixed(2)} / RM{b.limit.toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row">
                    <TouchableOpacity onPress={() => handleEditBudget(b.category, b.limit)} className="mr-4">
                      <Feather name="edit" size={18} color="#4b5563" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteBudget(b.category)}>
                      <Feather name="trash-2" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ProgressBar progress={b.percentage / 100} color={b.color} style={{ height: 8, borderRadius: 10 }} />

                <Text className="text-sm text-gray-500 mt-1">
                  {b.used > b.limit
                    ? "Over Budget! Limit exceeded."
                    : `${Math.round(b.percentage)}% used, RM${(b.limit - b.used).toFixed(2)} remaining`}
                </Text>
              </View>
            ))
          )}

          <View className="bg-blue-50 mt-8 p-4 rounded-xl border border-blue-100">
            <Text className="text-base font-bold mb-2 text-blue-700">Smart Budget Recommendations</Text>
            {getRecommendations().length > 0 ? (
              getRecommendations().map((rec, idx) => (
                <Text key={idx} className="text-blue-700 mb-1">{rec}</Text>
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
            <Text className="text-violet-600 font-bold text-lg">+ Add Budget Category</Text>
          </TouchableOpacity>

          {/* Budget Modal */}
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

                {!editMode && (
                  <>
                    <Text className="mb-1 font-medium">Category</Text>
                    <DropDownPicker
                      listMode="SCROLLVIEW"            
                      open={dropdownOpen}
                      value={newCategory}
                      items={dropdownItems}
                      setOpen={setDropdownOpen}
                      setValue={setNewCategory}
                      setItems={setDropdownItems}
                      zIndex={1000}
                      style={{ borderColor: "#ccc", marginBottom: 20 }}
                      dropDownContainerStyle={{ zIndex: 1000 }}
                    />
                  </>
                )}

                <Text className="mb-1 font-medium">Limit (Monthly)</Text>
                <TextInput
                  value={newLimit}
                  onChangeText={setNewLimit}
                  keyboardType="numeric"
                  placeholder="RM 0.00"
                  className="border border-gray-300 rounded-md px-3 py-2 mb-4"
                />

                <TouchableOpacity className="bg-violet-500 rounded-md p-3" onPress={handleSaveBudget}>
                  <Text className="text-white font-bold text-center">
                    {editMode ? "Update Budget" : "Save Budget"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* Savings tab */}
      {activeTab === "savings" && (
        <>
          {/* Add Goal */}
          <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-5">
            <Text className="text-base font-semibold mb-3">Add New Goal</Text>
            <TextInput
              placeholder="Goal name (e.g., New Laptop)"
              value={goalName}
              onChangeText={setGoalName}
              className="border border-gray-300 rounded-md px-3 py-2 mb-3"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              placeholder="Target amount"
              value={goalTarget}
              onChangeText={setGoalTarget}
              keyboardType="numeric"
              className="border border-gray-300 rounded-md px-3 py-2 mb-4"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity onPress={handleAddGoal} className="bg-violet-500 rounded-xl p-3">
              <Text className="text-white text-center font-bold">Add Goal</Text>
            </TouchableOpacity>
          </View>

          {/* Record Saving */}
          <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-6">
            <Text className="text-base font-semibold mb-3">Record a Saving</Text>
            <DropDownPicker
              listMode="SCROLLVIEW"          
              open={recordOpen}
              value={recordGoalId}
              items={recordItems}
              setOpen={setRecordOpen}
              setValue={setRecordGoalId as any}
              setItems={setRecordItems}
              placeholder="Select a goal"
              zIndex={2000}
              style={{ borderColor: "#ccc", marginBottom: 12 }}
              dropDownContainerStyle={{ zIndex: 2000 }}
            />
            <TextInput
              placeholder="Amount to save"
              value={recordAmount}
              onChangeText={setRecordAmount}
              keyboardType="numeric"
              className="border border-gray-300 rounded-md px-3 py-2 mb-4"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity onPress={handleAddSaving} className="bg-violet-500 rounded-xl p-3">
              <Text className="text-white text-center font-bold">Add to Goal</Text>
            </TouchableOpacity>
          </View>

          {/* Goals list */}
          <View className="bg-green-50 rounded-2xl p-4 border border-green-100 mb-6">
            <Text className="text-base font-semibold mb-3">Your Goals</Text>
            {goals.length === 0 ? (
              <Text className="text-gray-500">No goals yet. Create one above.</Text>
            ) : (
              goals.map((g) => {
                const saved = goalTotals[g.id] || 0;
                return (
                  <View key={g.id} className="mb-4">
                    <Text className="font-semibold text-dark-100">
                      {g.name} - RM{saved.toFixed(0)} / RM{g.target.toFixed(0)}
                    </Text>
                    <ProgressBar
                      progress={g.target > 0 ? saved / g.target : 0}
                      color={"#22c55e"}
                      style={{ height: 8, borderRadius: 10, marginTop: 6 }}
                    />
                  </View>
                );
              })
            )}
          </View>

          {/* Streaks */}
          <View className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-10">
            <Text className="text-base font-semibold mb-2">🏅 Budget Streaks & Rewards</Text>
            <Text className="text-gray-700 mb-2">
              {typeof underBudgetStreakMonths === "number"
                ? `You’ve stayed under budget for ${underBudgetStreakMonths} month${
                    underBudgetStreakMonths === 1 ? "" : "s"
                  } in a row!`
                : "Keep tracking your spending—streaks will appear here once available."}
            </Text>
            <Text className="text-gray-700 mb-1">Weekly Streak Reward Progress</Text>
            <ProgressBar
              progress={
                typeof weeklyStreakWeeks === "number"
                  ? Math.min(weeklyStreakWeeks / 12, 1)
                  : 0
              }
              color={"#f59e0b"}
              style={{ height: 8, borderRadius: 10, marginVertical: 6 }}
            />
            <Text className="text-gray-500">
              {typeof weeklyStreakWeeks === "number"
                ? `${Math.max(12 - weeklyStreakWeeks, 0)} month${
                    (12 - (weeklyStreakWeeks || 0)) === 1 ? "" : "s"
                  } to unlock a badge 🥇`
                : "Log weekly savings to start earning badges! 🥇"}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default BudgetPage;
