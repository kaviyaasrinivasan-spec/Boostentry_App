import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { EnvironmentProvider, useEnvironment } from '../context/EnvironmentContext';
import LoginScreen from './login';
import EnvironmentScreen from './environment';

function MainLayout() {
  const { user, loading } = useAuth();
  const { environment, loadingEnv } = useEnvironment();

  if (loading || loadingEnv) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!environment) {
    return <EnvironmentScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="upload"
          options={{
            title: 'Upload',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cloud-upload" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="monitoring"
          options={{
            title: 'Monitor',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="monitor-eye" size={size} color={color} />
            ),
          }}
        />
        {/* Hide internal utility screens from tabs */}
        <Tabs.Screen name="login" options={{ href: null }} />
        <Tabs.Screen name="environment" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

export default function RootLayout() {
  return (
    <EnvironmentProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </EnvironmentProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    backgroundColor: colors.tabBackground,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tabItem: {
    paddingTop: 4,
  },
});
