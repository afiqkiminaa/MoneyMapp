import { firestore } from "@/config/firebase";
import { useAuth } from "@/contexts/authContext";
import { generateAIRecommendations } from "@/utils/aiRecommendations";
import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import {
  addMonths,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
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

// --- Types ---

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

// Types for Special Module
type SpecialType = "home" | "travel" | "shared" | "bill";
type SpecialBudget = {
  id: string;
  name: string;
  type: SpecialType;
  limit: number;
  spent: number;
  createdAt?: any;
};

const BudgetPage = () => {
  const { user } = useAuth();

  // --- Tabs ---
  const [activeTab, setActiveTab] = useState<"budget" | "savings" | "special">(
    "budget"
  );

  // --- Standard Budget UI State ---
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingCategory, setEditingCategory] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("Food");
  const [dropdownItems, setDropdownItems] = useState(
    categoryList.map((c) => ({ label: c, value: c }))
  );

  // --- Special Budget UI State ---
  const [specialBudgets, setSpecialBudgets] = useState<SpecialBudget[]>([]);
  const [specialName, setSpecialName] = useState("");
  const [specialType, setSpecialType] = useState<SpecialType>("home");
  const [specialTypeOpen, setSpecialTypeOpen] = useState(false);
  const [specialTypeItems, setSpecialTypeItems] = useState([
    { label: "🏠 Home / Renovation", value: "home" },
    { label: "✈️ Travel / Trip", value: "travel" },
    { label: "👥 Shared Expense", value: "shared" },
    { label: "🧾 Bill Reminder", value: "bill" },
  ]);

  // --- NEW: Android-Compatible Update Modal State ---
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateTargetId, setUpdateTargetId] = useState<string | null>(null);
  const [updateCurrentSpent, setUpdateCurrentSpent] = useState(0);
  const [isAddingToSpent, setIsAddingToSpent] = useState(true); // true = Add, false = Set
  const [updateAmountStr, setUpdateAmountStr] = useState("");

  // --- Month selection ---
  const [selectedDate, setSelectedDate] = useState<Date>(
    startOfMonth(new Date())
  );
  const monthLabel = format(selectedDate, "MMMM yyyy");
  const monthKey = `${selectedDate.getFullYear()}-${String(
    selectedDate.getMonth() + 1
  ).padStart(2, "0")}`;

  // --- Data State ---
  const [loading, setLoading] = useState(true);
  const [monthlyTotals, setMonthlyTotals] = useState<CategoryTotals>({});
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([]);
  const [historicalData, setHistoricalData] = useState<CategoryTotals[]>([]);
  const [expandedRecs, setExpandedRecs] = useState<Set<string>>(new Set());

  // --- Savings State ---
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalTotals, setGoalTotals] = useState<GoalTotals>({});
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordGoalId, setRecordGoalId] = useState<string | null>(null);
  const [recordItems, setRecordItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [recordAmount, setRecordAmount] = useState("");
  const [underBudgetStreakMonths, setUnderBudgetStreakMonths] = useState<
    number | null
  >(null);
  const [weeklyStreakFire, setWeeklyStreakFire] = useState<number | null>(null);
  const [streakResetAt, setStreakResetAt] = useState<Date | null>(null);
  const [streakRestoresUsed, setStreakRestoresUsed] = useState<number>(0);
  const [isStreakBroken, setIsStreakBroken] = useState(false);

  // --- Helper Functions ---
  const getCurrentDayOfMonth = (): number => new Date().getDate();
  const getTotalDaysInMonth = (): number => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  };
  const monthProgress = (getCurrentDayOfMonth() / getTotalDaysInMonth()) * 100;

  // --- Effects: Standard Budget ---
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const expensesRef = collection(firestore, "users", uid, "expenses");
    setLoading(true);
    const unsub = onSnapshot(expensesRef, (snapshot) => {
      const totals: CategoryTotals = {};
      const last6MonthsData: CategoryTotals[] = [];
      for (let i = 5; i >= 0; i--) last6MonthsData.push({});

      snapshot.forEach((d) => {
        const data: any = d.data();
        const amt = Number(data?.amount);
        if (isNaN(amt)) return;
        let dt: Date | null = null;
        if (typeof data?.date === "string") {
          try {
            dt = parseISO(data.date);
          } catch {
            dt = null;
          }
        } else if (data?.date?.toDate) dt = data.date.toDate();
        else if (data?.date instanceof Date) dt = data.date;
        else if (data?.date) {
          try {
            dt = new Date(data.date);
          } catch {
            dt = null;
          }
        }
        if (!dt) return;

        const category = data.category || "Other";
        if (isSameMonth(dt, selectedDate)) {
          totals[category] = (totals[category] || 0) + amt;
        }
        for (let i = 0; i < 6; i++) {
          const checkDate = subMonths(selectedDate, i);
          if (isSameMonth(dt, checkDate)) {
            last6MonthsData[5 - i][category] =
              (last6MonthsData[5 - i][category] || 0) + amt;
          }
        }
      });
      setMonthlyTotals(totals);
      setHistoricalData(last6MonthsData);
      setLoading(false);
    });
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
    const unsub = onSnapshot(budgetRef, (snapshot) => {
      const limits: BudgetLimit[] = [];
      snapshot.forEach((d) => {
        const limitVal = Number(d.data()?.limit);
        if (!isNaN(limitVal)) limits.push({ category: d.id, limit: limitVal });
      });
      setBudgetLimits(limits);
    });
    return () => unsub();
  }, [user?.uid, monthKey]);

  // --- Effects: Special Budgets ---
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const q = query(
      collection(firestore, "users", uid, "special_budgets"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const arr: SpecialBudget[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        arr.push({
          id: d.id,
          name: data.name || "Unnamed",
          type: data.type || "home",
          limit: Number(data.limit) || 0,
          spent: Number(data.spent) || 0,
          createdAt: data.createdAt,
        });
      });
      setSpecialBudgets(arr);
    });
    return () => unsub();
  }, [user?.uid]);

  // --- Effects: Savings ---
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
        const s = await getDoc(
          doc(firestore, "users", uid, "stats", "summary")
        );
        if (s.exists()) {
          const d: any = s.data();
          if (typeof d?.underBudgetStreakMonths === "number")
            setUnderBudgetStreakMonths(d.underBudgetStreakMonths);
          if (typeof d?.weeklyStreakFire === "number")
            setWeeklyStreakFire(d.weeklyStreakFire);
          if (d?.streakResetAt) {
            const resetDate =
              d.streakResetAt.toDate?.() || new Date(d.streakResetAt);
            setStreakResetAt(resetDate);
          }
          if (typeof d?.streakRestoresUsed === "number")
            setStreakRestoresUsed(d.streakRestoresUsed);
          if (typeof d?.isStreakBroken === "boolean")
            setIsStreakBroken(d.isStreakBroken);
        }
      } catch {}
    })();

    return () => {
      unsubGoals();
      unsubRecs();
    };
  }, [user?.uid]);

  // --- Calculations ---
  const budgetData = useMemo(() => {
    return budgetLimits.map(({ category, limit }) => {
      const used = monthlyTotals[category] || 0;
      const percentage = limit > 0 ? (used / limit) * 100 : used > 0 ? 100 : 0;
      let color = "#22c55e";
      if (percentage >= 100) color = "#ef4444";
      else if (percentage >= 50) color = "#facc15";
      return {
        category,
        limit,
        used,
        percentage: Math.min(percentage, 100),
        color,
      };
    });
  }, [budgetLimits, monthlyTotals]);

  const getAIRecommendations = useMemo(() => {
    if (historicalData.length === 0 || budgetLimits.length === 0) return [];
    return generateAIRecommendations(
      budgetData,
      historicalData,
      monthlyTotals,
      budgetLimits
    );
  }, [budgetData, historicalData, monthlyTotals, budgetLimits]);

  // --- Handlers: Standard Budget ---
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
        doc(
          firestore,
          "users",
          uid,
          "budgets",
          monthKey,
          "categories",
          category
        ),
        { limit: limitNum }
      );
      resetModal();
    } catch (err) {
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
              doc(
                firestore,
                "users",
                uid,
                "budgets",
                monthKey,
                "categories",
                category
              )
            );
          } catch (e) {
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

  // --- Handlers: Special Budget ---
  const handleSaveSpecialBudget = async () => {
    const uid = user?.uid;
    if (!uid) return;
    if (!specialName.trim() || !newLimit) {
      Alert.alert("Missing Info", "Please enter a name and amount.");
      return;
    }
    const limitNum = parseFloat(newLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      Alert.alert("Invalid amount", "Enter a positive number.");
      return;
    }

    try {
      await addDoc(collection(firestore, "users", uid, "special_budgets"), {
        name: specialName.trim(),
        type: specialType,
        limit: limitNum,
        spent: 0,
        createdAt: serverTimestamp(),
      });
      resetModal();
    } catch (e) {
      Alert.alert("Error", "Failed to save special budget.");
    }
  };

  const handleDeleteSpecial = async (id: string) => {
    const uid = user?.uid;
    if (!uid) return;
    Alert.alert("Delete", "Remove this special budget?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(
              doc(firestore, "users", uid, "special_budgets", id)
            );
          } catch {
            Alert.alert("Error", "Failed to delete.");
          }
        },
      },
    ]);
  };

  // --- NEW: Trigger Android-Friendly Modal ---
  const openUpdateSpentModal = (
    id: string,
    currentSpent: number,
    add: boolean
  ) => {
    setUpdateTargetId(id);
    setUpdateCurrentSpent(currentSpent);
    setIsAddingToSpent(add);
    setUpdateAmountStr("");
    setShowUpdateModal(true);
  };

  // --- NEW: Handle Modal Submit ---
  const handleConfirmUpdateSpent = async () => {
    const uid = user?.uid;
    if (!uid || !updateTargetId) return;

    if (!updateAmountStr) {
      setShowUpdateModal(false);
      return;
    }

    const val = parseFloat(updateAmountStr);
    if (isNaN(val)) {
      Alert.alert("Error", "Please enter a valid number.");
      return;
    }

    const newTotal = isAddingToSpent ? updateCurrentSpent + val : val;

    try {
      await updateDoc(
        doc(firestore, "users", uid, "special_budgets", updateTargetId),
        {
          spent: newTotal,
        }
      );
      setShowUpdateModal(false);
      setUpdateAmountStr("");
    } catch (e) {
      Alert.alert("Error", "Failed to update amount.");
    }
  };

  // --- Handlers: Savings ---
  const handleAddGoal = async () => {
    const uid = user?.uid;
    if (!uid) return;
    const t = parseFloat(goalTarget);
    if (!goalName.trim() || isNaN(t) || t <= 0) {
      Alert.alert("Invalid input", "Provide a name and positive target.");
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

  const handleRestoreStreak = async () => {
    const uid = user?.uid;
    if (!uid || streakRestoresUsed >= 2) {
      Alert.alert("Restore Failed", "Max 2 restores used this month.");
      return;
    }
    Alert.alert(
      "Restore Fire Streak",
      `Are you sure? (${2 - streakRestoresUsed} left)`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            try {
              await setDoc(
                doc(firestore, "users", uid, "stats", "summary"),
                {
                  isStreakBroken: false,
                  streakRestoresUsed: streakRestoresUsed + 1,
                  streakResetAt: serverTimestamp(),
                },
                { merge: true }
              );
              setIsStreakBroken(false);
              setStreakRestoresUsed(streakRestoresUsed + 1);
              Alert.alert("Success", "Streak restored! 🔥");
            } catch (e) {
              Alert.alert("Error", "Failed to restore streak.");
            }
          },
        },
      ]
    );
  };

  // --- UI Helpers ---
  const resetModal = () => {
    setShowModal(false);
    setNewLimit("");
    setDropdownOpen(false);
    setEditMode(false);
    setEditingCategory("");
    setSpecialName("");
    setSpecialTypeOpen(false);
  };

  const getPriorityStyles = (priority: string) => {
    if (priority === "critical")
      return {
        container: "border-red-400 bg-red-50",
        badge: "bg-red-200",
        badgeText: "text-red-700",
        borderLeft: "border-l-4 border-l-red-500",
      };
    if (priority === "high")
      return {
        container: "border-orange-300 bg-orange-50",
        badge: "bg-orange-200",
        badgeText: "text-orange-700",
        borderLeft: "border-l-4 border-l-orange-500",
      };
    if (priority === "medium")
      return {
        container: "border-yellow-300 bg-yellow-50",
        badge: "bg-yellow-200",
        badgeText: "text-yellow-700",
        borderLeft: "border-l-4 border-l-yellow-500",
      };
    return {
      container: "border-green-300 bg-green-50",
      badge: "bg-green-200",
      badgeText: "text-green-700",
      borderLeft: "border-l-4 border-l-green-500",
    };
  };

  const getSpecialIcon = (type: SpecialType) => {
    switch (type) {
      case "home":
        return "home-city";
      case "travel":
        return "airplane";
      case "shared":
        return "account-group";
      case "bill":
        return "receipt";
      default:
        return "star";
    }
  };

  const getSpecialColor = (type: SpecialType) => {
    switch (type) {
      case "home":
        return "#0891b2";
      case "travel":
        return "#db2777";
      case "shared":
        return "#7c3aed";
      case "bill":
        return "#ea580c";
      default:
        return "#4b5563";
    }
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-8" nestedScrollEnabled>
      {/* Header + Tabs */}
      <View className="mt-3 mb-5">
        <Text className="text-4xl font-bold text-dark-100 mt-5 mb-1 text-center">
          Budgets
        </Text>
        <Text className="text-base text-dark-200 text-center">
          Setup your budgets and savings
        </Text>
        <View className="flex-row gap-x-2 mt-4 self-center flex-wrap justify-center">
          <TouchableOpacity
            onPress={() => setActiveTab("budget")}
            className={`px-4 py-2 rounded-xl border ${
              activeTab === "budget"
                ? "bg-violet-500 border-violet-500"
                : "bg-white border-violet-200"
            }`}
          >
            <Text
              className={`${
                activeTab === "budget" ? "text-white" : "text-violet-700"
              } font-semibold`}
            >
              📊 Budget
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("savings")}
            className={`px-4 py-2 rounded-xl border ${
              activeTab === "savings"
                ? "bg-pink-500 border-pink-500"
                : "bg-white border-pink-200"
            }`}
          >
            <Text
              className={`${
                activeTab === "savings" ? "text-white" : "text-pink-700"
              } font-semibold`}
            >
              🦁 Savings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("special")}
            className={`px-4 py-2 rounded-xl border ${
              activeTab === "special"
                ? "bg-cyan-500 border-cyan-500"
                : "bg-white border-cyan-200"
            }`}
          >
            <Text
              className={`${
                activeTab === "special" ? "text-white" : "text-cyan-700"
              } font-semibold`}
            >
              🚀 Special
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ==================== TAB 1: BUDGET ==================== */}
      {activeTab === "budget" && (
        <>
          {/* Month Navigation */}
          <View className="flex-row items-center justify-center mt-1 mb-6 gap-x-6">
            <TouchableOpacity
              onPress={() => setSelectedDate((d) => addMonths(d, -1))}
            >
              <AntDesign name="left-circle" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold">{monthLabel}</Text>
            <TouchableOpacity
              onPress={() => setSelectedDate((d) => addMonths(d, 1))}
            >
              <AntDesign name="right-circle" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Budget Items */}
          {loading && budgetLimits.length === 0 ? (
            <Text className="text-gray-500 text-center mt-4">Loading…</Text>
          ) : budgetData.length === 0 ? (
            <Text className="text-gray-500 text-center mt-4">
              No budgets set for this month.
            </Text>
          ) : (
            budgetData.map((b, idx) => (
              <View key={idx} className="mb-5">
                <View className="flex-row justify-between items-center mb-1">
                  <View>
                    <Text className="font-medium text-dark-100">
                      {b.category}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      RM{b.used.toFixed(2)} / RM{b.limit.toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row">
                    <TouchableOpacity
                      onPress={() => handleEditBudget(b.category, b.limit)}
                      className="mr-4"
                    >
                      <Feather name="edit" size={18} color="#4b5563" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteBudget(b.category)}
                    >
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
            ))
          )}

          {/* AI-Powered Smart Recommendations */}
          <View className="bg-gradient-to-br from-blue-50 to-indigo-50 mt-8 p-4 rounded-xl border-2 border-indigo-200">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1">
                <Text className="text-base font-bold text-indigo-700">
                  🤖 Smart Recommendations
                </Text>
                <Text className="text-xs text-indigo-600 mt-1">
                  Updated daily based on your spending pace
                </Text>
              </View>
              <View className="bg-indigo-200 px-3 py-2 rounded-full">
                <Text className="text-xs font-bold text-indigo-700">
                  {getAIRecommendations.length}
                </Text>
              </View>
            </View>

            {/* Progress indicator */}
            {isSameMonth(selectedDate, new Date()) && (
              <View className="bg-white rounded-lg p-3 mb-3 border border-indigo-100">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xs font-semibold text-gray-700">
                    Month Progress: {getCurrentDayOfMonth()}/
                    {getTotalDaysInMonth()} days
                  </Text>
                  <Text className="text-xs font-bold text-indigo-600">
                    {Math.round(monthProgress)}%
                  </Text>
                </View>
                <ProgressBar
                  progress={monthProgress / 100}
                  color="#4f46e5"
                  style={{ height: 6, borderRadius: 10 }}
                />
              </View>
            )}

            {getAIRecommendations.length > 0 ? (
              <ScrollView
                nestedScrollEnabled
                scrollEnabled={getAIRecommendations.length > 3}
                style={{ maxHeight: 500 }}
              >
                {getAIRecommendations.map((rec, idx) => {
                  const isExpanded = expandedRecs.has(`${rec.category}-${idx}`);
                  const styles = getPriorityStyles(rec.priority);

                  return (
                    <TouchableOpacity
                      key={`${rec.category}-${idx}`}
                      onPress={() => {
                        const newExpanded = new Set(expandedRecs);
                        if (isExpanded) {
                          newExpanded.delete(`${rec.category}-${idx}`);
                        } else {
                          newExpanded.add(`${rec.category}-${idx}`);
                        }
                        setExpandedRecs(newExpanded);
                      }}
                      className={`border rounded-lg p-3 mb-3 ${styles.container} ${styles.borderLeft}`}
                    >
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2 mb-2">
                            <Text className="font-bold text-sm text-gray-800 flex-1">
                              {rec.category}
                            </Text>
                            <View
                              className={`${styles.badge} px-2 py-1 rounded-full`}
                            >
                              <Text
                                className={`text-xs font-bold ${styles.badgeText}`}
                              >
                                {rec.priority.toUpperCase()}
                              </Text>
                            </View>
                          </View>

                          <Text className="text-sm text-gray-800 font-medium mb-2">
                            {rec.message}
                          </Text>

                          {/* Quick metrics (Restored) */}
                          {rec.daysRemaining !== undefined &&
                            rec.dailyRate !== undefined && (
                              <View className="flex-row gap-2 mb-2 bg-white/50 p-2 rounded-lg">
                                <View className="flex-1">
                                  <Text className="text-xs text-gray-600">
                                    Daily Rate
                                  </Text>
                                  <Text className="text-sm font-bold text-gray-800">
                                    RM{rec.dailyRate.toFixed(2)}/day
                                  </Text>
                                </View>
                                <View className="flex-1">
                                  <Text className="text-xs text-gray-600">
                                    Days Left
                                  </Text>
                                  <Text className="text-sm font-bold text-gray-800">
                                    {rec.daysRemaining} days
                                  </Text>
                                </View>
                                <View className="flex-1">
                                  <Text className="text-xs text-gray-600">
                                    Projected
                                  </Text>
                                  <Text className="text-sm font-bold text-gray-800">
                                    RM
                                    {rec.projectedTotal?.toFixed(2) || "—"}
                                  </Text>
                                </View>
                              </View>
                            )}

                          {isExpanded && (
                            <View className="mt-3 pt-3 border-t border-gray-300">
                              {rec.insight && (
                                <Text className="text-xs text-gray-700 mb-3">
                                  💭 {rec.insight}
                                </Text>
                              )}

                              {/* Recommended Actions (Restored) */}
                              {rec.actionItems &&
                                rec.actionItems.length > 0 && (
                                  <View className="bg-white/60 rounded-lg p-2 mb-3">
                                    <Text className="text-xs font-bold text-gray-700 mb-2">
                                      📋 Recommended Actions:
                                    </Text>
                                    {rec.actionItems.map(
                                      (action, actionIdx) => (
                                        <Text
                                          key={actionIdx}
                                          className="text-xs text-gray-700 mb-1"
                                        >
                                          • {action}
                                        </Text>
                                      )
                                    )}
                                  </View>
                                )}

                              {rec.suggestedLimit !== null &&
                                rec.suggestedLimit !== undefined && (
                                  <TouchableOpacity
                                    className="bg-indigo-600 rounded-lg py-2 px-3"
                                    onPress={() => {
                                      setNewLimit(
                                        rec.suggestedLimit!.toString()
                                      );
                                      setEditingCategory(rec.category);
                                      setEditMode(true);
                                      setShowModal(true);
                                    }}
                                  >
                                    <Text className="text-white text-xs font-bold text-center">
                                      💡 Apply Suggested Budget: RM
                                      {rec.suggestedLimit.toFixed(2)}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                            </View>
                          )}
                        </View>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={20}
                          color="#666"
                          style={{ marginLeft: 8 }}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View className="bg-white rounded-lg p-3 border border-green-200">
                <Text className="text-gray-700 text-sm font-medium mb-1">
                  ✅ All Clear!
                </Text>
                <Text className="text-gray-600 text-xs">
                  Your spending is on track across all categories.
                </Text>
              </View>
            )}
          </View>

          {/* Add Budget Button */}
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
        </>
      )}

      {/* ==================== TAB 2: SAVINGS ==================== */}
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
            <TouchableOpacity
              onPress={handleAddGoal}
              className="bg-pink-500 rounded-xl p-3"
            >
              <Text className="text-white text-center font-bold">Add Goal</Text>
            </TouchableOpacity>
          </View>

          {/* Record Saving */}
          <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-6">
            <Text className="text-base font-semibold mb-3">
              Record a Saving
            </Text>
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
            <TouchableOpacity
              onPress={handleAddSaving}
              className="bg-pink-500 rounded-xl p-3"
            >
              <Text className="text-white text-center font-bold">
                Add to Goal
              </Text>
            </TouchableOpacity>
          </View>

          {/* Goals list */}
          <View className="bg-green-50 rounded-2xl p-4 border border-green-100 mb-6">
            <Text className="text-base font-semibold mb-3">Your Goals</Text>
            {goals.length === 0 ? (
              <Text className="text-gray-500">
                No goals yet. Create one above.
              </Text>
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
            <Text className="text-base font-semibold mb-2">
              🏆 Savings Streaks
            </Text>
            <Text className="text-gray-700 mb-3">
              {typeof underBudgetStreakMonths === "number"
                ? `You've stayed under budget for ${underBudgetStreakMonths} month${
                    underBudgetStreakMonths === 1 ? "" : "s"
                  } in a row!`
                : "Keep tracking your savings—streaks will appear here once available."}
            </Text>
            <Text className="text-gray-700 font-semibold text-base">
              🔥 Weekly Savings Fire Streak
            </Text>
            <View className="flex-row items-center justify-between mb-2">
              <Text
                className={`text-3xl font-bold ${
                  isStreakBroken ? "text-red-500" : "text-orange-500"
                }`}
              >
                {typeof weeklyStreakFire === "number" ? weeklyStreakFire : 0}
              </Text>
              <Text className="text-gray-600 text-sm">+7 weekly</Text>
            </View>
            <ProgressBar
              progress={
                typeof weeklyStreakFire === "number"
                  ? Math.min((weeklyStreakFire % 70) / 70, 1)
                  : 0
              }
              color={isStreakBroken ? "#ef4444" : "#ff6b35"}
              style={{ height: 10, borderRadius: 10, marginVertical: 6 }}
            />
            <Text className="text-gray-500 text-xs mb-3">
              {typeof weeklyStreakFire === "number"
                ? `Level ${Math.floor(weeklyStreakFire / 70) + 1}: ${
                    70 - (weeklyStreakFire % 70)
                  } points to next level 🎯`
                : "Record weekly savings to start your fire streak! 🔥"}
            </Text>

            {isStreakBroken && (
              <View className="bg-red-100 rounded-lg p-2 mb-3">
                <Text className="text-red-700 text-xs font-semibold mb-1">
                  ⚠️ Your streak is broken!
                </Text>
              </View>
            )}

            {isStreakBroken && streakRestoresUsed < 2 && (
              <TouchableOpacity
                onPress={handleRestoreStreak}
                className="bg-orange-500 rounded-lg py-2 px-3"
              >
                <Text className="text-white font-bold text-center text-sm">
                  🔥 Restore Streak ({2 - streakRestoresUsed} left)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* ==================== TAB 3: SPECIAL ==================== */}
      {activeTab === "special" && (
        <>
          <View className="bg-cyan-50 rounded-xl p-4 mb-4 border border-cyan-100">
            <Text className="text-cyan-800 font-bold text-lg mb-1">
              🚀 Special Modules
            </Text>
            <Text className="text-cyan-700 text-sm">
              Track renovations, travel trips, shared bills, or large one-off
              expenses separately.
            </Text>
          </View>

          {specialBudgets.map((sb) => {
            const iconName = getSpecialIcon(sb.type);
            const color = getSpecialColor(sb.type);
            const percent = sb.limit > 0 ? (sb.spent / sb.limit) * 100 : 0;

            return (
              <View
                key={sb.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <View
                      style={{ backgroundColor: color }}
                      className="p-2 rounded-full"
                    >
                      <MaterialCommunityIcons
                        name={iconName}
                        size={20}
                        color="white"
                      />
                    </View>
                    <View>
                      <Text className="font-bold text-gray-800 text-base">
                        {sb.name}
                      </Text>
                      <Text className="text-xs text-gray-500 uppercase font-bold">
                        {sb.type}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteSpecial(sb.id)}>
                    <Feather name="trash-2" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row justify-between items-end mb-2">
                  <Text className="text-2xl font-bold text-gray-800">
                    RM{sb.spent.toFixed(2)}
                  </Text>
                  <Text className="text-gray-500 mb-1">
                    of RM{sb.limit.toFixed(2)}
                  </Text>
                </View>

                <ProgressBar
                  progress={Math.min(percent / 100, 1)}
                  color={color}
                  style={{ height: 8, borderRadius: 5 }}
                />

                <View className="flex-row mt-4 gap-3">
                  <TouchableOpacity
                    onPress={() => openUpdateSpentModal(sb.id, sb.spent, true)}
                    className="flex-1 bg-gray-50 border border-gray-200 py-2 rounded-lg items-center"
                  >
                    <Text className="text-gray-700 font-semibold text-xs">
                      + Add Expense
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => openUpdateSpentModal(sb.id, sb.spent, false)}
                    className="flex-1 bg-gray-50 border border-gray-200 py-2 rounded-lg items-center"
                  >
                    <Text className="text-gray-700 font-semibold text-xs">
                      ✎ Edit Total
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {specialBudgets.length === 0 && (
            <View className="items-center py-10">
              <MaterialCommunityIcons
                name="notebook-plus"
                size={48}
                color="#cbd5e1"
              />
              <Text className="text-gray-400 mt-2 text-center">
                No special budgets yet.
              </Text>
            </View>
          )}

          <TouchableOpacity
            className="border border-cyan-400 p-3 rounded-2xl items-center mt-4 mb-9 bg-cyan-50"
            onPress={() => {
              setSpecialName("");
              setNewLimit("");
              setSpecialType("home");
              setShowModal(true);
            }}
          >
            <Text className="text-cyan-700 font-bold text-lg">
              + New Special Budget
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* ==================== MAIN CONFIG MODAL ==================== */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View className="flex-1 justify-center items-center bg-black/50 px-5">
          <View className="bg-white w-full p-6 rounded-xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-dark-100">
                {activeTab === "special"
                  ? "New Special Project"
                  : editMode
                  ? "Edit Budget"
                  : "Add Budget"}
              </Text>
              <Pressable onPress={resetModal}>
                <Ionicons name="close" size={28} />
              </Pressable>
            </View>

            {activeTab === "special" ? (
              <>
                <Text className="mb-1 font-medium">Project Name</Text>
                <TextInput
                  value={specialName}
                  onChangeText={setSpecialName}
                  placeholder="e.g. Bali Trip 2026"
                  className="border border-gray-300 rounded-md px-3 py-2 mb-3"
                />
                <Text className="mb-1 font-medium">Type</Text>
                <DropDownPicker
                  listMode="SCROLLVIEW"
                  open={specialTypeOpen}
                  value={specialType}
                  items={specialTypeItems}
                  setOpen={setSpecialTypeOpen}
                  setValue={setSpecialType}
                  setItems={setSpecialTypeItems}
                  zIndex={2000}
                  style={{ borderColor: "#ccc", marginBottom: 12 }}
                  dropDownContainerStyle={{ zIndex: 2000 }}
                />
                <Text className="mb-1 font-medium z-[-1]">
                  Total Budget Limit
                </Text>
                <TextInput
                  value={newLimit}
                  onChangeText={setNewLimit}
                  keyboardType="numeric"
                  placeholder="RM 0.00"
                  className="border border-gray-300 rounded-md px-3 py-2 mb-4"
                />
                <TouchableOpacity
                  className="bg-cyan-500 rounded-md p-3"
                  onPress={handleSaveSpecialBudget}
                >
                  <Text className="text-white font-bold text-center">
                    Create Project
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
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
                <TouchableOpacity
                  className="bg-violet-500 rounded-md p-3"
                  onPress={handleSaveBudget}
                >
                  <Text className="text-white font-bold text-center">
                    {editMode ? "Update Budget" : "Save Budget"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ==================== ANDROID-COMPATIBLE UPDATE MODAL ==================== */}
      <Modal visible={showUpdateModal} animationType="fade" transparent>
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white w-full p-6 rounded-xl shadow-lg">
            <Text className="text-xl font-bold text-gray-800 mb-2">
              {isAddingToSpent ? "Add Expense" : "Update Total Spent"}
            </Text>
            <Text className="text-gray-500 mb-4 text-sm">
              {isAddingToSpent
                ? "Enter amount to add to current total:"
                : "Override total spent amount:"}
            </Text>

            <TextInput
              value={updateAmountStr}
              onChangeText={setUpdateAmountStr}
              keyboardType="numeric"
              placeholder="0.00"
              autoFocus={true}
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg mb-6 bg-gray-50"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowUpdateModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-lg"
              >
                <Text className="text-gray-700 font-bold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmUpdateSpent}
                className="flex-1 bg-cyan-600 py-3 rounded-lg"
              >
                <Text className="text-white font-bold text-center">
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default BudgetPage;