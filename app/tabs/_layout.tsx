import { Tabs } from 'expo-router/tabs';
import { View, Text, Platform } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

const _layout = () => {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarShowLabel: true,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: 10,
          paddingTop: 5,
          backgroundColor: '#fff',
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: '#A78BFA',
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'home') {
            return (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={24}
                color={focused ? '#A78BFA' : 'black'}
              />
            );
          } else if (route.name === 'analytics') {
            return (
              <Feather
                name="pie-chart"
                size={24}
                color={focused ? '#A78BFA' : 'black'}
              />
            );
          } else if (route.name === 'addExpense') {
            return (
              <View
                style={{
                  width: 50,
                  height: 50,
                  backgroundColor: '#A78BFA',
                  borderRadius: 30,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 30,
                  ...(Platform.OS === 'ios'
                    ? {
                        shadowColor: '#000',
                        shadowOpacity: 0.2,
                        shadowRadius: 5,
                        shadowOffset: { width: 0, height: 2 },
                      }
                    : {
                        elevation: 5,
                      }),
                }}
              >
                <Feather name="plus" size={28} color="white" />
              </View>
            );
          } else if (route.name === 'budget') {
            return (
              <Feather
                name="user"
                size={24}
                color={focused ? '#A78BFA' : 'black'}
              />
            );
          } else if (route.name === 'profile') {
            return (
              <Feather
                name="settings"
                size={24}
                color={focused ? '#A78BFA' : 'black'}
              />
            );
          }
        },
      })}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarLabel: 'Analytics',
        }}
      />
      <Tabs.Screen
        name="addExpense"
        options={{
          tabBarLabel: 'Add',
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          tabBarLabel: 'Budget',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
};

export default _layout;
