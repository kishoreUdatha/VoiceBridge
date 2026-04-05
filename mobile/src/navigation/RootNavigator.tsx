import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { checkAuth } from '../store/slices/authSlice';
import { View, ActivityIndicator, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';

// Field Sales Screens
import FieldSalesDashboard from '../screens/FieldSalesDashboard';
import CollegesScreen from '../screens/CollegesScreen';
import VisitsScreen from '../screens/VisitsScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import VisitCheckInScreen from '../screens/VisitCheckInScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Telecaller Screens
import TelecallerDashboard from '../screens/TelecallerDashboard';
import NewCallScreen from '../screens/NewCallScreen';
import CallHistoryScreen from '../screens/CallHistoryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Field Sales Tab Navigator
function FieldSalesTabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
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

// Telecaller Tab Navigator
function TelecallerTabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        headerStyle: { backgroundColor: '#3b82f6' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="TelecallerHome"
        component={TelecallerDashboard}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 22 }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="CallHistory"
        component={CallHistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 22 }}>📊</Text>
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
  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#3b82f6' }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>VoiceBridge CRM</Text>
      </View>
    );
  }

  // Determine user role based on role object or string
  const getRoleSlug = () => {
    if (!user?.role) return '';
    if (typeof user.role === 'string') return user.role.toLowerCase();
    if (typeof user.role === 'object' && user.role.slug) return user.role.slug.toLowerCase();
    if (typeof user.role === 'object' && user.role.name) return user.role.name.toLowerCase();
    return '';
  };

  const roleSlug = getRoleSlug();
  const isTelecaller = roleSlug.includes('telecaller');
  const isFieldSales = roleSlug.includes('field') || roleSlug.includes('sales');

  console.log('[Nav] Role:', user?.role, '| isTelecaller:', isTelecaller);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          {/* Main Tab Navigator based on role */}
          {isTelecaller ? (
            <Stack.Screen name="TelecallerMain" component={TelecallerTabNavigator} />
          ) : (
            <Stack.Screen name="Main" component={FieldSalesTabNavigator} />
          )}

          {/* Shared Screens */}
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

          {/* Telecaller Screens */}
          <Stack.Screen
            name="NewCall"
            component={NewCallScreen}
            options={{
              headerShown: true,
              title: 'Log Call',
              headerStyle: { backgroundColor: '#3b82f6' },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen
            name="CallDetail"
            component={CallHistoryScreen}
            options={{
              headerShown: true,
              title: 'Call Details',
              headerStyle: { backgroundColor: '#3b82f6' },
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
