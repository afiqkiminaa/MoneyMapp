import { firestore } from "@/config/firebase";
import { useAuth } from "@/contexts/authContext";
import { parseISO } from "date-fns";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const categoryColors: { [key: string]: string } = {
  Food: "#b794f4",
  Rent: "#805ad5",
  Utilities: "#f6ad55",
  Transportation: "#48bb78",
  Entertainment: "#4299e1",
  Shopping: "#ed64a6",
  Health: "#f56565",
  Education: "#38b2ac",
  Travel: "#ed8936",
  Other: "#cbd5e0",
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const Analytics = () => {
  const { user } = useAuth();
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [chartType, setChartType] = useState<"donut" | "bar">("donut");

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = fetchCategoryData();
      return () => unsubscribe(); 
    }
  }, [user, selectedMonth]);

  const fetchCategoryData = () => {
    const uid = user?.uid;
    if (!uid) return () => {};

    const ref = collection(firestore, "users", uid, "expenses");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const categoryTotals: { [key: string]: number } = {};
      let total = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const date = parseISO(data.date);
        if (
          date.getMonth() === selectedMonth &&
          date.getFullYear() === currentYear
        ) {
          const amount = data.amount;
          const category = data.category || "Other";
          categoryTotals[category] = (categoryTotals[category] || 0) + amount;
          total += amount;
        }
      });

      setTotalSpent(total);

      const chartData = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([category, value]) => ({
          name: category, // only category name, no value
          amount: value,
          color: categoryColors[category] || "#ccc",
          legendFontColor: "#333",
          legendFontSize: 13,
        }));

      setCategoryData(chartData);
    });

    return unsubscribe;
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-8">
      <Text className="text-4xl font-bold text-dark-100 mt-5 mb-1 text-center">
        Spending Analytics
      </Text>
      <Text className="text-base text-dark-200 mb-4 text-center">
        Gain insights from your expenses
      </Text>

      {/* 📅 Month Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
      >
        {monthNames.map((month, index) => (
          <TouchableOpacity
            key={month}
            onPress={() => setSelectedMonth(index)}
            className={`px-3 py-2 mr-2 rounded-full border ${
              selectedMonth === index
                ? "bg-violet-500 border-violet-500"
                : "border-gray-300"
            }`}
          >
            <Text
              className={`text-sm ${
                selectedMonth === index ? "text-white" : "text-dark-100"
              }`}
            >
              {month}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text className="text-center text-dark-100 text-lg font-bold mb-1">
        Total Spent in {monthNames[selectedMonth]} {currentYear}
      </Text>
      <Text className="text-center text-violet-500 text-3xl font-extrabold mb-4">
        RM{totalSpent.toFixed(2)}
      </Text>

      {/* 🔁 Chart Toggle */}
      <View className="flex-row justify-center space-x-4 mb-4">
        <TouchableOpacity
          className={`px-4 py-2 rounded-full border ${
            chartType === "donut"
              ? "bg-violet-500 border-violet-500"
              : "border-gray-300"
          }`}
          onPress={() => setChartType("donut")}
        >
          <Text
            className={`text-sm ${
              chartType === "donut" ? "text-white" : "text-dark-100"
            }`}
          >
            Donut Chart
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`px-4 py-2 rounded-full border ${
            chartType === "bar"
              ? "bg-violet-500 border-violet-500"
              : "border-gray-300"
          }`}
          onPress={() => setChartType("bar")}
        >
          <Text
            className={`text-sm ${
              chartType === "bar" ? "text-white" : "text-dark-100"
            }`}
          >
            Bar Chart
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chart Display */}
      {categoryData.length > 0 &&
        (chartType === "donut" ? (
          <PieChart
            data={categoryData.map((item) => ({
              name: item.name, 
              population: item.amount, 
              color: item.color,
              legendFontColor: item.legendFontColor,
              legendFontSize: item.legendFontSize,
            }))}
            width={screenWidth - 30}
            height={240}
            chartConfig={{
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              color: () => "#333",
              labelColor: () => "#333",
            }}
            accessor="population"
            backgroundColor="transparent"
            center={[10, 0]}
            paddingLeft="16"
            absolute={false}
          />
        ) : (
          <BarChart
            data={{
              labels: categoryData.map((item) =>
                item.name.length > 8 ? item.name.slice(0, 6) + "…" : item.name
              ),
              datasets: [{ data: categoryData.map((item) => item.amount) }],
            }}
            width={screenWidth - 30}
            height={260}
            fromZero
            yAxisLabel=""
            yAxisSuffix="" 
            chartConfig={{
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 2,
              color: () => "#7c3aed",
              labelColor: () => "#333",
              style: {
                borderRadius: 16,
              },
              propsForBackgroundLines: {
                strokeDasharray: "",
              },
              propsForLabels: {
                fontSize: 11,
              },
            }}
            style={{ marginVertical: 8, borderRadius: 16 }}
            verticalLabelRotation={0}
            showValuesOnTopOfBars={false}
          />
        ))}

      {/* Category Breakdown */}
      <Text className="text-xl font-bold text-dark-100 mt-6 mb-2 ml-7">
        Category Breakdown
      </Text>
      {categoryData.map((item) => {
        const percentage = ((item.amount / totalSpent) * 100).toFixed(0);
        return (
          <View key={item.name} className="mb-4 ml-7 mr-7">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-base text-dark-100">{item.name}</Text>
              <Text className="text-base text-dark-100 font-bold">
                RM{item.amount.toFixed(2)}
              </Text>
            </View>
            <View className="w-full bg-gray-200 rounded-full h-2">
              <View
                style={
                  {
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  } as StyleProp<ViewStyle>
                }
                className="h-2 rounded-full"
              />
            </View>
            <Text className="text-sm text-gray-500 mt-1">
              {percentage}% of total
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

export default Analytics;
