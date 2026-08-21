import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { subscriptionService, PurchasesPackage, PurchasesOfferings } from '../../services/subscriptionService';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { SkeletonCard } from '../../components/SkeletonCard';
import { COLORS, FONTS, RADIUS, SPACING } from '../../theme';

// ---------------------------------------------------------------------------
// Plan option derived from a RevenueCat package
// ---------------------------------------------------------------------------

interface PlanOption {
  id: string;
  title: 'Monthly' | 'Quarterly' | 'Yearly';
  price: number;
  priceString: string;
  monthlyEquivalent: number;
  savingsPercent: number;
  isRecommended: boolean;
  pkg: PurchasesPackage;
}

function buildPlanOptions(offerings: PurchasesOfferings): PlanOption[] {
  const current = offerings.current;
  if (!current) return [];

  const monthly = current.monthly;
  const quarterly = current.threeMonth;
  const yearly = current.annual;

  const monthlyPrice = monthly?.product.price ?? 0;

  const options: PlanOption[] = [];

  if (monthly) {
    options.push({
      id: monthly.identifier,
      title: 'Monthly',
      price: monthly.product.price,
      priceString: monthly.product.priceString,
      monthlyEquivalent: monthly.product.price,
      savingsPercent: 0,
      isRecommended: false,
      pkg: monthly,
    });
  }

  if (quarterly) {
    const monthlyEq = quarterly.product.price / 3;
    options.push({
      id: quarterly.identifier,
      title: 'Quarterly',
      price: quarterly.product.price,
      priceString: quarterly.product.priceString,
      monthlyEquivalent: monthlyEq,
      savingsPercent: monthlyPrice > 0
        ? Math.round((1 - monthlyEq / monthlyPrice) * 100)
        : 0,
      isRecommended: true,
      pkg: quarterly,
    });
  }

  if (yearly) {
    const monthlyEq = yearly.product.price / 12;
    options.push({
      id: yearly.identifier,
      title: 'Yearly',
      price: yearly.product.price,
      priceString: yearly.product.priceString,
      monthlyEquivalent: monthlyEq,
      savingsPercent: monthlyPrice > 0
        ? Math.round((1 - monthlyEq / monthlyPrice) * 100)
        : 0,
      isRecommended: false,
      pkg: yearly,
    });
  }

  return options;
}

// ---------------------------------------------------------------------------
// PlanCard
// ---------------------------------------------------------------------------

interface PlanCardProps {
  plan: PlanOption;
  selected: boolean;
  onSelect: () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, selected, onSelect }) => (
  <Pressable
    onPress={onSelect}
    style={[styles.planCard, selected && styles.planCardSelected]}
    accessibilityRole="button"
    accessibilityLabel={`Select ${plan.title} plan, ${plan.priceString}`}
    accessibilityState={{ selected }}
  >
    {plan.isRecommended && (
      <View style={styles.bestValueBadge}>
        <Text style={styles.bestValueText}>BEST VALUE</Text>
      </View>
    )}
    <View style={styles.planCardRow}>
      <View style={styles.planCardLeft}>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected && <View style={styles.radioDot} />}
        </View>
        <View>
          <Text style={styles.planTitle}>{plan.title}</Text>
          {plan.savingsPercent > 0 && (
            <Text style={styles.savingsText}>Save {plan.savingsPercent}%</Text>
          )}
        </View>
      </View>
      <View style={styles.planCardRight}>
        <Text style={styles.planPrice}>{plan.priceString}</Text>
        {plan.title !== 'Monthly' && (
          <Text style={styles.planMonthlyEq}>
            ~${plan.monthlyEquivalent.toFixed(2)}/mo
          </Text>
        )}
      </View>
    </View>
  </Pressable>
);

// ---------------------------------------------------------------------------
// PaywallScreen
// ---------------------------------------------------------------------------

export const PaywallScreen: React.FC = () => {
  const { setSubscription } = useSubscriptionStore();

  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [sdkUnavailable, setSdkUnavailable] = useState(false);

  // Load offerings on mount
  useEffect(() => {
    void (async () => {
      try {
        const offerings = await subscriptionService.getOfferings();
        const options = buildPlanOptions(offerings);
        setPlans(options);

        if (options.length === 0) {
          setSdkUnavailable(true);
        } else {
          // Pre-select the recommended plan
          const recommended = options.find((p) => p.isRecommended) ?? options[0];
          setSelectedPlanId(recommended.id);
        }
      } catch (err) {
        setError('Failed to load subscription plans. Please try again.');
      } finally {
        setIsLoadingOfferings(false);
      }
    })();
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (!selectedPlanId) return;
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) return;

    setError(null);
    setInfoMessage(null);
    setIsPurchasing(true);
    try {
      const customerInfo = await subscriptionService.purchasePackage(plan.pkg);
      setSubscription(customerInfo);
      // RootNavigator reacts to isSubscribed changing to true automatically
    } catch (err: unknown) {
      // User cancellation is not an error — detect by error code or message
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('cancel') ||
        msg.includes('ERR_CANCELED') ||
        msg.includes('Purchase was cancelled')
      ) {
        // silently dismiss
      } else {
        setError(msg || 'Purchase failed. Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [selectedPlanId, plans, setSubscription]);

  const handleRestore = useCallback(async () => {
    setError(null);
    setInfoMessage(null);
    setIsRestoring(true);
    try {
      const customerInfo = await subscriptionService.restorePurchases();
      if (subscriptionService.hasActiveEntitlement(customerInfo, 'pro')) {
        setSubscription(customerInfo);
        // Navigation handled by store update in RootNavigator
      } else {
        setInfoMessage('No active subscription found.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Restore failed. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }, [setSubscription]);

  return (
    <LinearGradient colors={COLORS.gradientBg} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={COLORS.gradientBuy}
            style={styles.headerIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="trending-up" size={32} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.headerTitle}>Unlock Slick AI Pro</Text>
          <Text style={styles.headerSubtitle}>
            Get real-time AI signals, broker automation, and unlimited trading features.
          </Text>
        </View>

        {/* Feature bullets */}
        <View style={styles.featureList}>
          {[
            { icon: 'flash', label: 'Real-time AI trading signals' },
            { icon: 'robot-outline' as const, label: 'Automated trade execution' },
            { icon: 'bar-chart', label: 'Live portfolio tracking' },
            { icon: 'shield-checkmark', label: 'Risk management tools' },
          ].map(({ icon, label }) => (
            <View key={label} style={styles.featureRow}>
              <Ionicons name={icon as 'flash'} size={18} color={COLORS.primary} style={styles.featureIcon} />
              <Text style={styles.featureLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.plansSection}>
          {isLoadingOfferings ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : sdkUnavailable ? (
            <View style={styles.unavailableCard}>
              <Ionicons name="information-circle-outline" size={28} color={COLORS.warning} />
              <Text style={styles.unavailableTitle}>Plans Unavailable</Text>
              <Text style={styles.unavailableBody}>
                Subscription purchases require a development or production build.
                They are not available in Expo Go.
              </Text>
            </View>
          ) : (
            plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedPlanId === plan.id}
                onSelect={() => setSelectedPlanId(plan.id)}
              />
            ))
          )}
        </View>

        {/* Error / info banners */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.errorText}> {error}</Text>
          </View>
        )}
        {infoMessage && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={16} color={COLORS.info} />
            <Text style={styles.infoText}> {infoMessage}</Text>
          </View>
        )}

        {/* CTAs */}
        {!sdkUnavailable && (
          <>
            <Pressable
              style={[
                styles.subscribeButton,
                (isPurchasing || !selectedPlanId) && styles.buttonDisabled,
              ]}
              onPress={handleSubscribe}
              disabled={isPurchasing || !selectedPlanId || isLoadingOfferings}
              accessibilityRole="button"
              accessibilityLabel="Subscribe to selected plan"
              accessibilityHint="Starts the purchase flow for the selected subscription plan"
              accessibilityState={{ disabled: isPurchasing || !selectedPlanId || isLoadingOfferings }}
            >
              <LinearGradient
                colors={COLORS.gradientBuy}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.subscribeGradient}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.subscribeText}>Subscribe Now</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              style={[styles.restoreButton, isRestoring && styles.buttonDisabled]}
              onPress={handleRestore}
              disabled={isRestoring || isLoadingOfferings}
              accessibilityRole="button"
              accessibilityLabel="Restore previous purchases"
              accessibilityHint="Restores any previously purchased subscriptions"
              accessibilityState={{ disabled: isRestoring || isLoadingOfferings }}
            >
              {isRestoring ? (
                <ActivityIndicator color={COLORS.textSecondary} size="small" />
              ) : (
                <Text style={styles.restoreText}>Restore Purchase</Text>
              )}
            </Pressable>
          </>
        )}

        <Text style={styles.legal}>
          Subscription renews automatically. Cancel anytime in your store settings.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl + SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  header: { alignItems: 'center', marginBottom: SPACING.lg },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes['3xl'],
    fontWeight: FONTS.weights.extrabold,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  featureList: {
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
  },
  featureIcon: { marginRight: SPACING.sm },
  featureLabel: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
  },
  plansSection: { marginBottom: SPACING.md },
  planCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.bgCardElevated,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -1,
    right: SPACING.md,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: RADIUS.sm,
    borderBottomRightRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  bestValueText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
  planCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planCardLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  planCardRight: { alignItems: 'flex-end' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: COLORS.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  planTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
  },
  savingsText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  planPrice: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
  planMonthlyEq: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  unavailableCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.warning,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  unavailableTitle: {
    color: COLORS.warning,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
  unavailableBody: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,92,0.12)',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm + 4,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: { color: COLORS.error, fontSize: FONTS.sizes.sm, flex: 1 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,132,255,0.12)',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm + 4,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.info,
  },
  infoText: { color: COLORS.info, fontSize: FONTS.sizes.sm, flex: 1 },
  subscribeButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  subscribeGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  subscribeText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  buttonDisabled: { opacity: 0.6 },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm + 4,
    marginBottom: SPACING.sm,
  },
  restoreText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  legal: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: SPACING.sm,
  },
});
