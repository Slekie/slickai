import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { OnboardingScreen, hasCompletedOnboarding } from '../screens/onboarding/OnboardingScreen';
import { useAuthStore } from '../store/authStore';
import { accountService } from '../services/accountService';
import { signalService } from '../services/signalService';
import { tradeService } from '../services/tradeService';
import { websocketService } from '../services/websocketService';
import { notificationService } from '../services/notificationService';
import { useWebSocket } from '../hooks/useWebSocket';
import { COLORS } from '../theme';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.primary,
    background: COLORS.bg,
    card: COLORS.bgCard,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.primary,
  },
};

// ── Animated splash screen ──────────────────────────────────────────────────

const SplashScreen: React.FC = () => {
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withTiming(1, { duration: 700 });
    logoOpacity.value = withTiming(1, { duration: 700 });
    textOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <LinearGradient colors={COLORS.gradientBg} style={styles.splash}>
      <Animated.View style={[styles.splashLogoContainer, logoStyle]}>
        <LinearGradient
          colors={COLORS.gradientBuy}
          style={styles.splashLogoGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="trending-up" size={40} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
      <Animated.Text style={[styles.splashTitle, textStyle]}>Slick AI</Animated.Text>
      <Animated.Text style={[styles.splashSubtitle, textStyle]}>AI Trading Platform</Animated.Text>
    </LinearGradient>
  );
};

// ── Inner app content ────────────────────────────────────────────────────────

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  useWebSocket();
  return isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />;
};

// ── Root navigator ────────────────────────────────────────────────────────────

export const RootNavigator: React.FC = () => {
  const { isLoading, isAuthenticated, token, loadStoredAuth } = useAuthStore();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const init = async () => {
      await loadStoredAuth();
      await notificationService.initialize();
      await notificationService.requestPermissions();
      const done = await hasCompletedOnboarding();
      setOnboardingDone(done);
      // Show splash for at least 1.8s for branding
      setTimeout(() => setShowSplash(false), 1800);
    };
    void init();
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      accountService.setAuthToken(token);
      signalService.setAuthToken(token);
      tradeService.setAuthToken(token);
      websocketService.setToken(token);
      websocketService.connect();
    } else {
      websocketService.disconnect();
    }
  }, [isAuthenticated, token]);

  // Show splash until auth is loaded AND minimum splash time has passed
  if (showSplash || isLoading || onboardingDone === null) {
    return <SplashScreen />;
  }

  // First launch onboarding
  if (!onboardingDone) {
    return <OnboardingScreen onComplete={() => setOnboardingDone(true)} />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <AppContent />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogoContainer: {
    marginBottom: 24,
  },
  splashLogoGradient: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 6,
  },
  splashSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
});
