import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS, ENDPOINTS } from '../config/api';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Returns true when the app is running inside Expo Go.
 * In Expo Go, remote push notifications are not supported (SDK 53+).
 * Local notifications still work.
 */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

/**
 * Notification service wraps Expo Notifications for push notification setup.
 * Expo SDK 51 notification APIs require the expo-notifications package.
 * This service provides a graceful wrapper that degrades when the package
 * is not available in the current environment (e.g., Expo Go without native config).
 */
class NotificationService {
  private initialized = false;

  /**
   * Request notification permissions from the OS.
   * Returns true if permission was granted.
   * Skipped in Expo Go — remote push not supported there (SDK 53+).
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    // Expo Go does not support push notifications — skip to suppress the warning
    if (isExpoGo()) return false;

    try {
      // Dynamic import to avoid hard crash when expo-notifications is not linked
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      console.warn('[Notifications] expo-notifications not available');
      return false;
    }
  }

  /**
   * Initialize the notification service and configure foreground handler.
   * Skipped in Expo Go — remote push not supported there (SDK 53+).
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    // Expo Go does not support push notifications — skip to suppress the warning
    if (isExpoGo()) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      this.initialized = true;
    } catch {
      console.warn('[Notifications] Failed to initialize notification handler');
    }
  }

  /**
   * Schedule a local notification immediately.
   */
  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
        },
        trigger: null, // Show immediately
      });
    } catch {
      console.warn('[Notifications] Failed to show local notification');
    }
  }

  /**
   * Register the device's Expo push token with the backend.
   * Requires a dev/production build — skipped in Expo Go (SDK 53+).
   *
   * @param authToken  JWT of the authenticated user (for the Authorization header)
   */
  async registerPushToken(authToken: string): Promise<void> {
    // Expo Go does not support remote push tokens
    if (isExpoGo()) return;
    try {
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');

      // getExpoPushTokenAsync requires projectId from EAS config
      const projectId: string | undefined =
        Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

      if (!projectId) {
        if (__DEV__) {
          console.warn(
            '[Notifications] No EAS projectId found in app.json. ' +
              'Push token registration skipped.',
          );
        }
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const pushToken = tokenData.data;

      // POST to backend
      await axios.post(
        `${API_BASE_URL}${ENDPOINTS.notifications.register}`,
        { token: pushToken, platform: Platform.OS },
        {
          timeout: API_TIMEOUT_MS,
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (err) {
      // Non-fatal — push token registration should never block the user
      if (__DEV__) {
        console.warn('[Notifications] Push token registration failed:', err);
      }
    }
  }

  /**
   * Add a listener for when the user taps a notification.
   */
  addNotificationResponseListener(
    handler: (response: import('expo-notifications').NotificationResponse) => void,
  ): (() => void) | null {
    try {
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');
      const subscription = Notifications.addNotificationResponseListener(handler);
      return () => subscription.remove();
    } catch {
      return null;
    }
  }

  /**
   * Get the Expo push token for this device.
   * Requires a dev/production build — skipped in Expo Go (SDK 53+).
   */
  async getPushToken(): Promise<string | null> {
    if (isExpoGo()) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      if (!projectId) {
        if (__DEV__) {
          console.warn(
            '[Notifications] No EAS projectId found in app.json. ' +
              'getPushToken skipped.',
          );
        }
        return null;
      }
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      return token.data;
    } catch {
      console.warn('[Notifications] Failed to get push token');
      return null;
    }
  }
}

export const notificationService = new NotificationService();
