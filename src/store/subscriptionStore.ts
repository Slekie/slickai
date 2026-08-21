import { create } from 'zustand';
import { CustomerInfo } from '../services/subscriptionService';

// ---------------------------------------------------------------------------
// Plan name mapping from RevenueCat productIdentifier
// ---------------------------------------------------------------------------

type PlanName = 'Monthly' | 'Quarterly' | 'Yearly';

function mapProductIdToPlanName(productIdentifier: string): PlanName | null {
  const lower = productIdentifier.toLowerCase();
  if (lower.includes('monthly')) return 'Monthly';
  if (lower.includes('quarterly')) return 'Quarterly';
  if (lower.includes('yearly') || lower.includes('annual')) return 'Yearly';
  return null;
}

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

export interface SubscriptionState {
  isSubscribed: boolean;
  planName: PlanName | null;
  expiresAt: string | null;    // ISO 8601
  isLoading: boolean;
  error: string | null;

  // Actions
  setSubscription: (info: CustomerInfo) => void;
  clearSubscription: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  isSubscribed: false,
  planName: null,
  expiresAt: null,
  isLoading: false,
  error: null,

  setSubscription: (info: CustomerInfo) => {
    const proEntitlement = info.entitlements.active['pro'];

    if (!proEntitlement) {
      set({
        isSubscribed: false,
        planName: null,
        expiresAt: null,
      });
      return;
    }

    const planName = mapProductIdToPlanName(proEntitlement.productIdentifier);

    set({
      isSubscribed: true,
      planName,
      expiresAt: proEntitlement.expirationDate,
    });
  },

  clearSubscription: () => {
    set({
      isSubscribed: false,
      planName: null,
      expiresAt: null,
      isLoading: false,
      error: null,
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
