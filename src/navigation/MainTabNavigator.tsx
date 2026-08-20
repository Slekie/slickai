import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { SignalsScreen } from '../screens/signals/SignalsScreen';
import { TradeHistoryScreen } from '../screens/trades/TradeHistoryScreen';
import { AccountsScreen } from '../screens/accounts/AccountsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { COLORS, FONTS } from '../theme';

export type MainTabParamList = {
  Dashboard: undefined;
  Signals: undefined;
  Trades: undefined;
  Accounts: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName =
  | 'stats-chart'
  | 'stats-chart-outline'
  | 'radio'
  | 'radio-outline'
  | 'time'
  | 'time-outline'
  | 'wallet'
  | 'wallet-outline'
  | 'settings-sharp'
  | 'settings-outline';

interface TabBarIconProps {
  name: TabIconName;
  focused?: boolean;
  color: string;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ name, color }) => (
  <Ionicons name={name} size={22} color={color} />
);

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
            <TabBarIcon name={focused ? 'stats-chart' : 'stats-chart-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Signals"
        component={SignalsScreen as React.ComponentType}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'radio' : 'radio-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Trades"
        component={TradeHistoryScreen as React.ComponentType}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'time' : 'time-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen as React.ComponentType}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'wallet' : 'wallet-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen as React.ComponentType}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'settings-sharp' : 'settings-outline'} focused={focused} color={color} />
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
