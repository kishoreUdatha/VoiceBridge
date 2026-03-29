import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { RootStackParamList, MainTabParamList, STORAGE_KEYS } from '../types';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import LeadsScreen from '../screens/LeadsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CallScreen from '../screens/CallScreen';
import OutcomeScreen from '../screens/OutcomeScreen';
import LeadDetailScreen from '../screens/LeadDetailScreen';
import EditLeadScreen from '../screens/EditLeadScreen';
import CreateLeadScreen from '../screens/CreateLeadScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AIAnalysisScreen from '../screens/AIAnalysisScreen';
import SmartCallPrepScreen from '../screens/SmartCallPrepScreen';
import AssignedDataScreen from '../screens/AssignedDataScreen';
import CallAssignedDataScreen from '../screens/CallAssignedDataScreen';
import QualifiedLeadsScreen from '../screens/QualifiedLeadsScreen';
import PerformanceScreen from '../screens/PerformanceScreen';
import CallAnalysisScreen from '../screens/CallAnalysisScreen';
import FollowUpsScreen from '../screens/FollowUpsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import api from '../api';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Login Screen with actual API call
const LoginScreen: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    console.log('[Login] Attempting login with:', email);

    try {
      // Use axios api instance for consistent URL handling and interceptors
      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password: password,
      });

      console.log('[Login] Response status:', response.status);
      const data = response.data;
      console.log('[Login] Response data:', data);

      // Handle both response formats: { accessToken } or { data: { accessToken } }
      const responseData = data.data || data;
      const accessToken = responseData.accessToken || responseData.token;

      if (data.success !== false && accessToken) {
        // Save tokens using correct storage keys
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);

        if (responseData.user) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(responseData.user));
        }
        if (responseData.refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, responseData.refreshToken);
        }

        console.log('[Login] Login successful, navigating...');
        onLoginSuccess();
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error: any) {
      console.log('[Login] Error:', error);
      let message = 'Login failed. Please check your credentials.';

      if (error.response) {
        // Server responded with error
        const status = error.response.status;
        const serverMessage = error.response.data?.message;

        if (status === 429) {
          message = 'Too many attempts. Please wait a minute and try again.';
        } else if (status === 401) {
          message = 'Invalid email or password.';
        } else if (serverMessage) {
          message = serverMessage;
        }
      } else if (error.message?.includes('Network Error') || error.message?.includes('timeout')) {
        message = 'Cannot connect to server. Please check:\n• Internet connection\n• Phone is on same WiFi as server\n• Server is running';
      }

      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.loginContainer}>
      <Text style={styles.title}>CRM Telecaller</Text>
      <Text style={styles.subtitle}>Login to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>
        Test: admin@demo.com / admin123
      </Text>
    </View>
  );
};

// Main Tab Navigator
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'AssignedData':
              iconName = focused ? 'clipboard-text' : 'clipboard-text-outline';
              break;
            case 'Leads':
              iconName = focused ? 'account-group' : 'account-group-outline';
              break;
            case 'History':
              iconName = focused ? 'phone-log' : 'phone-log';
              break;
            case 'Settings':
              iconName = focused ? 'cog' : 'cog-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#3B82F6',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard', headerShown: false }}
      />
      <Tab.Screen
        name="AssignedData"
        component={AssignedDataScreen}
        options={{ title: 'To Call', headerTitle: 'Assigned Data' }}
      />
      <Tab.Screen
        name="Leads"
        component={LeadsScreen}
        options={{ title: 'Leads' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'History' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
const AppNavigator: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      console.log('[AppNavigator] Auth check, token exists:', !!token);
      setIsLoggedIn(!!token);
    } catch (e) {
      setIsLoggedIn(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Listen for logout event
    const subscription = DeviceEventEmitter.addListener('logout', () => {
      console.log('[AppNavigator] Logout event received, setting isLoggedIn to false');
      setIsLoggedIn(false);
      setChecking(false); // Ensure we're not stuck in loading state
      console.log('[AppNavigator] State updated, should show login screen');
    });

    console.log('[AppNavigator] Logout event listener registered');

    return () => {
      console.log('[AppNavigator] Removing logout event listener');
      subscription.remove();
    };
  }, [checkAuth]);

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#3B82F6',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        {!isLoggedIn ? (
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {() => <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SmartCallPrep"
              component={SmartCallPrepScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Call"
              component={CallScreen}
              options={{ title: 'Active Call', headerBackVisible: false }}
            />
            <Stack.Screen
              name="CallAssignedData"
              component={CallAssignedDataScreen}
              options={{ title: 'Calling...', headerBackVisible: false }}
            />
            <Stack.Screen
              name="Outcome"
              component={OutcomeScreen}
              options={{ title: 'Call Outcome', headerBackVisible: false }}
            />
            <Stack.Screen
              name="LeadDetail"
              component={LeadDetailScreen}
              options={{ title: 'Lead Details' }}
            />
            <Stack.Screen
              name="EditLead"
              component={EditLeadScreen}
              options={{ title: 'Edit Lead' }}
            />
            <Stack.Screen
              name="CreateLead"
              component={CreateLeadScreen}
              options={{ title: 'Create Lead' }}
            />
            <Stack.Screen
              name="Analytics"
              component={AnalyticsScreen}
              options={{ title: 'Analytics' }}
            />
            <Stack.Screen
              name="Notifications"
              component={SettingsScreen}
              options={{ title: 'Notifications' }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Profile' }}
            />
            <Stack.Screen
              name="AIAnalysis"
              component={AIAnalysisScreen}
              options={{ title: 'AI Analysis' }}
            />
            <Stack.Screen
              name="QualifiedLeads"
              component={QualifiedLeadsScreen}
              options={{ title: 'My Qualified Leads' }}
            />
            <Stack.Screen
              name="Performance"
              component={PerformanceScreen}
              options={{ title: 'My Performance' }}
            />
            <Stack.Screen
              name="CallAnalysis"
              component={CallAnalysisScreen}
              options={{ title: 'Call Analysis', headerBackVisible: false }}
            />
            <Stack.Screen
              name="FollowUps"
              component={FollowUpsScreen}
              options={{ title: 'Follow-ups' }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{ title: 'Notifications' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    fontSize: 16,
    color: '#333',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    marginTop: 20,
    fontSize: 12,
    color: '#999',
  },
});

export default AppNavigator;
