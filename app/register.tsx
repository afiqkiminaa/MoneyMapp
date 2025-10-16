import { useAuth } from "@/contexts/authContext";
import { Link, router } from "expo-router";
import React, { useRef } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

const Register = () => {
  const emailRef = useRef("");
  const passwordRef = useRef("");
  const nameRef = useRef("");

  const { register: registerUser } = useAuth();

  const handleSubmit = async () => {
    if (!emailRef.current || !passwordRef.current || !nameRef.current) {
      Alert.alert("Sign up", "Please fill all the fields");
      return;
    }

    const res = await registerUser(
      emailRef.current,
      passwordRef.current,
      nameRef.current
    );
    console.log("register result:", res);

    if (!res.success) {
      Alert.alert("Sign up", res.msg);
    } else {
    Alert.alert("Sign up", "Account created successfully. Redirecting...");
    router.replace("/login");
  }
  };

  return (
    <View className="flex-1 bg-light-100 px-6 py-12">
      <Text className="text-3xl font-extrabold text-dark-100 text-center mt-10 mb-4">
        Create Your Account
      </Text>
      <Text className="text-lg text-dark-200 text-center mb-6 opacity-80">
        Start tracking your expenses
      </Text>

      {/* Full Name */}
      <Text className="font-bold text-dark-100 mb-2">Full Name</Text>
      <TextInput
        onChangeText={(text) => (nameRef.current = text)}
        placeholder="Enter your full name"
        className="bg-white p-4 rounded-lg shadow-lg mb-4 text-dark-100"
      />

      {/* Email */}
      <Text className="font-bold text-dark-100 mb-2">Email</Text>
      <TextInput
        onChangeText={(text) => (emailRef.current = text)}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
        className="bg-white p-4 rounded-lg shadow-lg mb-4 text-dark-100"
      />

      {/* Password */}
      <Text className="font-bold text-dark-100 mb-2">Password</Text>
      <TextInput
        onChangeText={(text) => (passwordRef.current = text)}
        placeholder="Create a password"
        secureTextEntry
        className="bg-white p-4 rounded-lg shadow-lg mb-4 text-dark-100"
      />

      {/* Role Selection
      <View className="flex-row justify-between mb-6">
        <TouchableOpacity
          onPress={() => (roleRef.current = "student")}
          className={`py-2 px-4 rounded-lg border-2 border-primary ${
            roleRef.current === "student" ? "bg-primary" : ""
          }`}
        >
          <Text
            className={`text-lg ${
              roleRef.current === "student" ? "text-white" : "text-primary"
            }`}
          >
            Student
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => (roleRef.current = "professional")}
          className={`py-2 px-4 rounded-lg border-2 border-primary ${
            roleRef.current === "professional" ? "bg-primary" : ""
          }`}
        >
          <Text
            className={`text-lg ${
              roleRef.current === "professional" ? "text-white" : "text-primary"
            }`}
          >
            Professional
          </Text>
        </TouchableOpacity>
      </View> */}

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        className="bg-primary py-3 px-6 rounded-lg shadow-lg mb-6"
      >
        <Text className="text-white text-center text-lg font-semibold">
          Create Account
        </Text>
      </TouchableOpacity>

      {/* Sign In Link */}
      <View className="flex-row justify-center">
        <Text className="text-dark-100">Already have an account? </Text>
        <Link href="/login">
          <Text className="text-primary font-semibold">Sign in</Text>
        </Link>
      </View>
    </View>
  );
};

export default Register;
