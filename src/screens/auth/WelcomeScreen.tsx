import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONTS, RADIUS, SPACING } from '../../theme';

type AuthStackParamList = {
  Welcome:  undefined;
  Login:    undefined;
  Register: undefined;
};

interface WelcomeScreenProps {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
}

// Each content element animates in with a staggered fade + slide up
function useStaggeredEntry(delay: number) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  useEffect(() => {
    opacity.value    = withDelay(delay, withTiming(1,  { duration: 500 }));
    translateY.value = withDelay(delay, withSpring(0,  { damping: 14 }));
  }, []);
  return useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const logoStyle    = useStaggeredEntry(0);
  const titleStyle   = useStaggeredEntry(120);
  const taglineStyle = useStaggeredEntry(220);
  const bullet1Style = useStaggeredEntry(320);
  const bullet2Style = useStaggeredEntry(380);
  const bullet3Style = useStaggeredEntry(440);
  const buttonStyle  = useStaggeredEntry(560);

  const BULLETS = [
    { icon: 'flash',              text: 'Real-time AI trading signals' },
    { icon: 'shield-checkmark',   text: 'Bank-grade encrypted security' },
    { icon: 'trending-up',        text: 'Automated & manual trading modes' },
  ] as const;

  const bulletStyles = [bullet1Style, bullet2Style, bullet3Style];

  return (
    <LinearGradient colors={COLORS.gradientBg} style={styles.container}>
      <View style={[styles.inner, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}>

        {/* Logo */}
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <LinearGradient
            colors={COLORS.gradientBuy}
            style={styles.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="trending-up" size={44} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        {/* App name */}
        <Animated.Text style={[styles.appName, titleStyle]}>Slick AI</Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Your intelligent forex trading partner.{'\n'}AI-powered signals. Automated execution.
        </Animated.Text>

        {/* Bullet points */}
        <View style={styles.bullets}>
          {BULLETS.map((b, i) => (
            <Animated.View key={b.text} style={[styles.bulletRow, bulletStyles[i]]}>
              <View style={styles.bulletIcon}>
                <Ionicons name={b.icon as any} size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.bulletText}>{b.text}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Get Started button */}
        <Animated.View style={[styles.btnWrap, buttonStyle]}>
          <Pressable
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="Get started with Slick AI"
            accessibilityHint="Opens the sign in and registration page"
          >
            {({ pressed }) => (
              <LinearGradient
                colors={COLORS.gradientBuy}
                style={[styles.cta, pressed && styles.ctaPressed]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.ctaText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.ctaIcon} />
              </LinearGradient>
            )}
          </Pressable>
        </Animated.View>

        {/* Legal disclaimer */}
        <Animated.Text style={[styles.legal, buttonStyle]}>
          Trading involves risk. AI signals are informational only and do not constitute financial advice.
        </Animated.Text>

      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  logoWrap:    { marginBottom: 24 },
  logoGradient: {
    width: 90,
    height: 90,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    color: COLORS.text,
    fontSize: FONTS.sizes['4xl'],
    fontWeight: FONTS.weights.extrabold,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  bullets: {
    alignSelf: 'stretch',
    gap: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bulletIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bulletText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.medium,
    flex: 1,
  },
  spacer: { flex: 1 },
  btnWrap: { width: '100%', marginBottom: 16 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: RADIUS.md,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
  ctaIcon: { marginLeft: 8 },
  legal: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: SPACING.sm,
  },
});