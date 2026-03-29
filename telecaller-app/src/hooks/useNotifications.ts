/**
 * useNotifications Hook
 * Hook for managing notifications in components
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  notificationService,
  NotificationPayload,
  NotificationSettings,
} from '../services/notificationService';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UseNotificationsReturn {
  // State
  settings: NotificationSettings;
  pendingCount: number;
  isInitialized: boolean;

  // Actions
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  scheduleFollowUpReminder: (
    followUpId: string,
    leadName: string,
    scheduledAt: Date,
    reminderMinutesBefore?: number
  ) => Promise<string | null>;
  cancelReminder: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  clearBadge: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const navigation = useNavigation<NavigationProp>();
  const [settings, setSettings] = useState<NotificationSettings>(
    notificationService.getSettings()
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize and subscribe to notifications
  useEffect(() => {
    const init = async () => {
      await notificationService.init();
      setSettings(notificationService.getSettings());
      const count = await notificationService.getPendingCount();
      setPendingCount(count);
      setIsInitialized(true);
    };

    init();

    // Subscribe to notification taps
    const unsubscribe = notificationService.subscribe(handleNotificationTap);

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle notification tap - navigate to relevant screen
  const handleNotificationTap = useCallback(
    (notification: NotificationPayload) => {
      console.log('[useNotifications] Notification tapped:', notification);

      const { data, type } = notification;

      switch (type) {
        case 'NEW_ASSIGNMENT':
          navigation.navigate('AssignedData');
          break;

        case 'FOLLOW_UP_REMINDER':
        case 'CALLBACK_REMINDER':
          if (data?.followUpId) {
            navigation.navigate('FollowUps');
          } else if (data?.leadId) {
            navigation.navigate('LeadDetail', { leadId: data.leadId });
          }
          break;

        case 'LEAD_UPDATE':
          if (data?.leadId) {
            navigation.navigate('LeadDetail', { leadId: data.leadId });
          }
          break;

        case 'AI_ANALYSIS_COMPLETE':
          if (data?.callId) {
            navigation.navigate('AIAnalysis', { callId: data.callId });
          }
          break;

        case 'PERFORMANCE_ALERT':
          navigation.navigate('Performance');
          break;

        default:
          // Navigate to dashboard for unknown types
          navigation.navigate('Main');
      }

      // Clear badge after handling
      notificationService.clearBadge();
    },
    [navigation]
  );

  // Update notification settings
  const updateSettings = useCallback(
    async (newSettings: Partial<NotificationSettings>) => {
      await notificationService.saveSettings(newSettings);
      setSettings(notificationService.getSettings());
    },
    []
  );

  // Schedule a follow-up reminder
  const scheduleFollowUpReminder = useCallback(
    async (
      followUpId: string,
      leadName: string,
      scheduledAt: Date,
      reminderMinutesBefore: number = 15
    ): Promise<string | null> => {
      const reminderTime = new Date(
        scheduledAt.getTime() - reminderMinutesBefore * 60 * 1000
      );

      // Don't schedule if reminder time is in the past
      if (reminderTime <= new Date()) {
        console.log('[useNotifications] Reminder time is in the past, skipping');
        return null;
      }

      return notificationService.scheduleNotification(
        {
          type: 'FOLLOW_UP_REMINDER',
          title: 'Follow-up Reminder',
          body: `Time to follow up with ${leadName}`,
          data: {
            followUpId,
            screen: 'FollowUps',
          },
        },
        reminderTime
      );
    },
    []
  );

  // Cancel a scheduled reminder
  const cancelReminder = useCallback(async (notificationId: string) => {
    await notificationService.cancelNotification(notificationId);
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    await notificationService.cancelAllNotifications();
    setPendingCount(0);
  }, []);

  // Clear badge
  const clearBadge = useCallback(async () => {
    await notificationService.clearBadge();
    setPendingCount(0);
  }, []);

  return {
    settings,
    pendingCount,
    isInitialized,
    updateSettings,
    scheduleFollowUpReminder,
    cancelReminder,
    clearAllNotifications,
    clearBadge,
  };
};

export default useNotifications;
