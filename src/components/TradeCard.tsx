import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../theme';
import type { OpenPosition } from '../store/tradeStore';

interface TradeCardProps {
  position: OpenPosition;
  isAutomatedAccount?: boolean;
  index?: number;
}

function formatDuration(entryTime: string): string {
  const ms = Date.now() - new Date(entryTime).getTime();
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export const TradeCard: React.FC<TradeCardProps> = ({
  position,
  isAutomatedAccount = false,
  index = 0,
}) => {
  const pnlValue = parseFloat(position.unrealizedPnl);
  const isProfit = pnlValue >= 0;
  const pnlColor = isProfit ? COLORS.buy : COLORS.sell;
  const directionColor = position.direction === 'BUY' ? COLORS.buy : COLORS.sell;

  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);

  useEffect(() => {
    fadeAnim.value = withDelay(index * 80, withTiming(1, { duration: 400 }));
    slideAnim.value = withDelay(index * 80, withSpring(0, { damping: 14 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  const cardBg = isProfit
    ? 'rgba(0,200,81,0.06)'
    : 'rgba(255,59,92,0.06)';

  return (
    <Animated.View style={[styles.card, { backgroundColor: cardBg }, animStyle]}>
      <View style={styles.header}>
        <Text style={styles.asset}>{position.asset}</Text>
        <View style={[styles.directionBadge, { backgroundColor: directionColor }]}>
          <Text style={styles.directionText}>{position.direction}</Text>
        </View>
        {isAutomatedAccount && (
          <View style={styles.aiBadge}>
            <Ionicons name="hardware-chip-outline" size={11} color={COLORS.primary} />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        )}
        <Text style={[styles.pnl, { color: pnlColor }]}>
          {isProfit ? '+' : ''}{position.unrealizedPnl}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Entry</Text>
          <Text style={styles.detailValue}>{position.entryPrice}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Current</Text>
          <Text style={styles.detailValue}>{position.currentPrice}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Size</Text>
          <Text style={styles.detailValue}>{position.positionSize}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>{formatDuration(position.entryTime)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.detailLabel}>SL: <Text style={{ color: COLORS.sell }}>{position.stopLoss}</Text></Text>
        <Text style={[styles.pnlPercent, { color: pnlColor }]}>
          {isProfit ? '+' : ''}{position.unrealizedPnlPercentage.toFixed(2)}%
        </Text>
        <Text style={styles.detailLabel}>TP: <Text style={{ color: COLORS.buy }}>{position.takeProfit}</Text></Text>
      </View>

      {isAutomatedAccount && (
        <View style={styles.aiManagedRow}>
          <Ionicons name="lock-closed" size={12} color={COLORS.primary} />
          <Text style={styles.aiManagedText}> AI Managed — manual actions disabled</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: 6,
    marginHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  asset: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  directionBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  directionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 2,
  },
  aiBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  pnl: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  pnlPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  aiManagedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  aiManagedText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '500',
  },
});
