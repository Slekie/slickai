import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { COLORS, FONTS, RADIUS, SPACING } from '../../theme';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

interface LoginScreenProps {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
}

function formatLockoutTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const {
    login,
    loginWithBiometrics,
    isLoading,
    isLockedOut,
    lockoutRemainingMs,
    failedAttempts,
  } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [error, setError]               = useState<string | null>(null);
  const [emailError, setEmailError]     = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [activeInput, setActiveInput]   = useState<'email' | 'password' | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const btnScale    = useSharedValue(1);

  useEffect(() => {
    authService.isBiometricAvailable().then(setBiometricAvailable).catch(() => undefined);
  }, []);

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  // Inline email validation — also called on blur
  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      setEmailError('Enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validateAll = (): boolean => {
    if (!validateEmail(email)) return false;
    if (!password) { setError('Password is required'); return false; }
    return true;
  };

  const handleLogin = useCallback(async () => {
    if (isLockedOut) return;
    setError(null);
    setEmailError(null);
    if (!validateAll()) return;

    try {
      if (__DEV__) console.log('[Login] Attempting:', email.trim().toLowerCase());
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      if (__DEV__) console.error('[Login] Error:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const ax = err as { response?: { data?: { message?: string }; status?: number } };
        const msg    = ax.response?.data?.message;
        const status = ax.response?.status;
        if (msg)                   { setError(msg); }
        else if (status === 401)   { setError('Invalid email or password.'); }
        else if (!status)          { setError('Cannot reach the server. Check your internet connection.'); }
        else                       { setError(`Login failed (${status}). Please try again.`); }
      } else {
        setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
      }
    }
  }, [email, password, login, isLockedOut]);

  const handleBiometric = useCallback(async () => {
    setError(null);
    try {
      const ok = await loginWithBiometrics();
      if (!ok) setError('Biometric authentication failed');
    } catch {
      setError('Biometric authentication failed');
    }
  }, [loginWithBiometrics]);

  // ── Lockout screen ────────────────────────────────────────────────────────
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

  // ── Main login form ───────────────────────────────────────────────────────
  return (
    <LinearGradient colors={COLORS.gradientBg} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 24, 60) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Logo ──────────────────────────────────────────────────────── */}
          <View style={styles.logoContainer}>
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
          </View>

          {/* ── General error banner ──────────────────────────────────────── */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}> {error}</Text>
            </View>
          ) : null}

          {/* ── Failed attempts warning ───────────────────────────────────── */}
          {failedAttempts > 0 && !isLockedOut ? (
            <Text style={styles.attemptsWarning}>
              {failedAttempts} failed attempt{failedAttempts !== 1 ? 's' : ''} — locks after 3
            </Text>
          ) : null}

          {/* ── Email field ───────────────────────────────────────────────── */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            {/* accessibilityState with invalid lives on the View, not TextInput */}
            <View
              style={[
                styles.inputWrapper,
                activeInput === 'email' ? styles.inputWrapperFocused : null,
                emailError ? styles.inputWrapperError : null,
              ]}
              accessibilityRole="none"
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={
                  emailError
                    ? COLORS.error
                    : activeInput === 'email'
                    ? COLORS.primary
                    : COLORS.textSecondary
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); if (emailError) validateEmail(t); }}
                placeholder="your@email.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setActiveInput('email')}
                onBlur={() => { setActiveInput(null); validateEmail(email); }}
                accessibilityLabel="Email address"
                accessibilityHint={emailError ?? undefined}
              />
            </View>
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
          </View>

          {/* ── Password field ────────────────────────────────────────────── */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View
              style={[
                styles.inputWrapper,
                activeInput === 'password' ? styles.inputWrapperFocused : null,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={activeInput === 'password' ? COLORS.primary : COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                autoComplete="current-password"
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                onFocus={() => setActiveInput('password')}
                onBlur={() => setActiveInput(null)}
                accessibilityLabel="Password"
              />
            </View>
          </View>

          {/* ── Sign In button ────────────────────────────────────────────── */}
          <Animated.View style={btnAnimStyle}>
            <Pressable
              style={[styles.loginButton, isLoading ? styles.buttonDisabled : null]}
              onPress={handleLogin}
              onPressIn={() => { btnScale.value = withSpring(0.96); }}
              onPressOut={() => { btnScale.value = withSpring(1); }}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: isLoading }}
            >
              <LinearGradient
                colors={COLORS.gradientBuy}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginGradient}
              >
                {isLoading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.loginButtonText}>Sign In</Text>
                }
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* ── Biometric (only when available) ──────────────────────────── */}
          {biometricAvailable ? (
            <Pressable
              style={styles.biometricButton}
              onPress={handleBiometric}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Sign in with biometrics"
              accessibilityState={{ disabled: isLoading }}
            >
              <Ionicons name="finger-print" size={20} color={COLORS.text} />
              <Text style={styles.biometricButtonText}>  Sign in with Biometrics</Text>
            </Pressable>
          ) : null}

          {/* ── Divider ───────────────────────────────────────────────────── */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Register link ─────────────────────────────────────────────── */}
          <Pressable
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Create a new account"
          >
            <Text style={styles.registerLinkText}>
              {"Don't have an account?  "}
              <Text style={styles.registerLinkHighlight}>Create Account</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex:          { flex: 1 },
  container:     { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: 60,  // baseline ? overridden at render time with safe-area inset
    paddingBottom: SPACING.xl,
    justifyContent: 'center',
  },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoGradient:  {
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
  subtitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
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
  errorText: { color: COLORS.error, fontSize: FONTS.sizes.sm, flex: 1 },
  attemptsWarning: {
    color: COLORS.warning,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginBottom: 12,
  },
  inputGroup:  { marginBottom: SPACING.md },
  inputLabel:  {
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
    height: 52,
  },
  inputWrapperFocused: { borderColor: COLORS.primary },
  inputWrapperError:   { borderColor: COLORS.error },
  inputIcon: { paddingLeft: 14, paddingRight: 2 },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    paddingHorizontal: 12,
    paddingVertical: 0,
    height: '100%',
  },
  fieldError: {
    color: COLORS.error,
    fontSize: FONTS.sizes.xs,
    marginTop: 4,
    marginLeft: 4,
  },
  loginButton:     { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: 8, marginBottom: 12 },
  loginGradient:   { paddingVertical: 16, alignItems: 'center' },
  buttonDisabled:  { opacity: 0.6 },
  loginButtonText: { color: '#FFFFFF', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
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
  biometricButtonText: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.medium },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  registerLink:          { paddingVertical: 12, alignItems: 'center' },
  registerLinkText:      { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  registerLinkHighlight: { color: COLORS.primary, fontWeight: FONTS.weights.semibold },
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
  lockIcon:       { marginBottom: 12 },
  lockoutTitle:   { color: COLORS.error, fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, marginBottom: 12, textAlign: 'center' },
  lockoutMessage: { color: COLORS.text, fontSize: FONTS.sizes.md, lineHeight: 22, textAlign: 'center' },
});