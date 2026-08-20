import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING } from '../theme';
import type { Signal } from '../store/signalStore';

const SIGNAL_EXPIRY_MINUTES = 15;

interface SignalCardProps {
  signal: Signal;
  isAutomatedAccount?: boolean;
  index?: number;
}

function isSignalExpired(signal: Signal): boolean {
  if (signal.status === 'expired') return true;
  const expiryMs = SIGNAL_EXPIRY_MINUTES * 60 * 1000;
  const age = Date.now() - new Date(signal.generatedAt).getTime();
  return age > expiryMs;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Animated view for the confidence bar
const AnimatedView = Animated.createAnimatedComponent(View);

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  isAutomatedAccount = false,
  index = 0,
}) => {
  const expired = isSignalExpired(signal);
  const directionColor = signal.direction === 'BUY' ? COLORS.buy : COLORS.sell;
  const confidencePercent = Math.round(signal.confidence * 100);

  // Entrance animation
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(40);

  // Confidence bar animation
  const confWidth = useSharedValue(0);

  useEffect(() => {
    fadeAnim.value = withDelay(index * 80, withTiming(1, { duration: 400 }));
    slideAnim.value = withDelay(index * 80, withSpring(0, { damping: 14 }));
    confWidth.value = withDelay(
      index * 80 + 300,
      withTiming(confidencePercent, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  const confBarStyle = useAnimatedStyle(() => ({
    width: `${confWidth.value}%` as unknown as number,
  }));

  const dirGradient: readonly [string, string] = signal.direction === 'BUY'
    ? COLORS.gradientBuy
    : COLORS.gradientSell;

  return (
    <Animated.View style={[styles.card, expired && styles.cardExpired, cardAnimStyle]}>
      {/* Header row */}
      <View style={styles.header}>
        <Text style={styles.asset}>{signal.asset}</Text>
        <LinearGradient
          colors={dirGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.directionBadge}
        >
          <Text style={styles.directionText}>{signal.direction}</Text>
        </LinearGradient>
        {expired && (
          <View style={styles.expiredBadge}>
            <Text style={styles.expiredText}>EXPIRED</Text>
          </View>
        )}
        {isAutomatedAccount && !expired && (
          <View style={styles.autoBadge}>
            <Text style={styles.autoBadgeText}>AUTO</Text>
          </View>
        )}
      </View>

      {/* Price info */}
      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Entry</Text>
          <Text style={styles.priceValue}>{signal.entryPrice}</Text>
        </View>
        <View style={styles.priceDivider} />
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Stop Loss</Text>
          <Text style={[styles.priceValue, { color: COLORS.sell }]}>{signal.stopLoss}</Text>
        </View>
        <View style={styles.priceDivider} />
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Take Profit</Text>
          <Text style={[styles.priceValue, { color: COLORS.buy }]}>{signal.takeProfit}</Text>
        </View>
      </View>

      {/* Confidence bar */}
      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>Confidence</Text>
        <View style={styles.confidenceBarBg}>
          <AnimatedView
            style={[
              styles.confidenceFill,
              { backgroundColor: directionColor },
              confBarStyle,
            ]}
          />
        </View>
        <Text style={[styles.confidenceValue, { color: directionColor }]}>
          {confidencePercent}%
        </Text>
      </View>

      {/* Automated executing indicator or footer */}
      {isAutomatedAccount && !expired ? (
        <View style={styles.executingRow}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.executingText}> Executing automatically...</Text>
        </View>
      ) : (
        <Text style={styles.time}>{formatTime(signal.generatedAt)}</Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: 6,
    marginHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardExpired: {
    opacity: 0.45,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  asset: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  directionBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  directionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  expiredBadge: {
    backgroundColor: COLORS.inactive,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  expiredText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  autoBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  autoBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  priceItem: {
    alignItems: 'center',
    flex: 1,
  },
  priceDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  priceLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 3,
  },
  priceValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  confidenceLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    width: 78,
  },
  confidenceBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.bgCardElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
  executingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  executingText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  time: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'right',
  },
});
