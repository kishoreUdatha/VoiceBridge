/**
 * Push Notification Service
 * Handles FCM push notifications and local notifications
 */

import { Platform, Alert, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
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
type NavigationListener = (screen: string, params?: any) => void;

class NotificationService {
  private initialized: boolean = false;
  private fcmToken: string | null = null;
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private listeners: Set<NotificationListener> = new Set();
  private navigationListener: NavigationListener | null = null;
  private appState: AppStateStatus = 'active';

  /**
   * Initialize notification service
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true;

    console.log('[NotificationService] Initializing with Firebase...');

    try {
      // Load saved settings
      await this.loadSettings();

      // Create notification channels (Android)
      await this.createNotificationChannels();

      // Request permission
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('[NotificationService] Permission not granted');
      }

      // Get FCM token
      await this.getToken();

      // Setup message handlers
      this.setupMessageHandlers();

      // Setup Notifee event handlers
      this.setupNotifeeHandlers();

      // Track app state for foreground/background notifications
      AppState.addEventListener('change', (state) => {
        this.appState = state;
      });

      this.initialized = true;
      console.log('[NotificationService] Initialized successfully with Firebase');
      return true;
    } catch (error) {
      console.error('[NotificationService] Initialization failed:', error);
      this.initialized = true; // Prevent retry loops
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('[NotificationService] Permission status:', enabled ? 'granted' : 'denied');

      if (Platform.OS === 'android') {
        // Request Android 13+ notification permission
        const notifeePermission = await notifee.requestPermission();
        console.log('[NotificationService] Notifee permission:', notifeePermission);
      }

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
    try {
      // Check if APNs token is available (iOS)
      if (Platform.OS === 'ios') {
        const apnsToken = await messaging().getAPNSToken();
        if (!apnsToken) {
          console.log('[NotificationService] APNs token not available yet');
          return null;
        }
      }

      const token = await messaging().getToken();

      if (token && token !== this.fcmToken) {
        this.fcmToken = token;
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);

        // Register token with backend
        await this.registerTokenWithBackend(token);

        console.log('[NotificationService] FCM Token obtained:', token.substring(0, 20) + '...');
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
   * Setup Firebase message handlers
   */
  private setupMessageHandlers(): void {
    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('[NotificationService] Foreground message:', remoteMessage);

      const notification = this.parseRemoteMessage(remoteMessage);

      // Check if notification should be shown based on settings
      if (this.shouldShowNotification(notification)) {
        await this.showLocalNotification(notification);
        this.notifyListeners(notification);
      }
    });

    // Handle background message tap (app was in background)
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('[NotificationService] Notification opened app:', remoteMessage);
      const notification = this.parseRemoteMessage(remoteMessage);
      this.handleNotificationTap(notification);
    });

    // Handle token refresh
    messaging().onTokenRefresh(async (token) => {
      console.log('[NotificationService] Token refreshed');
      this.fcmToken = token;
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      await this.registerTokenWithBackend(token);
    });

    // Check if app was opened from notification (app was killed)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('[NotificationService] App opened from killed state:', remoteMessage);
          const notification = this.parseRemoteMessage(remoteMessage);
          // Delay navigation to ensure app is ready
          setTimeout(() => {
            this.handleNotificationTap(notification);
          }, 1000);
        }
      });
  }

  /**
   * Setup Notifee event handlers
   */
  private setupNotifeeHandlers(): void {
    // Handle foreground notification events
    notifee.onForegroundEvent(({ type, detail }) => {
      console.log('[NotificationService] Notifee foreground event:', type);

      if (type === EventType.PRESS) {
        const notification: NotificationPayload = {
          id: detail.notification?.id || '',
          type: (detail.notification?.data?.type as NotificationType) || 'SYSTEM',
          title: detail.notification?.title || '',
          body: detail.notification?.body || '',
          data: detail.notification?.data as any,
          timestamp: Date.now(),
        };
        this.handleNotificationTap(notification);
      }
    });

    // Handle background notification events
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      console.log('[NotificationService] Notifee background event:', type);

      if (type === EventType.PRESS) {
        // Navigation will be handled when app comes to foreground
        console.log('[NotificationService] Background press, data:', detail.notification?.data);
      }
    });
  }

  /**
   * Handle notification tap - navigate to appropriate screen
   */
  private handleNotificationTap(notification: NotificationPayload): void {
    console.log('[NotificationService] Handling notification tap:', notification.type);
    this.notifyListeners(notification);

    if (this.navigationListener && notification.data?.screen) {
      this.navigationListener(notification.data.screen, notification.data);
    }
  }

  /**
   * Parse remote message to notification payload
   */
  private parseRemoteMessage(remoteMessage: FirebaseMessagingTypes.RemoteMessage): NotificationPayload {
    return {
      id: remoteMessage.messageId || `local-${Date.now()}`,
      type: (remoteMessage.data?.type as NotificationType) || 'SYSTEM',
      title: remoteMessage.notification?.title || 'VoiceBridge',
      body: remoteMessage.notification?.body || '',
      data: remoteMessage.data as any,
      timestamp: Date.now(),
    };
  }

  /**
   * Create notification channels for Android
   */
  private async createNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      // Main channel for important notifications
      await notifee.createChannel({
        id: 'voicebridge-main',
        name: 'VoiceBridge Notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      // New assignments channel
      await notifee.createChannel({
        id: 'voicebridge-assignments',
        name: 'New Assignments',
        description: 'Notifications for new lead assignments',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      // Follow-up reminders channel
      await notifee.createChannel({
        id: 'voicebridge-reminders',
        name: 'Follow-up Reminders',
        description: 'Reminders for scheduled follow-ups and callbacks',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      // AI Analysis channel
      await notifee.createChannel({
        id: 'voicebridge-ai',
        name: 'AI Analysis',
        description: 'Notifications when call analysis is complete',
        importance: AndroidImportance.DEFAULT,
        sound: 'default',
      });

      // Quiet notifications channel
      await notifee.createChannel({
        id: 'voicebridge-quiet',
        name: 'Quiet Notifications',
        description: 'Silent notifications during quiet hours',
        importance: AndroidImportance.LOW,
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
    try {
      const channelId = this.getChannelForType(notification.type);

      await notifee.displayNotification({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        android: {
          channelId,
          smallIcon: 'ic_notification',
          color: '#3B82F6',
          pressAction: {
            id: 'default',
          },
          sound: this.settings.sound ? 'default' : undefined,
          vibrationPattern: this.settings.vibrate ? [300, 500] : undefined,
        },
        data: notification.data,
      });

      console.log('[NotificationService] Local notification displayed');
    } catch (error) {
      console.error('[NotificationService] Failed to show notification:', error);
      // Fallback to Alert
      Alert.alert(notification.title, notification.body);
    }
  }

  /**
   * Get notification channel based on type
   */
  private getChannelForType(type: NotificationType): string {
    if (this.isQuietHours()) {
      return 'voicebridge-quiet';
    }

    switch (type) {
      case 'NEW_ASSIGNMENT':
        return 'voicebridge-assignments';
      case 'FOLLOW_UP_REMINDER':
      case 'CALLBACK_REMINDER':
        return 'voicebridge-reminders';
      case 'AI_ANALYSIS_COMPLETE':
        return 'voicebridge-ai';
      default:
        return 'voicebridge-main';
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification(
    notification: Omit<NotificationPayload, 'id' | 'timestamp'>,
    triggerTime: Date
  ): Promise<string | null> {
    try {
      const notificationId = `scheduled-${Date.now()}`;

      await notifee.createTriggerNotification(
        {
          id: notificationId,
          title: notification.title,
          body: notification.body,
          android: {
            channelId: 'voicebridge-reminders',
            smallIcon: 'ic_notification',
            color: '#3B82F6',
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
    try {
      await notifee.cancelNotification(notificationId);
      console.log('[NotificationService] Notification cancelled:', notificationId);
    } catch (error) {
      console.error('[NotificationService] Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
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
      return currentTime >= startMinutes && currentTime < endMinutes;
    } else {
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
   * Set navigation listener for handling notification taps
   */
  setNavigationListener(listener: NavigationListener): void {
    this.navigationListener = listener;
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
    try {
      const notifications = await notifee.getDisplayedNotifications();
      return notifications.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clear badge count
   */
  async clearBadge(): Promise<void> {
    try {
      await notifee.setBadgeCount(0);
    } catch (error) {
      console.error('[NotificationService] Failed to clear badge:', error);
    }
  }

  /**
   * Get FCM token (for debugging/testing)
   */
  getCurrentToken(): string | null {
    return this.fcmToken;
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
        await messaging().deleteToken();
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
