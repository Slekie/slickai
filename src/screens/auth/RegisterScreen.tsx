import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, FONTS, RADIUS, SPACING } from '../../theme';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

interface RegisterScreenProps {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
}

interface FocusState {
  email: boolean;
  password: boolean;
  confirm: boolean;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { register, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<FocusState>({ email: false, password: false, confirm: false });

  const formOpacity = useSharedValue(0);
  const formSlide = useSharedValue(30);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    formOpacity.value = withTiming(1, { duration: 500 });
    formSlide.value = withSpring(0, { damping: 14 });
  }, []);

  const formAnimStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formSlide.value }],
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const validateInputs = (): boolean => {
    if (!email.trim()) { setError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address'); return false;
    }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return false; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return false; }
    return true;
  };

  const handleRegister = useCallback(async () => {
    setError(null);
    if (!validateInputs()) return;
    try {
      await register(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    }
  }, [email, password, confirmPassword, register]);

  return (
    <LinearGradient colors={COLORS.gradientBg} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          <Animated.View style={formAnimStyle}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Slick AI Trading Platform</Text>

            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorText}> {error}</Text>
              </View>
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
                  placeholder="At least 8 characters"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  autoComplete="new-password"
                  editable={!isLoading}
                  onFocus={() => setFocused((f) => ({ ...f, password: true }))}
                  onBlur={() => setFocused((f) => ({ ...f, password: false }))}
                />
              </View>
            </View>

            {/* Confirm */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={[styles.inputWrapper, focused.confirm && styles.inputWrapperFocused]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={focused.confirm ? COLORS.primary : COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat your password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  autoComplete="new-password"
                  editable={!isLoading}
                  onFocus={() => setFocused((f) => ({ ...f, confirm: true }))}
                  onBlur={() => setFocused((f) => ({ ...f, confirm: false }))}
                />
              </View>
            </View>

            {/* Register button */}
            <Animated.View style={btnAnimStyle}>
              <Pressable
                style={[styles.registerButton, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                onPressIn={() => { btnScale.value = withSpring(0.96); }}
                onPressOut={() => { btnScale.value = withSpring(1); }}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={COLORS.gradientBuy}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.registerGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.registerButtonText}>Create Account</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Pressable
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
            >
              <Text style={styles.loginLinkText}>
                Already have an account?{' '}
                <Text style={styles.loginLinkHighlight}>Sign In</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: FONTS.sizes['3xl'],
    fontWeight: FONTS.weights.extrabold,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    marginBottom: 40,
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
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  registerButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
  },
  registerGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  loginLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginLinkText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  loginLinkHighlight: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
});
