import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { checkAuth } from '../store/slices/authSlice';
import { View, ActivityIndicator, Text } from 'react-native';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';

// Field Sales Screens
import FieldSalesDashboard from '../screens/FieldSalesDashboard';
import CollegesScreen from '../screens/CollegesScreen';
import VisitsScreen from '../screens/VisitsScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import VisitCheckInScreen from '../screens/VisitCheckInScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: { backgroundColor: '#10b981' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={FieldSalesDashboard}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 22 }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Colleges"
        component={CollegesScreen}
        options={{
          title: 'Colleges',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 22 }}>🏫</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Visits"
        component={VisitsScreen}
        options={{
          title: 'Visits',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 22 }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 22 }}>💰</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 22 }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#10b981' }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>VoiceBridge CRM</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="VisitCheckIn"
            component={VisitCheckInScreen}
            options={{
              headerShown: true,
              title: 'Check In',
              headerStyle: { backgroundColor: '#10b981' },
              headerTintColor: '#fff',
            }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
