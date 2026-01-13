import { firestore } from "@/config/firebase";
import { useAuth } from "@/contexts/authContext";
import { useFocusEffect } from "@react-navigation/native";
import { format, parseISO } from "date-fns";
import { collection, getDocs, doc, getDoc } from "firebase/firestore"; // Added doc, getDoc
import React, { useCallback, useState, useEffect } from "react"; // Added useEffect
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

// Emoji icons for categories
const categoryIcons: { [key: string]: string } = {
  Food: "🍔",
  Rent: "🏠",
  Utilities: "⚡",
  Transportation: "🚗",
  Entertainment: "🎵",
  Shopping: "🛒",
  Health: "💊",
  Education: "🎓",
  Travel: "✈️",
  Other: "💸",
};

const Home = () => {
  const { user } = useAuth();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [recurringTotal, setRecurringTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState(""); // State for user name

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Dynamic greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // FIX: Fetch User Name from Firestore
  useFocusEffect(
    useCallback(() => {
      const fetchUserName = async () => {
        if (user?.uid) {
          try {
            const userDocRef = doc(firestore, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const data = userDocSnap.data();
              setUserName(data.name || user.displayName || "User");
            } else {
              setUserName(user.displayName || "User");
            }
          } catch (error) {
            console.log("Error fetching user name:", error);
            setUserName(user.displayName || "User");
          }
        }
      };

      fetchUserName();
    }, [user])
  );

  // Auto-refresh expenses when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchExpenses();
      }
    }, [selectedMonth, selectedYear, user])
  );

  const fetchExpenses = async () => {
    const uid = user?.uid;
    if (!uid) return;

    try {
      setLoading(true);
      const ref = collection(firestore, "users", uid, "expenses");
      const snapshot = await getDocs(ref);

      let monthly: any[] = [];
      let totalAmt = 0;
      let recurringAmt = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const expenseDate = parseISO(data.date);

        if (
          expenseDate.getFullYear() === selectedYear &&
          expenseDate.getMonth() === selectedMonth
        ) {
          monthly.push({ ...data, id: doc.id });
          totalAmt += data.amount;
          if (data.isRecurring) recurringAmt += data.amount;
        }
      });

      setExpenses(
        monthly.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
      setTotal(totalAmt);
      setRecurringTotal(recurringAmt);
    } catch (err) {
      console.error("Error loading expenses: ", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-8">
      {/* Dynamic Greeting */}
      <Text className="text-4xl font-bold text-dark-100 mt-5 mb-1 text-center">
        {/* FIX: Display fetched userName */}
        {getGreeting()}, {userName || "User"} 
      </Text>
      <Text className="text-base text-dark-200 mb-4 text-center">
        Let's manage your money
      </Text>

      {/* Header: Month & Summary */}
      <View className="bg-violet-400 rounded-2xl p-4 mb-6">
        <Text className="text-white text-sm mb-2">
          {format(new Date(selectedYear, selectedMonth), "MMMM yyyy")}
        </Text>
        <Text className="text-white text-3xl font-extrabold">
          RM{total.toFixed(2)}{" "}
          <Text className="text-base font-medium">spent</Text>
        </Text>

        <View className="flex-row justify-between mt-4 gap-x-3">
          <View className="flex-1 bg-white/20 rounded-xl px-4 py-3">
            <Text className="text-white text-sm opacity-90 mb-1">
              Recurring
            </Text>
            <Text className="text-white text-xl font-bold">
              RM{recurringTotal.toFixed(2)}
            </Text>
          </View>
          <View className="flex-1 bg-white/20 rounded-xl px-4 py-3">
            <Text className="text-white text-sm opacity-90 mb-1">
              Daily Avg
            </Text>
            <Text className="text-white text-xl font-bold">
              RM{(total / 30).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Expenses */}
      <Text className="text-dark-100 text-lg font-bold mb-2">
        Expenses in {format(new Date(selectedYear, selectedMonth), "MMMM")}
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#7c3aed" />
      ) : expenses.length === 0 ? (
        <Text className="text-gray-500 text-center mt-4">
          No expenses found.
        </Text>
      ) : (
        expenses.map((item) => (
          <View
            key={item.id}
            className="flex-row justify-between items-center border-b border-gray-200 py-3"
          >
            <View className="flex-row items-center space-x-3">
              <Text className="text-xl">
                {categoryIcons[item.category] || "💸"}
              </Text>
              <View>
                <Text className="text-dark-100 font-medium">
                  {item.category}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {format(new Date(item.date), "MMM d")}
                </Text>
              </View>
            </View>

            <View className="items-end">
              <Text className="text-dark-100 font-bold">
                RM{item.amount.toFixed(2)}
              </Text>
              {item.isRecurring && (
                <Text className="text-xs text-violet-500 mt-1">Recurring</Text>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

export default Home;