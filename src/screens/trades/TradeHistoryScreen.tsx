import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { tradeService } from '../../services/tradeService';
import { COLORS, FONTS, RADIUS, SPACING } from '../../theme';
import { SkeletonCard } from '../../components/SkeletonCard';
import type { Trade } from '../../store/tradeStore';

type DirectionFilter = 'All' | 'BUY' | 'SELL';
const DIRECTION_FILTERS: DirectionFilter[] = ['All', 'BUY', 'SELL'];

function formatDate(isoString: string | null): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(entry: string, exit: string | null): string {
  if (!exit) return '—';
  const ms = new Date(exit).getTime() - new Date(entry).getTime();
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

interface TradeHistoryCardProps {
  trade: Trade;
  index: number;
}

const TradeHistoryCard: React.FC<TradeHistoryCardProps> = ({ trade, index }) => {
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(20);

  useEffect(() => {
    fadeAnim.value = withDelay(index * 60, withTiming(1, { duration: 350 }));
    slideAnim.value = withDelay(index * 60, withSpring(0, { damping: 14 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  const pnl = parseFloat(trade.profitLoss ?? '0');
  const isProfit = pnl >= 0;
  const pnlColor = isProfit ? COLORS.buy : COLORS.sell;
  const dirColor = trade.direction === 'BUY' ? COLORS.buy : COLORS.sell;

  return (
    <Animated.View style={[styles.tradeCard, animStyle]}>
      <View style={[styles.dirStripe, { backgroundColor: dirColor }]} />
      <View style={styles.tradeContent}>
        <View style={styles.tradeHeader}>
          <Text style={styles.tradeAsset}>{trade.asset}</Text>
          <View style={[styles.dirBadge, { backgroundColor: `${dirColor}22`, borderColor: dirColor }]}>
            <Text style={[styles.dirBadgeText, { color: dirColor }]}>{trade.direction}</Text>
          </View>
          <Text style={[styles.tradePnl, { color: pnlColor }]}>
            {isProfit ? '+' : ''}{trade.profitLoss ?? '0'}
          </Text>
        </View>

        <View style={styles.tradeDetails}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Entry</Text>
            <Text style={styles.detailValue}>{trade.entryPrice}</Text>
          </View>
          <Ionicons name="arrow-forward" size={12} color={COLORS.textMuted} style={{ alignSelf: 'flex-end', marginBottom: 2 }} />
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Exit</Text>
            <Text style={styles.detailValue}>{trade.exitPrice ?? '—'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Size</Text>
            <Text style={styles.detailValue}>{trade.positionSize}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{formatDuration(trade.entryTime, trade.exitTime)}</Text>
          </View>
        </View>

        <View style={styles.tradeFooter}>
          <Text style={styles.tradeDate}>{formatDate(trade.exitTime)}</Text>
          {trade.closeReason && (
            <View style={styles.reasonBadge}>
              <Text style={styles.reasonText}>{trade.closeReason.replace('_', ' ').toUpperCase()}</Text>
            </View>
          )}
          {trade.profitLossPercentage != null && (
            <Text style={[styles.pnlPct, { color: pnlColor }]}>
              {isProfit ? '+' : ''}{trade.profitLossPercentage.toFixed(2)}%
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

export const TradeHistoryScreen: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirFilter, setDirFilter] = useState<DirectionFilter>('All');

  const loadTrades = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await tradeService.getTrades({ limit: 100, status: 'closed' });
      setTrades(data);
    } catch {
      setError('Failed to load trade history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await tradeService.getTrades({ limit: 100, status: 'closed' });
      setTrades(data);
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadTrades(); }, [loadTrades]);

  const filteredTrades = trades.filter((t) => {
    if (dirFilter === 'All') return true;
    return t.direction === dirFilter;
  });

  const totalPnl = filteredTrades.reduce((sum, t) => sum + parseFloat(t.profitLoss ?? '0'), 0);
  const wins = filteredTrades.filter((t) => parseFloat(t.profitLoss ?? '0') >= 0).length;
  const winRate = filteredTrades.length > 0 ? (wins / filteredTrades.length) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Trade History</Text>
      </View>

      {/* Stats bar */}
      {!isLoading && filteredTrades.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{filteredTrades.length}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Win Rate</Text>
            <Text style={[styles.statValue, { color: COLORS.buy }]}>{winRate.toFixed(0)}%</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Net P&L</Text>
            <Text style={[styles.statValue, { color: totalPnl >= 0 ? COLORS.buy : COLORS.sell }]}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {/* Direction filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {DIRECTION_FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, dirFilter === f && styles.filterChipActive]}
            onPress={() => setDirFilter(f)}
          >
            <Text style={[styles.filterChipText, dirFilter === f && styles.filterChipTextActive]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {isLoading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        <FlatList
          data={filteredTrades}
          keyExtractor={(item) => item.tradeId}
          renderItem={({ item, index }) => <TradeHistoryCard trade={item} index={index} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No trade history</Text>
              <Text style={styles.emptySubtitle}>
                Closed trades will appear here once positions are settled.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerRow: {
    paddingHorizontal: SPACING.md,
    paddingTop: 20,
    paddingBottom: 12,
  },
  screenTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes['3xl'],
    fontWeight: FONTS.weights.extrabold,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginBottom: 3,
  },
  statValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
  filterScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: SPACING.md,
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  filterChipTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,59,92,0.1)',
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  tradeCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md,
    marginVertical: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dirStripe: {
    width: 4,
  },
  tradeContent: {
    flex: 1,
    padding: SPACING.md,
  },
  tradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  tradeAsset: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    flex: 1,
  },
  dirBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  dirBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
  },
  tradePnl: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  tradeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailCol: {
    alignItems: 'center',
  },
  detailDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginBottom: 2,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  tradeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tradeDate: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    flex: 1,
  },
  reasonBadge: {
    backgroundColor: COLORS.bgCardElevated,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reasonText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: FONTS.weights.semibold,
    letterSpacing: 0.4,
  },
  pnlPct: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
