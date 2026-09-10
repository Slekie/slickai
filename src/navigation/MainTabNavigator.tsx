import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { SignalsScreen } from '../screens/signals/SignalsScreen';
import { ChartScreen } from '../screens/charts/ChartScreen';
import { AccountsScreen } from '../screens/accounts/AccountsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { COLORS, FONTS } from '../theme';

export type MainTabParamList = {
  Dashboard: undefined;
  Signals: undefined;
  Charts: undefined;
  Accounts: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen as React.ComponentType}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Signals"
        component={SignalsScreen as React.ComponentType}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'radio' : 'radio-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Charts"
        component={ChartScreen as React.ComponentType}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen as React.ComponentType}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen as React.ComponentType}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'settings-sharp' : 'settings-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.bgCard,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
  },
});
