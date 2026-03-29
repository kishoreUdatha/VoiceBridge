/**
 * Push Notification Service
 * Handles FCM push notifications and local notifications
 *
 * Required dependencies (install if not present):
 * - @react-native-firebase/app
 * - @react-native-firebase/messaging
 * - @notifee/react-native (for local notifications)
 */

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

// Storage keys
const FCM_TOKEN_KEY = '@voicebridge:fcm_token';
const NOTIFICATION_SETTINGS_KEY = '@voicebridge:notification_settings';

// Notification types
export type NotificationType =
  | 'NEW_ASSIGNMENT'
  | 'FOLLOW_UP_REMINDER'
  | 'LEAD_UPDATE'
  | 'CALLBACK_REMINDER'
  | 'AI_ANALYSIS_COMPLETE'
  | 'PERFORMANCE_ALERT'
  | 'SYSTEM';

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    leadId?: string;
    callId?: string;
    followUpId?: string;
    assignedDataId?: string;
    screen?: string;
    [key: string]: any;
  };
  timestamp: number;
}

export interface NotificationSettings {
  enabled: boolean;
  newAssignments: boolean;
  followUpReminders: boolean;
  leadUpdates: boolean;
  callbackReminders: boolean;
  aiAnalysis: boolean;
  performanceAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string;
  sound: boolean;
  vibrate: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  newAssignments: true,
  followUpReminders: true,
  leadUpdates: true,
  callbackReminders: true,
  aiAnalysis: true,
  performanceAlerts: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  sound: true,
  vibrate: true,
};

// Listeners for notification events
type NotificationListener = (notification: NotificationPayload) => void;

class NotificationService {
  private initialized: boolean = false;
  private fcmToken: string | null = null;
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private listeners: Set<NotificationListener> = new Set();
  private messaging: any = null;
  private notifee: any = null;

  /**
   * Initialize notification service
   * Note: Firebase/Notifee are optional - the service works without them
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true;

    console.log('[NotificationService] Initializing...');

    try {
      // Load saved settings first (this always works)
      await this.loadSettings();

      // Note: Firebase and Notifee require additional setup
      // For now, the service runs in basic mode without push notifications
      // To enable push notifications, install:
      // - @react-native-firebase/app
      // - @react-native-firebase/messaging
      // - @notifee/react-native
      console.log('[NotificationService] Running in basic mode (no push notification libraries installed)');

      this.initialized = true;
      console.log('[NotificationService] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[NotificationService] Initialization failed:', error);
      // Still mark as initialized to prevent retry loops
      this.initialized = true;
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.messaging) {
      console.warn('[NotificationService] Messaging not available');
      return false;
    }

    try {
      const authStatus = await this.messaging().requestPermission();
      const enabled =
        authStatus === this.messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === this.messaging.AuthorizationStatus.PROVISIONAL;

      console.log('[NotificationService] Permission status:', enabled ? 'granted' : 'denied');
      return enabled;
    } catch (error) {
      console.error('[NotificationService] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Get FCM token
   */
  async getToken(): Promise<string | null> {
    if (!this.messaging) return null;

    try {
      const token = await this.messaging().getToken();

      if (token && token !== this.fcmToken) {
        this.fcmToken = token;
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);

        // Register token with backend
        await this.registerTokenWithBackend(token);

        console.log('[NotificationService] FCM Token obtained');
      }

      return token;
    } catch (error) {
      console.error('[NotificationService] Failed to get token:', error);
      return null;
    }
  }

  /**
   * Register FCM token with backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      await api.post('/notifications/register-device', {
        token,
        platform: Platform.OS,
        deviceId: `${Platform.OS}-${Date.now()}`,
      });
      console.log('[NotificationService] Token registered with backend');
    } catch (error) {
      console.error('[NotificationService] Failed to register token:', error);
    }
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    if (!this.messaging) return;

    // Handle foreground messages
    this.messaging().onMessage(async (remoteMessage: any) => {
      console.log('[NotificationService] Foreground message received:', remoteMessage);

      const notification = this.parseRemoteMessage(remoteMessage);

      // Check if notification should be shown based on settings
      if (this.shouldShowNotification(notification)) {
        await this.showLocalNotification(notification);
        this.notifyListeners(notification);
      }
    });

    // Handle background message tap
    this.messaging().onNotificationOpenedApp((remoteMessage: any) => {
      console.log('[NotificationService] Notification opened app:', remoteMessage);
      const notification = this.parseRemoteMessage(remoteMessage);
      this.notifyListeners(notification);
    });

    // Handle token refresh
    this.messaging().onTokenRefresh(async (token: string) => {
      console.log('[NotificationService] Token refreshed');
      this.fcmToken = token;
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      await this.registerTokenWithBackend(token);
    });

    // Check if app was opened from notification
    this.messaging()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage) {
          console.log('[NotificationService] App opened from notification:', remoteMessage);
          const notification = this.parseRemoteMessage(remoteMessage);
          this.notifyListeners(notification);
        }
      });
  }

  /**
   * Parse remote message to notification payload
   */
  private parseRemoteMessage(remoteMessage: any): NotificationPayload {
    return {
      id: remoteMessage.messageId || `local-${Date.now()}`,
      type: (remoteMessage.data?.type as NotificationType) || 'SYSTEM',
      title: remoteMessage.notification?.title || 'VoiceBridge',
      body: remoteMessage.notification?.body || '',
      data: remoteMessage.data || {},
      timestamp: Date.now(),
    };
  }

  /**
   * Create notification channels for Android
   */
  private async createNotificationChannels(): Promise<void> {
    if (!this.notifee) return;

    try {
      // Main channel for important notifications
      await this.notifee.createChannel({
        id: 'voicebridge-main',
        name: 'VoiceBridge Notifications',
        importance: 4, // HIGH
        sound: 'default',
        vibration: true,
      });

      // Follow-up reminders channel
      await this.notifee.createChannel({
        id: 'voicebridge-reminders',
        name: 'Follow-up Reminders',
        importance: 4,
        sound: 'default',
        vibration: true,
      });

      // Quiet notifications channel
      await this.notifee.createChannel({
        id: 'voicebridge-quiet',
        name: 'Quiet Notifications',
        importance: 2, // LOW
        sound: undefined,
        vibration: false,
      });

      console.log('[NotificationService] Notification channels created');
    } catch (error) {
      console.error('[NotificationService] Failed to create channels:', error);
    }
  }

  /**
   * Show local notification
   */
  async showLocalNotification(notification: NotificationPayload): Promise<void> {
    if (!this.notifee) {
      // Fallback to Alert if Notifee not available
      Alert.alert(notification.title, notification.body);
      return;
    }

    try {
      const channelId = this.isQuietHours() ? 'voicebridge-quiet' : 'voicebridge-main';

      await this.notifee.displayNotification({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        android: {
          channelId,
          smallIcon: 'ic_notification',
          pressAction: {
            id: 'default',
          },
          ...(this.settings.sound && { sound: 'default' }),
        },
        data: notification.data,
      });

      console.log('[NotificationService] Local notification displayed');
    } catch (error) {
      console.error('[NotificationService] Failed to show notification:', error);
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification(
    notification: Omit<NotificationPayload, 'id' | 'timestamp'>,
    triggerTime: Date
  ): Promise<string | null> {
    if (!this.notifee) {
      console.warn('[NotificationService] Notifee not available for scheduling');
      return null;
    }

    try {
      const notificationId = `scheduled-${Date.now()}`;

      await this.notifee.createTriggerNotification(
        {
          id: notificationId,
          title: notification.title,
          body: notification.body,
          android: {
            channelId: 'voicebridge-reminders',
            smallIcon: 'ic_notification',
            pressAction: { id: 'default' },
          },
          data: notification.data,
        },
        {
          type: 0, // TIMESTAMP
          timestamp: triggerTime.getTime(),
        }
      );

      console.log('[NotificationService] Notification scheduled for:', triggerTime);
      return notificationId;
    } catch (error) {
      console.error('[NotificationService] Failed to schedule notification:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    if (!this.notifee) return;

    try {
      await this.notifee.cancelNotification(notificationId);
      console.log('[NotificationService] Notification cancelled:', notificationId);
    } catch (error) {
      console.error('[NotificationService] Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    if (!this.notifee) return;

    try {
      await this.notifee.cancelAllNotifications();
      console.log('[NotificationService] All notifications cancelled');
    } catch (error) {
      console.error('[NotificationService] Failed to cancel notifications:', error);
    }
  }

  /**
   * Check if should show notification based on settings
   */
  private shouldShowNotification(notification: NotificationPayload): boolean {
    if (!this.settings.enabled) return false;

    switch (notification.type) {
      case 'NEW_ASSIGNMENT':
        return this.settings.newAssignments;
      case 'FOLLOW_UP_REMINDER':
      case 'CALLBACK_REMINDER':
        return this.settings.followUpReminders || this.settings.callbackReminders;
      case 'LEAD_UPDATE':
        return this.settings.leadUpdates;
      case 'AI_ANALYSIS_COMPLETE':
        return this.settings.aiAnalysis;
      case 'PERFORMANCE_ALERT':
        return this.settings.performanceAlerts;
      default:
        return true;
    }
  }

  /**
   * Check if currently in quiet hours
   */
  private isQuietHours(): boolean {
    if (!this.settings.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = this.settings.quietHoursStart.split(':').map(Number);
    const [endH, endM] = this.settings.quietHoursEnd.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes < endMinutes) {
      // Normal case: quiet hours within same day
      return currentTime >= startMinutes && currentTime < endMinutes;
    } else {
      // Overnight case: quiet hours span midnight
      return currentTime >= startMinutes || currentTime < endMinutes;
    }
  }

  /**
   * Load notification settings from storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('[NotificationService] Failed to load settings:', error);
    }
  }

  /**
   * Save notification settings
   */
  async saveSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...settings };
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(this.settings));
      console.log('[NotificationService] Settings saved');
    } catch (error) {
      console.error('[NotificationService] Failed to save settings:', error);
    }
  }

  /**
   * Get current settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Subscribe to notification events
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(notification: NotificationPayload): void {
    this.listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('[NotificationService] Listener error:', error);
      }
    });
  }

  /**
   * Get pending notifications count
   */
  async getPendingCount(): Promise<number> {
    if (!this.notifee) return 0;

    try {
      const notifications = await this.notifee.getDisplayedNotifications();
      return notifications.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clear badge count
   */
  async clearBadge(): Promise<void> {
    if (!this.notifee) return;

    try {
      await this.notifee.setBadgeCount(0);
    } catch (error) {
      console.error('[NotificationService] Failed to clear badge:', error);
    }
  }

  /**
   * Unregister device token (on logout)
   */
  async unregister(): Promise<void> {
    if (this.fcmToken) {
      try {
        await api.post('/notifications/unregister-device', {
          token: this.fcmToken,
        });
        await AsyncStorage.removeItem(FCM_TOKEN_KEY);
        this.fcmToken = null;
        console.log('[NotificationService] Device unregistered');
      } catch (error) {
        console.error('[NotificationService] Failed to unregister:', error);
      }
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

export default notificationService;
