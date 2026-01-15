import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Screens
import LoginScreen from './screens/LoginScreen';
import ParentDashboard from './screens/ParentDashboard';
import VendorDashboard from './screens/VendorDashboard';
import StudentAuthScreen from './screens/StudentAuthScreen';

const Stack = createNativeStackNavigator();

// Fallback screen for unsupported roles (with logout button)
const UnsupportedRoleScreen = ({ role, onLogout }) => (
  <View style={styles.unsupported}>
    <Text style={styles.unsupportedTitle}>Access Denied</Text>
    <Text style={styles.unsupportedText}>
      {role === 'STUDENT'
        ? 'Students do not have app access.\n\nUse your Student ID and PIN at vendor locations to make payments.'
        : `Role "${role}" is not supported in the mobile app.`}
    </Text>
    <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
      <Text style={styles.logoutBtnText}>Back to Login</Text>
    </TouchableOpacity>
  </View>
);

const AppNavigator = () => {
  const { user, loading, logout } = useAuth();

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
            {user.role?.name === 'VENDOR' && <Stack.Screen name="VendorDashboard" component={VendorDashboard} />}
            {user.role?.name === 'ADMIN' && <Stack.Screen name="VendorDashboard" component={VendorDashboard} />}
            {(user.role?.name === 'STUDENT' || user.isStudent) && <Stack.Screen name="StudentAuth" component={StudentAuthScreen} />}
            {!['GUARDIAN', 'VENDOR', 'ADMIN', 'STUDENT'].includes(user.role?.name) && !user.isStudent && (
              <Stack.Screen name="Unsupported">
                {() => <UnsupportedRoleScreen role={user.role?.name} onLogout={logout} />}
              </Stack.Screen>
            )}
          </>
        )}
      </Stack.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  unsupported: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0F1A',
    padding: 30
  },
  unsupportedTitle: {
    color: '#FF4444',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15
  },
  unsupportedText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30
  },
  logoutBtn: {
    backgroundColor: '#2EF2C5',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10
  },
  logoutBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
}
