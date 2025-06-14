import { View, Text } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'

const _layout = () => {
  return (
    <Tabs>
        <Tabs.Screen
            name="home"
            options={{
                title: 'Home',
                headerShown: false
            }}
        />
        <Tabs.Screen
            name="analytics"
            options={{
                title: 'Analytics',
                headerShown: false
            }}
        />
        <Tabs.Screen
            name="addExpense"
            options={{
                title: 'Add',
                headerShown: false
            }}
        />
        <Tabs.Screen
            name="budget"
            options={{
                title: 'Budget',
                headerShown: false
            }}
        />
        <Tabs.Screen
            name="profile"
            options={{
                title: 'Profile',
                headerShown: false
            }}
        />
    </Tabs>
  )
}

export default _layout