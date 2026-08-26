import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { subscriptionService } from "../../services/subscriptionService";
import type { PurchasesPackage, PurchasesOfferings } from "../../services/subscriptionService";
import { useSubscriptionStore } from "../../store/subscriptionStore";
import { useAuthStore } from "../../store/authStore";
import { SkeletonCard } from "../../components/SkeletonCard";
import { COLORS, FONTS, RADIUS, SPACING } from "../../theme";

interface PlanOption {
  id: string;
  title: "Monthly" | "Quarterly" | "Yearly";
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
  const monthly   = current.monthly;
  const quarterly = current.threeMonth;
  const yearly    = current.annual;
  const monthlyPrice = monthly?.product.price ?? 0;
  const options: PlanOption[] = [];
  if (monthly) {
    options.push({ id: monthly.identifier, title: "Monthly", price: monthly.product.price, priceString: monthly.product.priceString, monthlyEquivalent: monthly.product.price, savingsPercent: 0, isRecommended: false, pkg: monthly });
  }
  if (quarterly) {
    const monthlyEq = quarterly.product.price / 3;
    options.push({ id: quarterly.identifier, title: "Quarterly", price: quarterly.product.price, priceString: quarterly.product.priceString, monthlyEquivalent: monthlyEq, savingsPercent: monthlyPrice > 0 ? Math.round((1 - monthlyEq / monthlyPrice) * 100) : 0, isRecommended: true, pkg: quarterly });
  }
  if (yearly) {
    const monthlyEq = yearly.product.price / 12;
    options.push({ id: yearly.identifier, title: "Yearly", price: yearly.product.price, priceString: yearly.product.priceString, monthlyEquivalent: monthlyEq, savingsPercent: monthlyPrice > 0 ? Math.round((1 - monthlyEq / monthlyPrice) * 100) : 0, isRecommended: false, pkg: yearly });
  }
  return options;
}

interface PlanCardProps { plan: PlanOption; selected: boolean; onSelect: () => void; }

const PlanCard: React.FC<PlanCardProps> = ({ plan, selected, onSelect }) => (
  <Pressable onPress={onSelect} style={[styles.planCard, selected && styles.planCardSelected]} accessibilityRole="button" accessibilityLabel={`Select ${plan.title} plan, ${plan.priceString}`} accessibilityState={{ selected }}>
    {plan.isRecommended && (<View style={styles.bestValueBadge}><Text style={styles.bestValueText}>BEST VALUE</Text></View>)}
    <View style={styles.planCardRow}>
      <View style={styles.planCardLeft}>
        <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View>
        <View>
          <Text style={styles.planTitle}>{plan.title}</Text>
          {plan.savingsPercent > 0 && <Text style={styles.savingsText}>Save {plan.savingsPercent}%</Text>}
        </View>
      </View>
      <View style={styles.planCardRight}>
        <Text style={styles.planPrice}>{plan.priceString}</Text>
        {plan.title !== "Monthly" && <Text style={styles.planMonthlyEq}>~${plan.monthlyEquivalent.toFixed(2)}/mo</Text>}
      </View>
    </View>
  </Pressable>
);

interface PaywallScreenProps { onSkip?: () => void; }

export const PaywallScreen: React.FC<PaywallScreenProps> = ({ onSkip }) => {
  const { setSubscription } = useSubscriptionStore();
  const { logout } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [plans, setPlans]                           = useState<PlanOption[]>([]);
  const [selectedPlanId, setSelectedPlanId]         = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing]             = useState(false);
  const [isRestoring, setIsRestoring]               = useState(false);
  const [error, setError]                           = useState<string | null>(null);
  const [infoMessage, setInfoMessage]               = useState<string | null>(null);
  const [sdkUnavailable, setSdkUnavailable]         = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const offerings = await subscriptionService.getOfferings();
        const options   = buildPlanOptions(offerings);
        setPlans(options);
        if (options.length === 0) { setSdkUnavailable(true); }
        else {
          const recommended = options.find((p) => p.isRecommended) ?? options[0];
          if (recommended) setSelectedPlanId(recommended.id);
        }
      } catch { setError("Failed to load subscription plans. Please try again."); }
      finally  { setIsLoadingOfferings(false); }
    })();
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (!selectedPlanId) return;
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) return;
    setError(null); setInfoMessage(null); setIsPurchasing(true);
    try {
      const customerInfo = await subscriptionService.purchasePackage(plan.pkg);
      setSubscription(customerInfo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isCancelled = msg.includes("cancel") || msg.includes("ERR_CANCELED") || msg.includes("Purchase was cancelled");
      if (!isCancelled) setError(msg || "Purchase failed. Please try again.");
    } finally { setIsPurchasing(false); }
  }, [selectedPlanId, plans, setSubscription]);

  const handleRestore = useCallback(async () => {
    setError(null); setInfoMessage(null); setIsRestoring(true);
    try {
      const customerInfo = await subscriptionService.restorePurchases();
      if (subscriptionService.hasActiveEntitlement(customerInfo, "pro")) { setSubscription(customerInfo); }
      else { setInfoMessage("No active subscription found."); }
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Restore failed. Please try again."); }
    finally { setIsRestoring(false); }
  }, [setSubscription]);

  const handleLogout = useCallback(async () => { await logout(); }, [logout]);

  return (
    <LinearGradient colors={COLORS.gradientBg} style={styles.container}>
      {/* Top bar: Log Out (left) + Skip (right) */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.topBarButton} onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Log out">
          <Ionicons name="log-out-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.topBarButtonText}>Log Out</Text>
        </Pressable>
        {onSkip !== undefined && (
          <Pressable style={styles.topBarButton} onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip to dashboard">
            <Text style={styles.skipText}>Skip</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <LinearGradient colors={COLORS.gradientBuy} style={styles.headerIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="trending-up" size={32} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.headerTitle}>Unlock Slick AI Pro</Text>
          <Text style={styles.headerSubtitle}>Get real-time AI signals, broker automation, and unlimited trading features.</Text>
        </View>

        <View style={styles.featureList}>
          {([
            { icon: "flash",            label: "Real-time AI trading signals" },
            { icon: "hardware-chip",    label: "Automated trade execution" },
            { icon: "bar-chart",        label: "Live portfolio tracking" },
            { icon: "shield-checkmark", label: "Risk management tools" },
          ] as const).map(({ icon, label }) => (
            <View key={label} style={styles.featureRow}>
              <Ionicons name={icon} size={18} color={COLORS.primary} style={styles.featureIcon} />
              <Text style={styles.featureLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plansSection}>
          {isLoadingOfferings ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : sdkUnavailable ? (
            <View style={styles.unavailableCard}>
              <Ionicons name="information-circle-outline" size={28} color={COLORS.warning} />
              <Text style={styles.unavailableTitle}>Plans Unavailable</Text>
              <Text style={styles.unavailableBody}>Subscription purchases require a development or production build. Not available in Expo Go.</Text>
            </View>
          ) : (
            plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} selected={selectedPlanId === plan.id} onSelect={() => setSelectedPlanId(plan.id)} />
            ))
          )}
        </View>

        {error !== null && (
          <View style={styles.errorBanner}><Ionicons name="alert-circle" size={16} color={COLORS.error} /><Text style={styles.errorText}> {error}</Text></View>
        )}
        {infoMessage !== null && (
          <View style={styles.infoBanner}><Ionicons name="information-circle" size={16} color={COLORS.info} /><Text style={styles.infoText}> {infoMessage}</Text></View>
        )}

        {!sdkUnavailable && (
          <>
            <Pressable style={[styles.subscribeButton, (isPurchasing || selectedPlanId === null) && styles.buttonDisabled]} onPress={handleSubscribe} disabled={isPurchasing || selectedPlanId === null || isLoadingOfferings} accessibilityRole="button" accessibilityLabel="Subscribe to selected plan" accessibilityState={{ disabled: isPurchasing || selectedPlanId === null || isLoadingOfferings }}>
              <LinearGradient colors={COLORS.gradientBuy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.subscribeGradient}>
                {isPurchasing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.subscribeText}>Subscribe Now</Text>}
              </LinearGradient>
            </Pressable>
            <Pressable style={[styles.restoreButton, isRestoring && styles.buttonDisabled]} onPress={handleRestore} disabled={isRestoring || isLoadingOfferings} accessibilityRole="button" accessibilityLabel="Restore previous purchases" accessibilityState={{ disabled: isRestoring || isLoadingOfferings }}>
              {isRestoring ? <ActivityIndicator color={COLORS.textSecondary} size="small" /> : <Text style={styles.restoreText}>Restore Purchase</Text>}
            </Pressable>
          </>
        )}

        {onSkip !== undefined && (
          <Pressable style={styles.skipBottomButton} onPress={onSkip} accessibilityRole="button" accessibilityLabel="Continue without subscribing">
            <Text style={styles.skipBottomText}>Continue without subscribing →</Text>
          </Pressable>
        )}

        <Text style={styles.legal}>Subscription renews automatically. Cancel anytime in your store settings.</Text>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1 },
  topBar:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  topBarButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm },
  topBarButtonText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.medium },
  skipText:     { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.medium },
  scrollContent:{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.xl },
  header:       { alignItems: "center", marginBottom: SPACING.lg },
  headerIcon:   { width: 72, height: 72, borderRadius: RADIUS.xl, alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  headerTitle:  { color: COLORS.text, fontSize: FONTS.sizes["3xl"], fontWeight: FONTS.weights.extrabold, textAlign: "center", marginBottom: SPACING.sm },
  headerSubtitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, textAlign: "center", lineHeight: 22, paddingHorizontal: SPACING.md },
  featureList:  { marginBottom: SPACING.lg, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  featureRow:   { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.xs + 2 },
  featureIcon:  { marginRight: SPACING.sm },
  featureLabel: { color: COLORS.text, fontSize: FONTS.sizes.md },
  plansSection: { marginBottom: SPACING.md },
  planCard:     { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm, position: "relative" },
  planCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.bgCardElevated },
  bestValueBadge: { position: "absolute", top: -1, right: SPACING.md, backgroundColor: COLORS.primary, borderBottomLeftRadius: RADIUS.sm, borderBottomRightRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  bestValueText:{ color: "#FFFFFF", fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: 0.5 },
  planCardRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planCardLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  planCardRight:{ alignItems: "flex-end" },
  radio:        { width: 20, height: 20, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  radioSelected:{ borderColor: COLORS.primary },
  radioDot:     { width: 10, height: 10, borderRadius: RADIUS.full, backgroundColor: COLORS.primary },
  planTitle:    { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.semibold },
  savingsText:  { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.medium },
  planPrice:    { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold },
  planMonthlyEq:{ color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  unavailableCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.warning, padding: SPACING.lg, alignItems: "center", gap: SPACING.sm },
  unavailableTitle: { color: COLORS.warning, fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold },
  unavailableBody:  { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, textAlign: "center", lineHeight: 20 },
  errorBanner:  { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,59,92,0.12)", borderRadius: RADIUS.sm, padding: SPACING.sm + 4, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.error },
  errorText:    { color: COLORS.error, fontSize: FONTS.sizes.sm, flex: 1 },
  infoBanner:   { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(10,132,255,0.12)", borderRadius: RADIUS.sm, padding: SPACING.sm + 4, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.info },
  infoText:     { color: COLORS.info, fontSize: FONTS.sizes.sm, flex: 1 },
  subscribeButton: { borderRadius: RADIUS.md, overflow: "hidden", marginBottom: SPACING.sm },
  subscribeGradient: { paddingVertical: 16, alignItems: "center" },
  subscribeText:{ color: "#FFFFFF", fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
  buttonDisabled: { opacity: 0.6 },
  restoreButton:{ alignItems: "center", paddingVertical: SPACING.sm + 4, marginBottom: SPACING.sm },
  restoreText:  { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.medium },
  skipBottomButton: { alignItems: "center", paddingVertical: SPACING.md, marginTop: SPACING.sm },
  skipBottomText:   { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  legal:        { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, textAlign: "center", lineHeight: 16, marginTop: SPACING.sm },
});
