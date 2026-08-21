import React, { useCallback, useEffect, useState } from 'react';
import {
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
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TradeCard } from '../../components/TradeCard';
import { EquityChart } from '../../components/EquityChart';
import { SkeletonCard } from '../../components/SkeletonCard';
import { LiveDot } from '../../components/LiveDot';
import { AutomatedBanner } from '../../components/AutomatedBanner';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { useTradeStore } from '../../store/tradeStore';
import { tradeService } from '../../services/tradeService';
import { useAccountStore } from '../../store/accountStore';
import { useAuthStore } from '../../store/authStore';
import { COLORS, FONTS, RADIUS, SPACING } from '../../theme';

type Period = '1D' | '7D' | '30D' | 'ALL';
const PERIODS: Period[] = ['1D', '7D', '30D', 'ALL'];

export const DashboardScreen: React.FC = () => {
  const {
    openPositions,
    performanceSummary,
    selectedPeriod,
    setOpenPositions,
    setPerformanceSummary,
    setSelectedPeriod,
    isLoading,
    setLoading,
    setError,
    error,
  } = useTradeStore();

  const { accounts } = useAccountStore();
  const { user } = useAuthStore();
  const [equityData] = useState<{ timestamp: string; equity: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [wsConnected] = useState(true); // Reflect WS state here

  const hasAutomatedAccount = accounts.some((a) => a.subscriptionMode === 'automated_trading');

  // Header animation
  const headerOpacity = useSharedValue(0);
  const headerSlide = useSharedValue(-20);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500 });
    headerSlide.value = withSpring(0, { damping: 14 });
  }, []);

  const headerAnimStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerSlide.value }],
  }));

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [positions, summary] = await Promise.all([
        tradeService.getOpenPositions(),
        tradeService.getPerformanceSummary(selectedPeriod),
      ]);
      setOpenPositions(positions);
      setPerformanceSummary(summary);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, setOpenPositions, setPerformanceSummary, setError, setLoading]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [positions, summary] = await Promise.all([
        tradeService.getOpenPositions(),
        tradeService.getPerformanceSummary(selectedPeriod),
      ]);
      setOpenPositions(positions);
      setPerformanceSummary(summary);
    } catch {
      // Silently fail on pull-to-refresh
    } finally {
      setRefreshing(false);
    }
  }, [selectedPeriod, setOpenPositions, setPerformanceSummary]);

  const totalPnl = performanceSummary?.totalPnl ?? '0';
  const pnlValue = parseFloat(totalPnl);
  const pnlColor = pnlValue >= 0 ? COLORS.buy : COLORS.sell;

  const greeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.email?.split('@')[0] ?? 'Trader';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <Animated.View style={[styles.headerRow, headerAnimStyle]}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName}>{firstName}</Text>
        </View>
        <View style={styles.headerRight}>
          {wsConnected && (
            <View style={styles.liveRow}>
              <LiveDot size={7} />
              <Text style={styles.liveText}> LIVE</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Automated trading banner */}
      {hasAutomatedAccount && (
        <AutomatedBanner />
      )}

      {/* Period filter tabs */}
      <View style={styles.periodTabs}>
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            style={[styles.tab, selectedPeriod === p && styles.tabActive]}
            onPress={() => setSelectedPeriod(p)}
            accessibilityRole="tab"
            accessibilityLabel={`${p} period`}
            accessibilityState={{ selected: selectedPeriod === p }}
          >
            <Text style={[styles.tabText, selectedPeriod === p && styles.tabTextActive]}>
              {p}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={15} color={COLORS.error} />
          <Text style={styles.errorText}> {error}</Text>
        </View>
      )}

      {isLoading && !performanceSummary ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        <>
          {/* Summary cards */}
          <View style={styles.summaryGrid}>
            <LinearGradient
              colors={pnlValue >= 0 ? ['rgba(0,200,81,0.12)', COLORS.bgCard] : ['rgba(255,59,92,0.12)', COLORS.bgCard]}
              style={styles.summaryCardLarge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.summaryLabel}>Total P&L</Text>
              <AnimatedNumber
                value={pnlValue}
                decimals={2}
                style={styles.summaryValueLarge}
                color={pnlColor}
              />
            </LinearGradient>

            <View style={styles.summaryRight}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Win Rate</Text>
                <Text style={styles.summaryValue}>
                  {performanceSummary ? `${(performanceSummary.winRate * 100).toFixed(1)}%` : '—'}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Trades</Text>
                <Text style={styles.summaryValue}>
                  {performanceSummary?.tradeCount ?? '—'}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Open</Text>
                <Text style={[styles.summaryValue, { color: COLORS.info }]}>
                  {performanceSummary?.openPositionCount ?? openPositions.length}
                </Text>
              </View>
            </View>
          </View>

          {/* Equity chart */}
          <Text style={styles.sectionTitle}>Equity Curve</Text>
          <EquityChart data={equityData} height={180} />

          {/* Open positions */}
          <Text style={styles.sectionTitle}>
            Open Positions ({openPositions.length})
          </Text>

          {openPositions.length === 0 ? (
            <View style={styles.emptyPositions}>
              <Ionicons name="analytics-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No open positions</Text>
              <Text style={styles.emptySubtitle}>
                {hasAutomatedAccount
                  ? 'AI will open positions based on signals'
                  : 'Positions will appear here when trades are active'}
              </Text>
            </View>
          ) : (
            openPositions.map((p, i) => {
              const account = accounts.find((a) => a.accountId === p.userAccountId);
              const isAutomated = account?.subscriptionMode === 'automated_trading';
              return (
                <TradeCard
                  key={p.tradeId}
                  position={p}
                  isAutomatedAccount={isAutomated}
                  index={i}
                />
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingTop: 20,
    paddingBottom: 16,
  },
  greeting: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  userName: {
    color: COLORS.text,
    fontSize: FONTS.sizes['2xl'],
    fontWeight: FONTS.weights.extrabold,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    marginTop: 4,
  },
  liveText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.8,
  },
  periodTabs: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,92,0.1)',
    marginHorizontal: SPACING.md,
    marginBottom: 12,
    borderRadius: RADIUS.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    marginHorizontal: SPACING.sm,
    marginBottom: 20,
    gap: SPACING.sm,
  },
  summaryCardLarge: {
    flex: 1.2,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
  },
  summaryRight: {
    flex: 1,
    gap: SPACING.xs,
  },
  summaryCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    padding: 10,
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginBottom: 4,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
  summaryValueLarge: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: FONTS.weights.extrabold,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    paddingHorizontal: SPACING.md,
    marginBottom: 8,
    marginTop: 4,
  },
  emptyPositions: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    marginTop: 12,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
