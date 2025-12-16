import { Feather, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/tabs";
import { Platform, StyleSheet, View } from "react-native";

const styles = StyleSheet.create({
  floatingButton: {
    width: 50,
    height: 50,
    backgroundColor: "#A78BFA",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    elevation: 8,
  },
});

const _layout = () => {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarShowLabel: true,
        tabBarStyle: {
          height: Platform.OS === "ios" ? 80 : 60,
          paddingBottom: 10,
          paddingTop: 5,
          backgroundColor: "#fff",
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: "#A78BFA",
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === "home") {
            return (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={24}
                color={focused ? "#A78BFA" : "black"}
              />
            );
          } else if (route.name === "analytics") {
            return (
              <Feather
                name="pie-chart"
                size={24}
                color={focused ? "#A78BFA" : "black"}
              />
            );
          } else if (route.name === "addExpense") {
            return (
              <View style={styles.floatingButton}>
                <Feather name="plus" size={28} color="white" />
              </View>
            );
          } else if (route.name === "budget") {
            return (
              <Feather
                name="user"
                size={24}
                color={focused ? "#A78BFA" : "black"}
              />
            );
          } else if (route.name === "profile") {
            return (
              <Feather
                name="settings"
                size={24}
                color={focused ? "#A78BFA" : "black"}
              />
            );
          }
        },
      })}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: "Home",
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarLabel: "Analytics",
        }}
      />
      <Tabs.Screen
        name="addExpense"
        options={{
          tabBarLabel: "Add",
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          tabBarLabel: "Budget",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "Profile",
        }}
      />
    </Tabs>
  );
};

export default _layout;
