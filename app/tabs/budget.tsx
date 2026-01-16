import { firestore } from "@/config/firebase";
import { useAuth } from "@/contexts/authContext";
import { generateAIRecommendations, createMonthContext } from "@/utils/aiRecommendations";
import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5, 
} from "@expo/vector-icons";
import {
  addMonths,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  subMonths,
  isSameDay,
  subDays,
  differenceInDays,
  isValid,
  parse,
} from "date-fns";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
  limit: number; // Total Amount
  spent: number; // Collected Amount (for shared) or Paid Amount (for bill)
  debtors?: string[]; // List of unpaid people
  totalParticipants?: number; // To calculate split correctly even after people pay
  dueDate?: any; // For Bill Reminders
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
  
  // NEW: State for adding debtors during creation
  const [tempDebtorName, setTempDebtorName] = useState("");
  const [creationDebtorsList, setCreationDebtorsList] = useState<string[]>([]);
  
  // NEW: Bill Due Date State
  const [billDateInput, setBillDateInput] = useState(""); // YYYY-MM-DD string

  // --- Android-Compatible Update Modal State (Special Budget - Amounts) ---
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateTargetId, setUpdateTargetId] = useState<string | null>(null);
  const [updateCurrentSpent, setUpdateCurrentSpent] = useState(0);
  const [isAddingToSpent, setIsAddingToSpent] = useState(true); // true = Add, false = Set
  const [updateAmountStr, setUpdateAmountStr] = useState("");

  // --- NEW: Add Person Modal State (Special Budget - Existing) ---
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [addPersonTargetId, setAddPersonTargetId] = useState<string | null>(null);
  const [addPersonCurrentList, setAddPersonCurrentList] = useState<string[]>([]);
  const [addPersonTotalParticipants, setAddPersonTotalParticipants] = useState(0);
  const [newPersonName, setNewPersonName] = useState("");

  // --- Month selection ---
  const [selectedDate, setSelectedDate] = useState<Date>(
    startOfMonth(new Date())
  );
  const monthLabel = format(selectedDate, "MMMM yyyy");
  const monthKey = `${selectedDate.getFullYear()}-${String(
    selectedDate.getMonth() + 1
  ).padStart(2, "0")}`;

  const monthContext = useMemo(() => {
    return createMonthContext(selectedDate);
  }, [selectedDate]);

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

  // --- Savings Goal Edit State ---
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalNameStr, setEditGoalNameStr] = useState("");
  const [editGoalTargetStr, setEditGoalTargetStr] = useState("");
  
  // Gamification State
  const [underBudgetStreakMonths, setUnderBudgetStreakMonths] = useState<
    number | null
  >(null);
  const [weeklyStreakFire, setWeeklyStreakFire] = useState<number>(0); 
  const [streakResetAt, setStreakResetAt] = useState<Date | null>(null);
  const [streakRestoresUsed, setStreakRestoresUsed] = useState<number>(0);
  const [isStreakBroken, setIsStreakBroken] = useState(false);
  const [lastSavingDate, setLastSavingDate] = useState<Date | null>(null);

  // --- Helper Functions ---
  const getCurrentDayOfMonth = (): number => new Date().getDate();
  const getTotalDaysInMonth = (): number => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  };

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
          debtors: data.debtors || [], 
          totalParticipants: data.totalParticipants || (data.debtors ? data.debtors.length : 1), 
          dueDate: data.dueDate ? data.dueDate.toDate() : null, 
          createdAt: data.createdAt,
        });
      });
      setSpecialBudgets(arr);
    });
    return () => unsub();
  }, [user?.uid]);

  // --- Effects: Savings & Stats ---
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

    const statsRef = doc(firestore, "users", uid, "stats", "summary");
    const unsubStats = onSnapshot(statsRef, (s) => {
      if (s.exists()) {
        const d: any = s.data();
        if (typeof d?.underBudgetStreakMonths === "number")
          setUnderBudgetStreakMonths(d.underBudgetStreakMonths);
        if (typeof d?.weeklyStreakFire === "number")
          setWeeklyStreakFire(d.weeklyStreakFire);
        if (d?.streakResetAt) {
          const resetDate = d.streakResetAt.toDate?.() || new Date(d.streakResetAt);
          setStreakResetAt(resetDate);
        }
        if (typeof d?.streakRestoresUsed === "number")
          setStreakRestoresUsed(d.streakRestoresUsed);
        if (typeof d?.isStreakBroken === "boolean")
          setIsStreakBroken(d.isStreakBroken);
        if (d?.lastSavingDate) {
            setLastSavingDate(d.lastSavingDate.toDate());
        }
      }
    });

    return () => {
      unsubGoals();
      unsubRecs();
      unsubStats();
    };
  }, [user?.uid]);

  // --- Calculations ---
  const totalMonthlyBudget = useMemo(() => {
    return budgetLimits.reduce((acc, curr) => acc + curr.limit, 0);
  }, [budgetLimits]);

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
      budgetLimits,
      selectedDate
    );
  }, [budgetData, historicalData, monthlyTotals, budgetLimits, selectedDate]);

  const upcomingBills = useMemo(() => {
    return specialBudgets
        .filter(b => b.type === 'bill' && b.dueDate && b.spent < b.limit)
        .map(b => {
            const today = new Date();
            const daysLeft = differenceInDays(b.dueDate, today);
            return { ...b, daysLeft };
        })
        .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [specialBudgets]);

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
  
  // 1. Add Debtor to list during creation
  const handleAddDebtorToCreationList = () => {
    if (tempDebtorName.trim() === "") return;
    setCreationDebtorsList([...creationDebtorsList, tempDebtorName.trim()]);
    setTempDebtorName("");
  };

  const handleRemoveDebtorFromCreationList = (index: number) => {
    const newList = [...creationDebtorsList];
    newList.splice(index, 1);
    setCreationDebtorsList(newList);
  };

  // 2. Save new Special Budget
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

    let billDueTimestamp = null;
    if (specialType === 'bill' && billDateInput) {
        const parsedDate = parse(billDateInput, 'yyyy-MM-dd', new Date());
        if (isValid(parsedDate)) {
            billDueTimestamp = parsedDate;
        } else {
            Alert.alert("Invalid Date", "Please use YYYY-MM-DD format.");
            return;
        }
    }

    try {
      await addDoc(collection(firestore, "users", uid, "special_budgets"), {
        name: specialName.trim(),
        type: specialType,
        limit: limitNum,
        spent: 0,
        debtors: creationDebtorsList, 
        totalParticipants: creationDebtorsList.length > 0 ? creationDebtorsList.length : 1, 
        dueDate: billDueTimestamp, 
        createdAt: serverTimestamp(),
      });
      resetModal();
    } catch (e) {
      Alert.alert("Error", "Failed to save special budget.");
    }
  };

  // 3. Delete Special Budget
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

  // 4. Handle "Mark as Paid" (Auto-calculate Split)
  const handleMarkPersonPaid = async (budget: SpecialBudget, personName: string) => {
    const uid = user?.uid;
    if (!uid) return;

    // Calculate Split
    const totalPeople = budget.totalParticipants || 1;
    const shareAmount = budget.limit / totalPeople;

    Alert.alert(
      "Confirm Payment",
      `Has ${personName} paid their share of RM${shareAmount.toFixed(2)}?`,
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Paid", 
          onPress: async () => {
            try {
              const newDebtors = (budget.debtors || []).filter(name => name !== personName);
              // Automatically add their share to 'spent' (collected)
              const newSpent = budget.spent + shareAmount;

              await updateDoc(doc(firestore, "users", uid, "special_budgets", budget.id), {
                debtors: newDebtors,
                spent: newSpent 
              });
            } catch(e) {
              Alert.alert("Error", "Failed to update.");
            }
          }
        }
      ]
    );
  };

  // 5. Open "Add Person" modal for existing budget
  const openAddPersonModal = (id: string, currentDebtors: string[], currentTotalParticipants: number) => {
    setAddPersonTargetId(id);
    setAddPersonCurrentList(currentDebtors || []);
    setAddPersonTotalParticipants(currentTotalParticipants || 0);
    setNewPersonName("");
    setShowAddPersonModal(true);
  };

  // 6. Confirm adding person to existing budget
  const handleConfirmAddPerson = async () => {
    const uid = user?.uid;
    if (!uid || !addPersonTargetId || !newPersonName.trim()) return;

    try {
      const updatedList = [...addPersonCurrentList, newPersonName.trim()];
      const newTotalParticipants = addPersonTotalParticipants + 1;

      await updateDoc(doc(firestore, "users", uid, "special_budgets", addPersonTargetId), {
        debtors: updatedList,
        totalParticipants: newTotalParticipants
      });
      setShowAddPersonModal(false);
      setNewPersonName("");
    } catch (e) {
      Alert.alert("Error", "Failed to add person.");
    }
  };


  // --- Handlers: Modal Submit (Special Budget - Amount) ---
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

  // --- Handlers: Savings & Streak Logic ---
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

  const handleEditGoalInit = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setEditGoalNameStr(goal.name);
    setEditGoalTargetStr(goal.target.toString());
    setShowGoalModal(true);
  };

  const handleSaveGoalUpdate = async () => {
    const uid = user?.uid;
    if (!uid || !editingGoalId) return;

    const t = parseFloat(editGoalTargetStr);
    if (!editGoalNameStr.trim() || isNaN(t) || t <= 0) {
      Alert.alert("Invalid Input", "Please provide a valid name and target amount.");
      return;
    }

    try {
      await updateDoc(doc(firestore, "users", uid, "savings_goals", editingGoalId), {
        name: editGoalNameStr.trim(),
        target: t,
      });
      setShowGoalModal(false);
      setEditingGoalId(null);
    } catch (e) {
      Alert.alert("Error", "Failed to update goal.");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const uid = user?.uid;
    if (!uid) return;
    Alert.alert("Delete Goal", "Are you sure you want to delete this savings goal?", [
        { text: "Cancel", style: "cancel" },
        {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
                try {
                    await deleteDoc(doc(firestore, "users", uid, "savings_goals", id));
                } catch (e) {
                    Alert.alert("Error", "Failed to delete goal.");
                }
            }
        }
    ]);
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

      const now = new Date();
      let newStreak = weeklyStreakFire;
      let broken = false;

      if (!lastSavingDate) {
        newStreak = 1;
        Alert.alert("Streak Started! 🔥", "That's day 1! Keep it up.");
      } else {
        if (isSameDay(now, lastSavingDate)) {
             Alert.alert("Saved!", "You've already secured your streak for today! ✅");
        } else if (isSameDay(lastSavingDate, subDays(now, 1))) {
            newStreak = newStreak + 1;
             Alert.alert("Streak Increased! 🔥", `You are on a ${newStreak} day streak!`);
        } else {
             newStreak = 1;
             broken = true; 
             Alert.alert("Streak Reset", "You missed a day! Streak starts over at 1.");
        }
      }

      await setDoc(
        doc(firestore, "users", uid, "stats", "summary"), 
        {
           weeklyStreakFire: newStreak, 
           lastSavingDate: serverTimestamp(),
           isStreakBroken: broken ? true : false,
        },
        { merge: true }
      );

      setRecordAmount("");
    } catch (e) {
        console.error(e)
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
    // Reset Shared Expense State
    setTempDebtorName("");
    setCreationDebtorsList([]);
    // Reset Bill State
    setBillDateInput("");
  };

  const getRecommendationStyle = (type: string, priority: string) => {
    if (type === "smart_savings" || type === "positive_reinforcement") {
      return {
        container: "border-emerald-300 bg-emerald-50",
        badge: "bg-emerald-200",
        badgeText: "text-emerald-700",
        borderLeft: "border-l-4 border-l-emerald-500",
        iconColor: "#059669"
      };
    }
    if (type === "bill_alert" || type === "critical_alert" || priority === "critical") {
      return {
        container: "border-red-400 bg-red-50",
        badge: "bg-red-200",
        badgeText: "text-red-700",
        borderLeft: "border-l-4 border-l-red-500",
        iconColor: "#dc2626"
      };
    }
    if (priority === "high") {
      return {
        container: "border-orange-300 bg-orange-50",
        badge: "bg-orange-200",
        badgeText: "text-orange-700",
        borderLeft: "border-l-4 border-l-orange-500",
        iconColor: "#ea580c"
      };
    }
    return {
      container: "border-blue-300 bg-blue-50",
      badge: "bg-blue-200",
      badgeText: "text-blue-700",
      borderLeft: "border-l-4 border-l-blue-500",
      iconColor: "#2563eb"
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

  const streakLevel = Math.floor(weeklyStreakFire / 10) + 1; 
  const progressToNextLevel = (weeklyStreakFire % 10) / 10;
  const daysToNextLevel = 10 - (weeklyStreakFire % 10);
  const isSavedToday = lastSavingDate ? isSameDay(new Date(), lastSavingDate) : false;

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
          <View className="items-center mt-1 mb-6">
            <View className="flex-row items-center justify-center gap-x-6">
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
            {/* Total Budget Display */}
            <View className="bg-violet-50 mt-3 px-6 py-2 rounded-full border border-violet-100">
                <Text className="text-violet-800 font-bold text-lg">
                    RM {totalMonthlyBudget.toFixed(2)}
                    <Text className="text-sm font-normal text-violet-600"> Total Budget</Text>
                </Text>
            </View>
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

          {!monthContext.isCurrentMonth && (
            <View className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200 mb-4">
              <Text className="text-amber-800 font-bold text-base mb-1">
                📅 Historical View
              </Text>
              <Text className="text-amber-700 text-sm">
                Daily-based recommendations are only available for the current month.
                Switch to the current month to see real-time insights.
              </Text>
            </View>
          )}

          {/* AI Recommendations Section */}
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

            {monthContext.isCurrentMonth && (
              <View className="bg-white rounded-lg p-3 mb-3 border border-indigo-100">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xs font-semibold text-gray-700">
                    Month Progress: {monthContext.currentDayOfMonth}/{monthContext.totalDaysInMonth} days
                  </Text>
                  <Text className="text-xs font-bold text-indigo-600">
                    {Math.round(monthContext.dayProgress)}%
                  </Text>
                </View>
                <ProgressBar
                  progress={monthContext.dayProgress / 100}
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
                  const styles = getRecommendationStyle(rec.type, rec.priority);

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
                            <MaterialCommunityIcons 
                                name={rec.type === 'smart_savings' ? 'piggy-bank' : rec.type === 'positive_reinforcement' ? 'trophy' : 'alert-circle-outline'} 
                                size={20} 
                                color={styles.iconColor} 
                            />
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

                          {isExpanded && (
                            <View className="mt-3 pt-3 border-t border-gray-300">
                              {rec.insight && (
                                <Text className="text-xs text-gray-700 mb-3">
                                  💭 {rec.insight}
                                </Text>
                              )}
                               {rec.potentialSavings && (
                                   <TouchableOpacity
                                     className="bg-emerald-600 rounded-lg py-2 px-3 mt-2"
                                     onPress={() => {
                                        setActiveTab("savings");
                                        setRecordAmount(rec.potentialSavings!.toString());
                                        Alert.alert("Good Idea!", `Let's move that RM${rec.potentialSavings} to your savings goals.`);
                                     }}
                                   >
                                     <Text className="text-white text-xs font-bold text-center">
                                       💰 Move RM{rec.potentialSavings} to Savings
                                     </Text>
                                   </TouchableOpacity>
                               )}

                               {rec.suggestedLimit !== undefined && !rec.potentialSavings && (
                                   <TouchableOpacity
                                     className="bg-indigo-600 rounded-lg py-2 px-3 mt-2"
                                     onPress={() => {
                                        setNewLimit(rec.suggestedLimit!.toString());
                                        setEditingCategory(rec.category);
                                        setNewCategory(rec.category);
                                        setEditMode(rec.type !== "unbudgeted");
                                        setShowModal(true);
                                     }}
                                   >
                                     <Text className="text-white text-xs font-bold text-center">
                                        {rec.type === "unbudgeted" ? "➕ Create Budget" : "🔧 Adjust Budget Limit"}
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
                Add to Goal & Boost Streak 🔥
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
                    <View className="flex-row justify-between items-center">
                        <Text className="font-semibold text-dark-100 flex-1">
                          {g.name} - RM{saved.toFixed(0)} / RM{g.target.toFixed(0)}
                        </Text>
                        <View className="flex-row items-center gap-3">
                           <TouchableOpacity onPress={() => handleEditGoalInit(g)}>
                               <Feather name="edit" size={16} color="#4b5563" />
                           </TouchableOpacity>
                           <TouchableOpacity onPress={() => handleDeleteGoal(g.id)}>
                               <Feather name="trash-2" size={16} color="#dc2626" />
                           </TouchableOpacity>
                        </View>
                    </View>
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

          {/* STREAK SECTION */}
          <View className="bg-orange-50 rounded-2xl p-5 border border-orange-200 mb-10 shadow-sm">
             <View className="flex-row justify-between items-start mb-4">
                <View>
                    <Text className="text-xl font-bold text-orange-900">
                    🔥 Daily Savings Streak
                    </Text>
                    <Text className="text-orange-800/70 text-sm mt-1">
                    Save money daily to keep the fire burning!
                    </Text>
                </View>
                <View className="items-center">
                    {isSavedToday ? (
                        <View className="bg-green-100 px-2 py-1 rounded-md border border-green-200">
                            <Text className="text-green-700 font-bold text-xs">Saved Today ✅</Text>
                        </View>
                    ) : (
                        <View className="bg-gray-100 px-2 py-1 rounded-md border border-gray-300">
                            <Text className="text-gray-500 font-bold text-xs">Not Saved Yet</Text>
                        </View>
                    )}
                </View>
             </View>
            
            <View className="flex-row items-center justify-center gap-4 my-2">
                 <FontAwesome5 name="fire" size={32} color={isStreakBroken ? "#9ca3af" : "#ef4444"} />
                 <Text
                    className={`text-5xl font-black ${
                    isStreakBroken ? "text-gray-400" : "text-orange-600"
                    }`}
                >
                    {weeklyStreakFire}
                </Text>
                <View>
                     <Text className="text-lg font-bold text-orange-900">Days</Text>
                     <Text className="text-xs text-orange-800">in a row</Text>
                </View>
            </View>

            {/* Level System */}
            <View className="mt-4 bg-white/50 p-3 rounded-xl border border-orange-100">
                <View className="flex-row justify-between mb-2">
                    <Text className="text-orange-800 font-bold text-xs">Rank: Level {streakLevel}</Text>
                    <Text className="text-orange-800 font-bold text-xs">{daysToNextLevel} days to Level {streakLevel + 1} 🎯</Text>
                </View>
                <ProgressBar
                progress={progressToNextLevel}
                color={isStreakBroken ? "#ef4444" : "#ff6b35"}
                style={{ height: 12, borderRadius: 10 }}
                />
            </View>

            {isStreakBroken && (
              <View className="bg-red-100 rounded-lg p-3 mt-4 border border-red-200">
                <Text className="text-red-700 text-sm font-bold text-center mb-1">
                  ⚠️ Oh no! Your streak is broken!
                </Text>
                <Text className="text-red-600 text-xs text-center">
                    You missed a day of saving.
                </Text>
              </View>
            )}

            {isStreakBroken && streakRestoresUsed < 2 && (
              <TouchableOpacity
                onPress={handleRestoreStreak}
                className="bg-orange-500 rounded-xl py-3 px-3 mt-3 shadow-sm"
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
              🚀 Special Budgeting
            </Text>
            <Text className="text-cyan-700 text-sm">
              Track renovations, travel trips, shared bills, or large one-off
              expenses separately.
            </Text>
          </View>

          {/* Bill Alerts Summary */}
          {upcomingBills.length > 0 && (
            <View className="bg-red-50 rounded-xl p-3 mb-4 border border-red-200 flex-row items-center gap-3">
               <MaterialCommunityIcons name="bell-ring" size={24} color="#dc2626" />
               <View className="flex-1">
                  <Text className="text-red-800 font-bold">🔔 Bill Alerts</Text>
                  <Text className="text-red-700 text-xs">
                    You have {upcomingBills.length} bill(s) due soon or overdue! Check below.
                  </Text>
               </View>
            </View>
          )}

          {specialBudgets.map((sb) => {
            const iconName = getSpecialIcon(sb.type);
            const color = getSpecialColor(sb.type);
            const percent = sb.limit > 0 ? (sb.spent / sb.limit) * 100 : 0;

            // Bill specific logic
            const isBill = sb.type === 'bill';
            let dueDateText = "";
            let isOverdue = false;
            let isDueSoon = false;

            if(isBill && sb.dueDate) {
                const today = new Date();
                const due = new Date(sb.dueDate);
                dueDateText = format(due, "dd MMM yyyy");
                
                // If not fully paid
                if (sb.spent < sb.limit) {
                    if (differenceInDays(due, today) < 0) isOverdue = true;
                    else if (differenceInDays(due, today) <= 3) isDueSoon = true;
                }
            }

            return (
              <View
                key={sb.id}
                className={`bg-white rounded-2xl p-4 border shadow-sm mb-4 ${
                    isOverdue ? "border-red-400 bg-red-50" : isDueSoon ? "border-orange-400 bg-orange-50" : "border-gray-100"
                }`}
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

                {/* Bill Warning UI */}
                {isBill && sb.dueDate && (
                    <View className="flex-row items-center mb-2">
                        <Text className={`text-xs font-bold ${isOverdue ? "text-red-600" : isDueSoon ? "text-orange-600" : "text-gray-500"}`}>
                            Due Date: {dueDateText}
                        </Text>
                        {isOverdue && <Text className="ml-2 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">OVERDUE</Text>}
                        {isDueSoon && <Text className="ml-2 text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">DUE SOON</Text>}
                    </View>
                )}

                {/* Shared Expense Specific UI */}
                {sb.type === 'shared' && (
                    <View className="my-3 bg-purple-50 p-3 rounded-lg border border-purple-100">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-purple-800 text-xs font-bold uppercase">
                                Waiting for Payment
                            </Text>
                            <TouchableOpacity onPress={() => openAddPersonModal(sb.id, sb.debtors || [], sb.totalParticipants || 1)}>
                                <Text className="text-purple-600 text-xs font-bold">+ Add Person</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {(sb.debtors && sb.debtors.length > 0) ? (
                            <View className="flex-col gap-2">
                                <Text className="text-purple-600 text-xs mb-1">
                                    Each person owes: <Text className="font-bold">RM{(sb.limit / (sb.totalParticipants || 1)).toFixed(2)}</Text>
                                </Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {sb.debtors.map((person, idx) => (
                                        <TouchableOpacity 
                                            key={idx}
                                            onPress={() => handleMarkPersonPaid(sb, person)}
                                            className="bg-white border border-purple-200 px-3 py-1.5 rounded-full flex-row items-center shadow-sm"
                                        >
                                            <Text className="text-purple-700 text-xs font-bold mr-1">{person}</Text>
                                            <View className="bg-purple-100 rounded-full p-1 ml-1">
                                                 <FontAwesome5 name="check" size={8} color="#7c3aed" />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ) : (
                            <Text className="text-gray-400 text-xs italic">Everyone has paid! (or list is empty)</Text>
                        )}
                    </View>
                )}

                <View className="flex-row justify-between items-end mb-2">
                  <Text className="text-2xl font-bold text-gray-800">
                    RM{sb.spent.toFixed(2)}
                  </Text>
                  <Text className="text-gray-500 mb-1">
                    {sb.type === 'shared' ? 'collected of' : isBill ? 'paid of' : 'spent of'} RM{sb.limit.toFixed(2)}
                  </Text>
                </View>

                <ProgressBar
                  progress={Math.min(percent / 100, 1)}
                  color={isOverdue ? "#dc2626" : color}
                  style={{ height: 8, borderRadius: 5 }}
                />

                {/* Hide buttons if Shared Expense to avoid conflict with "Mark Paid" logic */}
                {sb.type !== 'shared' && (
                    <View className="flex-row mt-4 gap-3">
                    <TouchableOpacity
                        onPress={() => openUpdateSpentModal(sb.id, sb.spent, true)}
                        className="flex-1 bg-gray-50 border border-gray-200 py-2 rounded-lg items-center"
                    >
                        <Text className="text-gray-700 font-semibold text-xs">
                        + {sb.type === 'bill' ? 'Pay Bill' : 'Add Expense'}
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
                )}
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
                  placeholder={specialType === 'bill' ? "e.g. TNB Bill" : "e.g. Bali Trip 2026"}
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

                {/* Bill Date Picker */}
                {specialType === 'bill' && (
                    <View className="mb-4">
                        <Text className="mb-1 font-medium text-orange-700">Due Date (YYYY-MM-DD)</Text>
                        <TextInput
                            value={billDateInput}
                            onChangeText={setBillDateInput}
                            placeholder="2026-12-31"
                            keyboardType="numbers-and-punctuation"
                            className="border border-orange-300 bg-orange-50 rounded-md px-3 py-2"
                        />
                    </View>
                )}

                {/* Shared Expense Specific: Add People Immediately */}
                {specialType === 'shared' && (
                    <View className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <Text className="font-semibold text-gray-700 mb-2 text-xs uppercase">Shared With (List Names)</Text>
                        <View className="flex-row gap-2 mb-2">
                             <TextInput 
                                value={tempDebtorName}
                                onChangeText={setTempDebtorName}
                                placeholder="Person Name"
                                className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                             />
                             <TouchableOpacity onPress={handleAddDebtorToCreationList} className="bg-purple-500 px-3 py-1 rounded justify-center">
                                 <Text className="text-white font-bold text-xs">Add</Text>
                             </TouchableOpacity>
                        </View>
                        {creationDebtorsList.length > 0 && (
                            <View className="flex-row flex-wrap gap-2 mt-1">
                                {creationDebtorsList.map((name, idx) => (
                                    <View key={idx} className="bg-purple-100 px-2 py-1 rounded-md flex-row items-center">
                                        <Text className="text-purple-800 text-xs mr-1">{name}</Text>
                                        <TouchableOpacity onPress={() => handleRemoveDebtorFromCreationList(idx)}>
                                            <Ionicons name="close" size={12} color="#6b21a8" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                <Text className="mb-1 font-medium z-[-1]">
                  Total Amount / Limit
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
                    Create {specialType === 'bill' ? "Bill" : "Project"}
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

      {/* ==================== ANDROID-COMPATIBLE UPDATE MODAL (Special - Amount) ==================== */}
      <Modal visible={showUpdateModal} animationType="fade" transparent>
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white w-full p-6 rounded-xl shadow-lg">
            <Text className="text-xl font-bold text-gray-800 mb-2">
              {isAddingToSpent ? "Add Expense / Payment" : "Update Total Spent"}
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
      
      {/* ==================== ADD PERSON MODAL (Shared Expense) ==================== */}
      <Modal visible={showAddPersonModal} animationType="fade" transparent>
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white w-full p-6 rounded-xl shadow-lg">
            <Text className="text-xl font-bold text-gray-800 mb-2">
              Add Person to Shared Expense
            </Text>
            <Text className="text-gray-500 mb-4 text-sm">
              Who else shares this expense?
            </Text>

            <TextInput
              value={newPersonName}
              onChangeText={setNewPersonName}
              placeholder="Name (e.g. Sarah)"
              autoFocus={true}
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg mb-6 bg-gray-50"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowAddPersonModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-lg"
              >
                <Text className="text-gray-700 font-bold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmAddPerson}
                className="flex-1 bg-purple-600 py-3 rounded-lg"
              >
                <Text className="text-white font-bold text-center">
                  Add Person
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== GOAL EDIT MODAL ==================== */}
      <Modal visible={showGoalModal} animationType="fade" transparent>
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <View className="bg-white w-full p-6 rounded-xl shadow-lg">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Edit Goal
            </Text>
            
            <Text className="mb-1 font-medium text-gray-700">Goal Name</Text>
            <TextInput
              value={editGoalNameStr}
              onChangeText={setEditGoalNameStr}
              placeholder="Goal Name"
              className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
            />

            <Text className="mb-1 font-medium text-gray-700">Target Amount</Text>
            <TextInput
              value={editGoalTargetStr}
              onChangeText={setEditGoalTargetStr}
              keyboardType="numeric"
              placeholder="0.00"
              className="border border-gray-300 rounded-lg px-3 py-2 mb-6"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowGoalModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-lg"
              >
                <Text className="text-gray-700 font-bold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveGoalUpdate}
                className="flex-1 bg-pink-500 py-3 rounded-lg"
              >
                <Text className="text-white font-bold text-center">
                  Save Changes
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