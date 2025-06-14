import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';  // Import Link from expo-router
import Ionicons from 'react-native-vector-icons/Ionicons'; // Import Ionicons

const Index = () => {
  return (
    <View className="flex-1 bg-light-100">
      {/* Hero Section */}
      <View className="bg-primary text-white py-12 px-6 flex-1 justify-center">
        <View className="max-w-md mx-auto text-center">
          <Text className="text-5xl text-white font-extrabold mb-4 text-center">MoneyMap</Text>
          <Text className="text-lg text-white mb-6 opacity-90 text-center">
            Your smart financial companion for tracking expenses and achieving goals
          </Text>
          <View className="space-y-6 mt-8">
            {/* Log In Button */}
            <Link
              href="/login"  // Link to the Login page (path will be based on your project structure)
              className="bg-white text-primary font-semibold py-3 px-6 rounded-lg shadow-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              <Text className="text-primary text-center">Log In <Ionicons name="arrow-forward" size={16} className="ml-2" /></Text>
            </Link>

            {/* Create Account Button */}
            <Link
              href="/register"  // Link to the Register page
              className="bg-secondary text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center mt-4"
            >
              <Text className="text-white text-center">Create Account</Text>
            </Link>
          </View>
        </View>
      </View>

      {/* Features Section */}
      <View className="bg-white py-16 px-6">
        <View className="max-w-3xl mx-auto">
          <Text className="text-3xl font-bold text-center mb-7">Smart Expense Tracker & Financial Budgeting</Text>

          <View className="space-y-8">
            <View className="flex flex-row items-start space-x-6">
              <View className="bg-primary/10 p-6 rounded-full">
                <Ionicons name="stats-chart" size={28} color="#7A4DFF" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-xl mb-2">Track Expenses</Text>
                <Text className="text-gray-700 text-sm">
                  Easily log and categorize your daily spending with intuitive tools
                </Text>
              </View>
            </View>

            <View className="flex flex-row items-start space-x-6">
              <View className="bg-primary/10 p-6 rounded-full">
                <Ionicons name="cash" size={28} color="#7A4DFF" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-xl mb-2">Budget Planning</Text>
                <Text className="text-gray-700 text-sm">
                  Set monthly budgets and receive alerts when you're close to limits
                </Text>
              </View>
            </View>

            <View className="flex flex-row items-start space-x-6">
              <View className="bg-primary/10 p-6 rounded-full">
                <Ionicons name="bar-chart" size={28} color="#7A4DFF" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-xl mb-2">Visual Analytics</Text>
                <Text className="text-gray-700 text-sm">
                  Understand your spending patterns with beautiful charts and reports
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-12 text-center">
            {/* Get Started Button */}
            <Link
              href="/register"  // Link to the Login page
              className="bg-primary text-white font-semibold py-4 px-6 rounded-lg hover:bg-primary-dark transition-colors inline-flex items-center"
            >
              <Text className="text-white text-center">Get Started <Ionicons name="arrow-forward" size={16} className="ml-2" /></Text>
            </Link>
          </View>
        </View>
      </View>
    </View>
  );
};

export default Index;
