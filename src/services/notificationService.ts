import { Platform } from 'react-native';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
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
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

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
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

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
   * Get the Expo push token for this device.
   */
  async getPushToken(): Promise<string | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');
      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch {
      console.warn('[Notifications] Failed to get push token');
      return null;
    }
  }
}

export const notificationService = new NotificationService();
