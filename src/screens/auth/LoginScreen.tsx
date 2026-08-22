import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { COLORS, FONTS, RADIUS, SPACING } from '../../theme';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { AppleSignInButton } from '../../components/auth/AppleSignInButton';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

interface LoginScreenProps {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
}

interface FocusState {
  email: boolean;
  password: boolean;
}

function formatLockoutTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, loginWithBiometrics, isLoading, isLockedOut, lockoutRemainingMs, failedAttempts } =
    useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [focused, setFocused] = useState<FocusState>({ email: false, password: false });

  // Entrance animations
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);

  // Button press animation
  const btnScale = useSharedValue(1);

  useEffect(() => {
    logoScale.value = withTiming(1, { duration: 600 });
    logoOpacity.value = withTiming(1, { duration: 600 });
    formOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    authService.isBiometricAvailable().then(setBiometricAvailable).catch(() => undefined);
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const formFadeStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const validateInputs = (): boolean => {
    if (!email.trim()) { setError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address'); return false;
    }
    if (!password) { setError('Password is required'); return false; }
    return true;
  };

  const handleLogin = useCallback(async () => {
    if (isLockedOut) return;
    setError(null);
    if (!validateInputs()) return;
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    }
  }, [email, password, login, isLockedOut]);

  const handleBiometric = useCallback(async () => {
    setError(null);
    try {
      const success = await loginWithBiometrics();
      if (!success) setError('Biometric authentication failed');
    } catch {
      setError('Biometric authentication failed');
    }
  }, [loginWithBiometrics]);

  if (isLockedOut) {
    return (
      <LinearGradient colors={COLORS.gradientBg} style={styles.container}>
        <View style={styles.lockoutCard}>
          <Ionicons name="lock-closed" size={40} color={COLORS.error} style={styles.lockIcon} />
          <Text style={styles.lockoutTitle}>Account Temporarily Locked</Text>
          <Text style={styles.lockoutMessage}>
            Too many failed attempts. Try again in {formatLockoutTime(lockoutRemainingMs)}.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.gradientBg} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Logo */}
          <Animated.View style={[styles.logoContainer, logoAnimStyle]}>
            <LinearGradient
              colors={COLORS.gradientBuy}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="trending-up" size={36} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.title}>Slick AI</Text>
            <Text style={styles.subtitle}>AI Trading Platform</Text>
          </Animated.View>

          <Animated.View style={formFadeStyle}>
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorText}> {error}</Text>
              </View>
            )}

            {failedAttempts > 0 && !isLockedOut && (
              <Text style={styles.attemptsWarning}>
                {failedAttempts} failed attempt{failedAttempts !== 1 ? 's' : ''} — locks after 3
              </Text>
            )}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[styles.inputWrapper, focused.email && styles.inputWrapperFocused]}>
                <Ionicons name="mail-outline" size={18} color={focused.email ? COLORS.primary : COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                  onFocus={() => setFocused((f) => ({ ...f, email: true }))}
                  onBlur={() => setFocused((f) => ({ ...f, email: false }))}
                  accessibilityLabel="Email address"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputWrapper, focused.password && styles.inputWrapperFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={focused.password ? COLORS.primary : COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  autoComplete="current-password"
                  editable={!isLoading}
                  onFocus={() => setFocused((f) => ({ ...f, password: true }))}
                  onBlur={() => setFocused((f) => ({ ...f, password: false }))}
                  accessibilityLabel="Password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>
            </View>

            {/* Login button */}
            <Animated.View style={btnAnimStyle}>
              <Pressable
                style={[styles.loginButton, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                onPressIn={() => { btnScale.value = withSpring(0.96); }}
                onPressOut={() => { btnScale.value = withSpring(1); }}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                accessibilityHint="Signs you into your Slick AI account"
                accessibilityState={{ disabled: isLoading }}
              >
                <LinearGradient
                  colors={COLORS.gradientBuy}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Biometric */}
            {biometricAvailable && (
              <Pressable
                style={styles.biometricButton}
                onPress={handleBiometric}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Sign in with biometrics"
                accessibilityHint="Authenticates using your device biometrics"
                accessibilityState={{ disabled: isLoading }}
              >
                <Ionicons name="finger-print" size={20} color={COLORS.text} />
                <Text style={styles.biometricButtonText}>  Sign in with Biometrics</Text>
              </Pressable>
            )}

            {/* Google Sign-In */}
            <GoogleSignInButton
              onSuccess={() => { /* store update triggers navigation automatically */ }}
              onError={(err) => setError(err.message)}
            />

            {/* Apple Sign-In (iOS only) */}
            <AppleSignInButton
              onSuccess={() => { /* store update triggers navigation automatically */ }}
              onError={(err) => setError(err.message)}
            />

            {/* Register link */}
            <Pressable
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Go to Register"
              accessibilityHint="Opens the account registration screen"
            >
              <Text style={styles.registerLinkText}>
                Don't have an account?{' '}
                <Text style={styles.registerLinkHighlight}>Register</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: 80,
    paddingBottom: SPACING.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes['4xl'],
    fontWeight: FONTS.weights.extrabold,
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,92,0.12)',
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
  },
  attemptsWarning: {
    color: COLORS.warning,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: 6,
    fontWeight: FONTS.weights.medium,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 52,
  },
  inputWrapperFocused: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  inputIcon: {
    paddingLeft: 14,
    paddingRight: 2,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    paddingHorizontal: 12,
    paddingVertical: 0,
    height: 52,
    textAlignVertical: 'center',
  },
  loginButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
  },
  loginGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  biometricButtonText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.medium,
  },
  registerLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  registerLinkText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  registerLinkHighlight: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
  lockoutCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.md,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    width: '90%',
  },
  lockIcon: {
    marginBottom: 12,
  },
  lockoutTitle: {
    color: COLORS.error,
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    marginBottom: 12,
    textAlign: 'center',
  },
  lockoutMessage: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    lineHeight: 22,
    textAlign: 'center',
  },
});