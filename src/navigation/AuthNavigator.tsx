import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Welcome:  undefined;
  Login:    undefined;
  Register: undefined;
};

export type WelcomeScreenProps  = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;
export type LoginScreenProps    = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#080B14' },
        // Smooth slide animation between auth screens
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen as React.ComponentType}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen as React.ComponentType}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen as React.ComponentType}
      />
    </Stack.Navigator>
  );
};