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
import { LineChart, PieChart } from "react-native-chart-kit";

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

const calculateLinearRegression = (data: { x: number; y: number }[]) => {
  const N = data.length;
  if (N < 2) return { slope: 0, intercept: 0 };

  const sumX = data.reduce((sum, d) => sum + d.x, 0);
  const sumY = data.reduce((sum, d) => sum + d.y, 0);
  const sumXX = data.reduce((sum, d) => sum + d.x * d.x, 0);
  const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);

  const slope = (N * sumXY - sumX * sumY) / (N * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / N;

  return { slope, intercept };
};

const Analytics = () => {
  const { user } = useAuth();
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [predictedSpending, setPredictedSpending] = useState(0);
  const [monthlyHistoricalData, setMonthlyHistoricalData] = useState<number[]>(
    []
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [chartType, setChartType] = useState<"donut" | "line">("donut");

  const currentYear = new Date().getFullYear();
  const isCurrentLatestMonth =
    selectedMonth === new Date().getMonth() &&
    currentYear === new Date().getFullYear();

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = fetchAnalyticsData();
      return () => unsubscribe();
    }
  }, [user, selectedMonth]);

  const fetchAnalyticsData = () => {
    const uid = user?.uid;
    if (!uid) return () => {};

    const ref = collection(firestore, "users", uid, "expenses");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const categoryTotals: { [key: string]: number } = {};
      let currentMonthTotal = 0;
      const monthlyTotals: { [key: string]: number } = {};

      const chartPoints: { month: number; year: number; key: string }[] = [];

      for (let i = 3; i >= 0; i--) {
        let month = selectedMonth - i;
        let year = currentYear;

        while (month < 0) {
          month += 12;
          year -= 1;
        }

        const chartKey = `${year}-${month + 1}`;
        chartPoints.push({ month, year, key: chartKey });
        monthlyTotals[chartKey] = 0;
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const date = parseISO(data.date);
        const amount = data.amount;
        const expenseMonth = date.getMonth();
        const expenseYear = date.getFullYear();

        const expenseKey = `${expenseYear}-${expenseMonth + 1}`;

        if (expenseMonth === selectedMonth && expenseYear === currentYear) {
          const category = data.category || "Other";
          categoryTotals[category] = (categoryTotals[category] || 0) + amount;
          currentMonthTotal += amount;
        }

        if (monthlyTotals.hasOwnProperty(expenseKey)) {
          monthlyTotals[expenseKey] += amount;
        }
      });

      let prediction = 0;
      if (isCurrentLatestMonth) {
        // Use the same monthlyTotals data for prediction (M-3, M-2, M-1)
        const pastThreeMonthsData = [
          { x: 1, y: monthlyTotals[chartPoints[0].key] }, // M-3
          { x: 2, y: monthlyTotals[chartPoints[1].key] }, // M-2
          { x: 3, y: monthlyTotals[chartPoints[2].key] }, // M-1
        ];

        const monthsWithData = pastThreeMonthsData.filter((d) => d.y > 0);

        if (monthsWithData.length >= 2) {
          const { slope, intercept } =
            calculateLinearRegression(monthsWithData);
          prediction = Math.max(0, slope * 4 + intercept);
        } else if (monthsWithData.length === 1) {
          prediction = monthsWithData[0].y;
        }
      }
      setPredictedSpending(prediction);

      const chartAmounts = chartPoints.map((p) => monthlyTotals[p.key]);
      setMonthlyHistoricalData(chartAmounts);

      setTotalSpent(currentMonthTotal);

      const chartData = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([category, value]) => ({
          name: category,
          amount: value,
          color: categoryColors[category] || "#ccc",
          legendFontColor: "#333",
          legendFontSize: 13,
        }));

      setCategoryData(chartData);
    });

    return unsubscribe;
  };

  const historyLength = monthlyHistoricalData.length;
  const safeNullArrayLength = historyLength > 0 ? historyLength - 1 : 0;

  const chartLabels = monthlyHistoricalData
    .map((_, index) => {
      let monthIndex = selectedMonth - (historyLength - 1 - index);
      while (monthIndex < 0) {
        monthIndex += 12;
      }
      return monthNames[monthIndex % 12].slice(0, 3);
    })
    .concat(isCurrentLatestMonth && predictedSpending > 0 ? ["NEXT"] : []);

  const lineChartData = {
    labels: chartLabels,
    datasets: [
      {
        data: monthlyHistoricalData,
        color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
        strokeWidth: 2,
      },
      ...(isCurrentLatestMonth && predictedSpending > 0
        ? [
            {
              data: Array(safeNullArrayLength)
                .fill(null)
                .concat([
                  monthlyHistoricalData[historyLength - 1] || 0,
                  predictedSpending,
                ]),
              color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
              strokeWidth: 2,
            },
          ]
        : []),
    ].filter((d) => d.data.length > 0),
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-8">
      <Text className="text-4xl font-bold text-dark-100 mt-5 mb-1 text-center">
        Spending Analytics
      </Text>
      <Text className="text-base text-dark-200 mb-4 text-center">
        Gain insights from your expenses
      </Text>

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

      {isCurrentLatestMonth && predictedSpending > 0 && (
        <View className="bg-orange-100 p-3 rounded-xl mb-6 border border-orange-300 mx-4">
          <Text className="text-sm font-semibold text-orange-700 text-center">
            🔮 Predicted Next Month's Spending (Linear Trend):
          </Text>
          <Text className="text-center text-orange-700 text-2xl font-extrabold">
            RM{predictedSpending.toFixed(2)}
          </Text>
        </View>
      )}

      {isCurrentLatestMonth && (
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
              chartType === "line"
                ? "bg-violet-500 border-violet-500"
                : "border-gray-300"
            }`}
            onPress={() => setChartType("line")}
          >
            <Text
              className={`text-sm ${
                chartType === "line" ? "text-white" : "text-dark-100"
              }`}
            >
              Trend Line Chart
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {categoryData.length > 0 &&
        (chartType === "donut" || !isCurrentLatestMonth ? (
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={lineChartData}
              width={screenWidth}
              height={260}
              yAxisLabel="RM "
              yAxisSuffix=""
              chartConfig={{
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: "#7c3aed",
                },
                propsForBackgroundLines: {
                  strokeDasharray: "",
                },
                formatYLabel: (value: string) => {
                  const numValue = parseInt(value);
                  if (numValue >= 1000) {
                    return `${(numValue / 1000).toFixed(1)}k`;
                  }
                  return `${numValue}`;
                },
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              bezier
            />
          </ScrollView>
        ))}

      <Text className="text-xl font-bold text-dark-100 mt-6 mb-2 ml-7">
        Category Breakdown
      </Text>
      {categoryData.map((item) => {
        const percentage =
          totalSpent > 0 ? ((item.amount / totalSpent) * 100).toFixed(0) : "0";
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
