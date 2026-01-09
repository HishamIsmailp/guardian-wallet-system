import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { View, ActivityIndicator } from 'react-native';

// Screens
import LoginScreen from './screens/LoginScreen';
import ParentDashboard from './screens/ParentDashboard';
import StudentDashboard from './screens/StudentDashboard';
import VendorDashboard from './screens/VendorDashboard';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F1A' }}>
        <ActivityIndicator size="large" color="#2EF2C5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0F1A' } }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          // Role Based Routing
          <>
            {user.role?.name === 'GUARDIAN' && <Stack.Screen name="ParentDashboard" component={ParentDashboard} />}
            {user.role?.name === 'STUDENT' && <Stack.Screen name="StudentDashboard" component={StudentDashboard} />}
            {user.role?.name === 'VENDOR' && <Stack.Screen name="VendorDashboard" component={VendorDashboard} />}
            {user.role?.name === 'ADMIN' && <Stack.Screen name="VendorDashboard" component={VendorDashboard} />}
          </>
        )}
      </Stack.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
}
