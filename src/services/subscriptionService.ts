/**
 * subscriptionService.ts
 *
 * Wraps react-native-purchases (RevenueCat SDK) behind a safe dynamic import.
 *
 * EXPO GO CONSTRAINT:
 *   react-native-purchases requires a native build and is NOT available in Expo Go.
 *   This module uses dynamic require() inside a try/catch so the app never crashes
 *   in Expo Go. When the native module is unavailable, every method falls back to a
 *   stub that behaves as if the user has NO active subscription — meaning
 *   PaywallScreen will always be shown, which is the correct unauthenticated behaviour.
 *
 * When a real dev/production build is used (with react-native-purchases installed and
 * linked), the native SDK is loaded at runtime and all methods delegate to it.
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Local TypeScript interfaces — mirror the RevenueCat SDK shape
// ---------------------------------------------------------------------------

export interface EntitlementInfo {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  periodType: string;
  latestPurchaseDate: string;
  latestPurchaseDateMillis: number;
  originalPurchaseDate: string;
  originalPurchaseDateMillis: number;
  expirationDate: string | null;
  expirationDateMillis: number | null;
  store: string;
  productIdentifier: string;
  isSandbox: boolean;
  unsubscribeDetectedAt: string | null;
  billingIssueDetectedAt: string | null;
}

export interface EntitlementsInfo {
  active: Record<string, EntitlementInfo>;
  all: Record<string, EntitlementInfo>;
}

export interface CustomerInfo {
  entitlements: EntitlementsInfo;
  activeSubscriptions: string[];
  allPurchasedProductIdentifiers: string[];
  latestExpirationDate: string | null;
  firstSeen: string;
  originalAppUserId: string;
  requestDate: string;
  originalApplicationVersion: string | null;
  originalPurchaseDate: string | null;
  managementURL: string | null;
  nonSubscriptionTransactions: unknown[];
}

export interface PurchasesPackage {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    description: string;
    title: string;
    price: number;
    priceString: string;
    currencyCode: string;
    introPrice: null | {
      price: number;
      priceString: string;
      period: string;
      cycles: number;
      periodUnit: string;
      periodNumberOfUnits: number;
    };
    discounts: unknown[] | null;
  };
  offeringIdentifier: string;
}

export interface PurchasesOffering {
  identifier: string;
  serverDescription: string;
  metadata: Record<string, unknown>;
  availablePackages: PurchasesPackage[];
  lifetime: PurchasesPackage | null;
  annual: PurchasesPackage | null;
  sixMonth: PurchasesPackage | null;
  threeMonth: PurchasesPackage | null;
  twoMonth: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
  weekly: PurchasesPackage | null;
}

export interface PurchasesOfferings {
  all: Record<string, PurchasesOffering>;
  current: PurchasesOffering | null;
}

// ---------------------------------------------------------------------------
// Internal types for the native SDK (only used inside this module)
// ---------------------------------------------------------------------------

interface PurchasesSDK {
  configure: (options: { apiKey: string; appUserID?: string | null }) => void;
  getOfferings: () => Promise<PurchasesOfferings>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases: () => Promise<CustomerInfo>;
  getCustomerInfo: () => Promise<CustomerInfo>;
  LOG_LEVEL?: { DEBUG: string; VERBOSE: string; INFO: string; WARN: string; ERROR: string };
  setLogLevel?: (level: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a minimal CustomerInfo with no active entitlements.
 * Used by stubs when the native SDK is unavailable.
 */
export function createEmptyCustomerInfo(): CustomerInfo {
  return {
    entitlements: {
      active: {},
      all: {},
    },
    activeSubscriptions: [],
    allPurchasedProductIdentifiers: [],
    latestExpirationDate: null,
    firstSeen: new Date().toISOString(),
    originalAppUserId: '',
    requestDate: new Date().toISOString(),
    originalApplicationVersion: null,
    originalPurchaseDate: null,
    managementURL: null,
    nonSubscriptionTransactions: [],
  };
}

function createEmptyOfferings(): PurchasesOfferings {
  return { all: {}, current: null };
}

// ---------------------------------------------------------------------------
// Dynamic SDK loading
// ---------------------------------------------------------------------------

let _sdk: PurchasesSDK | null = null;
let _sdkLoaded = false;

function getSDK(): PurchasesSDK | null {
  if (_sdkLoaded) return _sdk;
  _sdkLoaded = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-purchases') as { default?: PurchasesSDK } & PurchasesSDK;
    // The SDK exports a default object in some versions; handle both shapes.
    _sdk = (mod.default ?? mod) as PurchasesSDK;
    // Validate the SDK has the expected shape.
    if (typeof _sdk?.configure !== 'function') {
      _sdk = null;
    }
  } catch {
    // react-native-purchases is not installed or not linked (Expo Go).
    _sdk = null;
  }

  return _sdk;
}

// ---------------------------------------------------------------------------
// API key resolution
// ---------------------------------------------------------------------------

function getApiKey(): string {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
  }
  return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
}

// ---------------------------------------------------------------------------
// Public service object
// ---------------------------------------------------------------------------

export const subscriptionService = {
  /**
   * Configure the RevenueCat SDK with the appropriate platform API key.
   * Must be called once after the user is authenticated.
   * No-op when running in Expo Go (native module unavailable).
   */
  configure(userId: string): void {
    const sdk = getSDK();
    if (!sdk) {
      if (__DEV__) {
        console.warn(
          '[subscriptionService] react-native-purchases is not available ' +
            '(Expo Go or missing native module). Subscription features are stubbed.'
        );
      }
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey && __DEV__) {
      console.warn(
        '[subscriptionService] No RevenueCat API key found. ' +
          'Set EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY in your .env file.'
      );
    }

    sdk.configure({ apiKey, appUserID: userId });
  },

  /**
   * Fetch available offerings from RevenueCat.
   * Returns empty offerings when the native SDK is unavailable.
   */
  async getOfferings(): Promise<PurchasesOfferings> {
    const sdk = getSDK();
    if (!sdk) return createEmptyOfferings();

    return sdk.getOfferings();
  },

  /**
   * Purchase a package.
   * Throws "Purchases not available" when the native SDK is unavailable
   * (this prevents the PaywallScreen from thinking a purchase succeeded).
   */
  async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
    const sdk = getSDK();
    if (!sdk) {
      throw new Error('Purchases not available in this build. Please use a development or production build.');
    }

    const result = await sdk.purchasePackage(pkg);
    return result.customerInfo;
  },

  /**
   * Restore previous purchases.
   * Returns empty CustomerInfo (no entitlements) when the native SDK is unavailable.
   */
  async restorePurchases(): Promise<CustomerInfo> {
    const sdk = getSDK();
    if (!sdk) return createEmptyCustomerInfo();

    return sdk.restorePurchases();
  },

  /**
   * Fetch the current customer info / entitlement status.
   * Returns empty CustomerInfo (no entitlements) when the native SDK is unavailable.
   */
  async getCustomerInfo(): Promise<CustomerInfo> {
    const sdk = getSDK();
    if (!sdk) return createEmptyCustomerInfo();

    return sdk.getCustomerInfo();
  },

  /**
   * Check whether the given entitlement is currently active.
   *
   * @param info       CustomerInfo returned from any subscriptionService call
   * @param entitlement  Entitlement identifier, e.g. "pro"
   */
  hasActiveEntitlement(info: CustomerInfo, entitlement: string): boolean {
    return info.entitlements.active[entitlement] !== undefined;
  },
};
