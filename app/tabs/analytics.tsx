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
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { AntDesign } from "@expo/vector-icons";
import { addMonths, format, isSameMonth, parseISO as parseISODate, startOfMonth, subMonths } from "date-fns";

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
  const [nextMonthPrediction, setNextMonthPrediction] = useState(0);
  const [currentMonthPrediction, setCurrentMonthPrediction] = useState(0);
  const [monthlyHistoricalData, setMonthlyHistoricalData] = useState<number[]>(
    []
  );
  const [monthlyComparisonData, setMonthlyComparisonData] = useState<
    { month: string; amount: number }[]
  >([]);
  const [yearlyComparisonData, setYearlyComparisonData] = useState<
    { year: string; amount: number }[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<Date>(
    startOfMonth(new Date())
  );
  const [chartType, setChartType] = useState<"donut" | "line" | "comparison">(
    "donut"
  );

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();
  
  const isCurrentLatestMonth =
    selectedMonth === currentMonth &&
    selectedYear === currentYear;

  const monthLabel = format(selectedDate, "MMMM yyyy");

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = fetchAnalyticsData();
      return () => unsubscribe();
    }
  }, [user, selectedDate]);

  const fetchAnalyticsData = () => {
    const uid = user?.uid;
    if (!uid) return () => {};

    const ref = collection(firestore, "users", uid, "expenses");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const categoryTotals: { [key: string]: number } = {};
      let currentMonthTotal = 0;
      const monthlyTotals: { [key: string]: number } = {};

      // For monthly comparison - last 3 months before selected month + selected month
      const comparisonMonths: { month: number; year: number; key: string }[] = [];
      for (let i = 3; i >= 0; i--) {
        let month = selectedMonth - i;
        let year = selectedYear;

        while (month < 0) {
          month += 12;
          year -= 1;
        }

        const chartKey = `${year}-${month + 1}`;
        comparisonMonths.push({ month, year, key: chartKey });
        monthlyTotals[chartKey] = 0;
      }

      // For yearly comparison - last 3 years + current year
      const yearlyTotals: { [key: string]: number } = {};
      for (let i = 3; i >= 0; i--) {
        yearlyTotals[selectedYear - i] = 0;
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const date = parseISO(data.date);
        const amount = data.amount;
        const expenseMonth = date.getMonth();
        const expenseYear = date.getFullYear();

        const expenseKey = `${expenseYear}-${expenseMonth + 1}`;

        if (expenseMonth === selectedMonth && expenseYear === selectedYear) {
          const category = data.category || "Other";
          categoryTotals[category] = (categoryTotals[category] || 0) + amount;
          currentMonthTotal += amount;
        }

        if (monthlyTotals.hasOwnProperty(expenseKey)) {
          monthlyTotals[expenseKey] += amount;
        }

        if (yearlyTotals.hasOwnProperty(expenseYear)) {
          yearlyTotals[expenseYear] += amount;
        }
      });

      let nextPrediction = 0;
      let currentPrediction = 0;

      // Only calculate predictions if viewing current month
      if (isCurrentLatestMonth) {
        const pastThreeMonthsData = [
          { x: 1, y: monthlyTotals[comparisonMonths[0].key] },
          { x: 2, y: monthlyTotals[comparisonMonths[1].key] },
          { x: 3, y: monthlyTotals[comparisonMonths[2].key] },
        ];

        const monthsWithData = pastThreeMonthsData.filter((d) => d.y > 0);

        if (monthsWithData.length >= 2) {
          const { slope, intercept } =
            calculateLinearRegression(monthsWithData);
          // Current month projection (x = 3.5, halfway through month)
          const dayOfMonth = new Date().getDate();
          const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
          const monthProgress = dayOfMonth / daysInMonth;
          currentPrediction = Math.max(0, (slope * (3 + monthProgress) + intercept));
          // Next month prediction (x = 4)
          nextPrediction = Math.max(0, slope * 4 + intercept);
        } else if (monthsWithData.length === 1) {
          currentPrediction = monthsWithData[0].y;
          nextPrediction = monthsWithData[0].y;
        }
      }

      setNextMonthPrediction(nextPrediction);
      setCurrentMonthPrediction(currentPrediction);

      const chartAmounts = comparisonMonths.map((p) => monthlyTotals[p.key]);
      setMonthlyHistoricalData(chartAmounts);

      setTotalSpent(currentMonthTotal);

      // Prepare monthly comparison data
      const monthlyCompData = comparisonMonths.map((m) => ({
        month: `${monthNames[m.month].slice(0, 3)} '${m.year
          .toString()
          .slice(-2)}`,
        amount: monthlyTotals[m.key],
      }));
      setMonthlyComparisonData(monthlyCompData);

      // Prepare yearly comparison data
      const yearlyCompData = Object.entries(yearlyTotals)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .map(([year, amount]) => ({
          year: year,
          amount: amount,
        }));
      setYearlyComparisonData(yearlyCompData);

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
      let labelYear = selectedYear;
      while (monthIndex < 0) {
        monthIndex += 12;
        labelYear -= 1;
      }
      return monthNames[monthIndex % 12].slice(0, 3);
    })
    .concat(isCurrentLatestMonth && nextMonthPrediction > 0 ? ["NEXT"] : []);

  const lineChartData = {
    labels: chartLabels,
    datasets: [
      {
        data: monthlyHistoricalData,
        color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
        strokeWidth: 2,
      },
      ...(isCurrentLatestMonth && nextMonthPrediction > 0
        ? [
            {
              data: Array(safeNullArrayLength)
                .fill(null)
                .concat([
                  monthlyHistoricalData[historyLength - 1] || 0,
                  nextMonthPrediction,
                ]),
              color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
              strokeWidth: 2,
            },
          ]
        : []),
    ].filter((d) => d.data.length > 0),
  };

  // Monthly comparison chart data
  const monthlyComparisonChartData = {
    labels: monthlyComparisonData.map((d) => d.month),
    datasets: [
      {
        data: monthlyComparisonData.map((d) => d.amount),
      },
    ],
  };

  // Yearly comparison chart data
  const yearlyComparisonChartData = {
    labels: yearlyComparisonData.map((d) => d.year),
    datasets: [
      {
        data: yearlyComparisonData.map((d) => d.amount),
      },
    ],
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-8">
      <Text className="text-4xl font-bold text-dark-100 mt-5 mb-1 text-center">
        Spending Analytics
      </Text>
      <Text className="text-base text-dark-200 mb-6 text-center">
        Gain insights from your expenses
      </Text>

      {/* Month Navigation */}
      <View className="flex-row items-center justify-center mt-1 mb-6 gap-x-6">
        <TouchableOpacity
          onPress={() => setSelectedDate((d) => subMonths(d, 1))}
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

      <Text className="text-center text-dark-100 text-lg font-bold mb-1">
        Total Spent in {monthNames[selectedMonth]} {selectedYear}
      </Text>
      <Text className="text-center text-violet-500 text-3xl font-extrabold mb-4">
        RM{totalSpent.toFixed(2)}
      </Text>

      {isCurrentLatestMonth && nextMonthPrediction > 0 && (
        <View className="bg-orange-100 p-3 rounded-xl mb-6 border border-orange-300 mx-4">
          <Text className="text-sm font-semibold text-orange-700 text-center">
            🔮 Predicted Next Month's Spending (Linear Trend):
          </Text>
          <Text className="text-center text-orange-700 text-2xl font-extrabold">
            RM{nextMonthPrediction.toFixed(2)}
          </Text>
        </View>
      )}

      {isCurrentLatestMonth && (
        <View className="flex-row justify-center flex-wrap gap-2 mb-4">
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
          <TouchableOpacity
            className={`px-4 py-2 rounded-full border ${
              chartType === "comparison"
                ? "bg-violet-500 border-violet-500"
                : "border-gray-300"
            }`}
            onPress={() => setChartType("comparison")}
          >
            <Text
              className={`text-sm ${
                chartType === "comparison" ? "text-white" : "text-dark-100"
              }`}
            >
              Comparison Chart
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {chartType === "donut" && categoryData.length > 0 && (
        <>
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

          <Text className="text-xl font-bold text-dark-100 mt-6 mb-2 ml-7">
            Category Breakdown
          </Text>
          {categoryData.map((item) => {
            const percentage =
              totalSpent > 0
                ? ((item.amount / totalSpent) * 100).toFixed(0)
                : "0";
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
        </>
      )}

      {chartType === "line" && isCurrentLatestMonth && (
        <>
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

          {currentMonthPrediction > 0 && (
            <View className="bg-purple-50 rounded-xl p-4 border border-purple-200 mt-4">
              <Text className="text-sm font-semibold text-purple-800 mb-2">
                📊 Projected Spending for {monthNames[selectedMonth]}
              </Text>
              <Text className="text-2xl font-bold text-purple-700">
                RM{currentMonthPrediction.toFixed(2)}
              </Text>
              <Text className="text-xs text-purple-600 mt-2">
                Current: RM{totalSpent.toFixed(2)} | Remaining days projection based on spending trend
              </Text>
            </View>
          )}
        </>
      )}

      {chartType === "comparison" && isCurrentLatestMonth && (
        <View>
          <Text className="text-lg font-bold text-dark-100 mt-4 mb-4">
            Monthly Comparison (Last 3 Months)
          </Text>
          {monthlyComparisonData.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={monthlyComparisonChartData}
                width={screenWidth + 100}
                height={260}
                yAxisLabel="RM "
                yAxisSuffix=""
                chartConfig={{
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
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
              />
            </ScrollView>
          )}

          <Text className="text-lg font-bold text-dark-100 mt-6 mb-4">
            Yearly Comparison (Last 4 Years)
          </Text>
          {yearlyComparisonData.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={yearlyComparisonChartData}
                width={Math.max(screenWidth, 300)}
                height={260}
                yAxisLabel="RM "
                yAxisSuffix=""
                chartConfig={{
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
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
              />
            </ScrollView>
          )}
        </View>
      )}

      <View className="h-6" />
    </ScrollView>
  );
};

export default Analytics;