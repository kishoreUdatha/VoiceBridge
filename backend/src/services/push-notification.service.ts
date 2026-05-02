/**
 * Push Notification Service
 * Handles sending push notifications via Firebase Cloud Messaging
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../config/database';

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return;

  try {
    // Option 1: Use service account from file path
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const filePath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      if (fs.existsSync(filePath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        firebaseInitialized = true;
        console.log('[PushNotification] Firebase Admin initialized with service account file');
      } else {
        console.warn('[PushNotification] Service account file not found:', filePath);
      }
    }
    // Option 2: Use service account from environment variable (JSON string)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log('[PushNotification] Firebase Admin initialized with service account');
    }
    // Option 3: Use GOOGLE_APPLICATION_CREDENTIALS env var
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      firebaseInitialized = true;
      console.log('[PushNotification] Firebase Admin initialized with application default credentials');
    }
    // Option 4: Development mode - skip initialization
    else {
      console.warn('[PushNotification] Firebase not configured. Push notifications disabled.');
      console.warn('[PushNotification] To enable, set FIREBASE_SERVICE_ACCOUNT_PATH');
    }
  } catch (error) {
    console.error('[PushNotification] Firebase initialization failed:', error);
  }
};

// Initialize on module load
initializeFirebase();

// Notification types
export type NotificationType =
  | 'NEW_ASSIGNMENT'
  | 'FOLLOW_UP_REMINDER'
  | 'LEAD_UPDATE'
  | 'CALLBACK_REMINDER'
  | 'AI_ANALYSIS_COMPLETE'
  | 'PERFORMANCE_ALERT'
  | 'SYSTEM'
  | 'ADMISSION_CREATED'
  | 'ADMISSION_PAYMENT'
  | 'ADMISSION_PAYMENT_COMPLETE'
  | 'ADMISSION_COMMISSION'
  | 'ADMISSION_CANCELLED'
  | 'ADMISSION_PAYMENT_REMINDER';

export interface PushNotificationPayload {
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface SendResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors?: string[];
}

class PushNotificationService {
  /**
   * Send push notification to a specific user
   */
  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<SendResult> {
    if (!firebaseInitialized) {
      console.warn('[PushNotification] Firebase not initialized, skipping notification');
      return { success: false, successCount: 0, failureCount: 0, errors: ['Firebase not initialized'] };
    }

    try {
      // Get user's active device tokens
      const devices = await prisma.deviceToken.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      if (devices.length === 0) {
        console.log('[PushNotification] No active devices for user:', userId);
        return { success: true, successCount: 0, failureCount: 0 };
      }

      const tokens = devices.map(d => d.token);
      return await this.sendToTokens(tokens, payload);
    } catch (error) {
      console.error('[PushNotification] Error sending to user:', error);
      return { success: false, successCount: 0, failureCount: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<SendResult> {
    if (!firebaseInitialized) {
      return { success: false, successCount: 0, failureCount: 0, errors: ['Firebase not initialized'] };
    }

    try {
      const devices = await prisma.deviceToken.findMany({
        where: {
          userId: { in: userIds },
          isActive: true,
        },
      });

      if (devices.length === 0) {
        return { success: true, successCount: 0, failureCount: 0 };
      }

      const tokens = devices.map(d => d.token);
      return await this.sendToTokens(tokens, payload);
    } catch (error) {
      console.error('[PushNotification] Error sending to users:', error);
      return { success: false, successCount: 0, failureCount: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Send push notification to all users in an organization
   */
  async sendToOrganization(organizationId: string, payload: PushNotificationPayload): Promise<SendResult> {
    if (!firebaseInitialized) {
      return { success: false, successCount: 0, failureCount: 0, errors: ['Firebase not initialized'] };
    }

    try {
      const devices = await prisma.deviceToken.findMany({
        where: {
          organizationId,
          isActive: true,
        },
      });

      if (devices.length === 0) {
        return { success: true, successCount: 0, failureCount: 0 };
      }

      const tokens = devices.map(d => d.token);
      return await this.sendToTokens(tokens, payload);
    } catch (error) {
      console.error('[PushNotification] Error sending to organization:', error);
      return { success: false, successCount: 0, failureCount: 1, errors: [(error as Error).message] };
    }
  }

  /**
   * Send push notification to specific FCM tokens
   */
  async sendToTokens(tokens: string[], payload: PushNotificationPayload): Promise<SendResult> {
    if (!firebaseInitialized) {
      return { success: false, successCount: 0, failureCount: 0, errors: ['Firebase not initialized'] };
    }

    if (tokens.length === 0) {
      return { success: true, successCount: 0, failureCount: 0 };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: {
          type: payload.type,
          ...payload.data,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: this.getChannelId(payload.type),
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      console.log(`[PushNotification] Sent: ${response.successCount} success, ${response.failureCount} failed`);

      // Handle failed tokens (remove invalid ones)
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            // Remove tokens that are invalid or unregistered
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              failedTokens.push(tokens[idx]);
            }
          }
        });

        if (failedTokens.length > 0) {
          await this.removeInvalidTokens(failedTokens);
        }
      }

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      console.error('[PushNotification] Error sending to tokens:', error);
      return { success: false, successCount: 0, failureCount: tokens.length, errors: [(error as Error).message] };
    }
  }

  /**
   * Get Android notification channel ID based on type
   */
  private getChannelId(type: NotificationType): string {
    switch (type) {
      case 'NEW_ASSIGNMENT':
        return 'myleadx-assignments';
      case 'FOLLOW_UP_REMINDER':
      case 'CALLBACK_REMINDER':
        return 'myleadx-reminders';
      case 'AI_ANALYSIS_COMPLETE':
        return 'myleadx-ai';
      case 'ADMISSION_CREATED':
      case 'ADMISSION_PAYMENT':
      case 'ADMISSION_PAYMENT_COMPLETE':
      case 'ADMISSION_COMMISSION':
      case 'ADMISSION_CANCELLED':
      case 'ADMISSION_PAYMENT_REMINDER':
        return 'myleadx-admissions';
      default:
        return 'myleadx-main';
    }
  }

  /**
   * Remove invalid tokens from database
   */
  private async removeInvalidTokens(tokens: string[]): Promise<void> {
    try {
      await prisma.deviceToken.updateMany({
        where: { token: { in: tokens } },
        data: { isActive: false },
      });
      console.log(`[PushNotification] Deactivated ${tokens.length} invalid tokens`);
    } catch (error) {
      console.error('[PushNotification] Error removing invalid tokens:', error);
    }
  }

  /**
   * Send new assignment notification
   */
  async sendNewAssignmentNotification(
    userId: string,
    leadName: string,
    leadPhone: string,
    assignedDataId: string
  ): Promise<SendResult> {
    return this.sendToUser(userId, {
      title: 'New Lead Assigned',
      body: `${leadName} (${leadPhone}) has been assigned to you`,
      type: 'NEW_ASSIGNMENT',
      data: {
        screen: 'AssignedData',
        assignedDataId,
      },
    });
  }

  /**
   * Send follow-up reminder notification
   */
  async sendFollowUpReminder(
    userId: string,
    leadName: string,
    followUpId: string,
    scheduledTime: string
  ): Promise<SendResult> {
    return this.sendToUser(userId, {
      title: 'Follow-up Reminder',
      body: `Time to follow up with ${leadName}`,
      type: 'FOLLOW_UP_REMINDER',
      data: {
        screen: 'FollowUps',
        followUpId,
        scheduledTime,
      },
    });
  }

  /**
   * Send callback reminder notification
   */
  async sendCallbackReminder(
    userId: string,
    leadName: string,
    leadPhone: string,
    callbackId: string
  ): Promise<SendResult> {
    return this.sendToUser(userId, {
      title: 'Callback Reminder',
      body: `Scheduled callback with ${leadName}`,
      type: 'CALLBACK_REMINDER',
      data: {
        screen: 'AssignedData',
        callbackId,
        phone: leadPhone,
      },
    });
  }

  /**
   * Send AI analysis complete notification
   */
  async sendAIAnalysisComplete(
    userId: string,
    callId: string,
    outcome: string,
    leadName: string
  ): Promise<SendResult> {
    return this.sendToUser(userId, {
      title: 'Call Analysis Complete',
      body: `AI analyzed your call with ${leadName}: ${outcome}`,
      type: 'AI_ANALYSIS_COMPLETE',
      data: {
        screen: 'CallAnalysis',
        callId,
        outcome,
      },
    });
  }

  /**
   * Send performance alert notification
   */
  async sendPerformanceAlert(
    userId: string,
    title: string,
    message: string
  ): Promise<SendResult> {
    return this.sendToUser(userId, {
      title,
      body: message,
      type: 'PERFORMANCE_ALERT',
      data: {
        screen: 'Performance',
      },
    });
  }

  /**
   * Send system notification
   */
  async sendSystemNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, string>
  ): Promise<SendResult> {
    return this.sendToUser(userId, {
      title,
      body: message,
      type: 'SYSTEM',
      data,
    });
  }

  /**
   * Check if Firebase is initialized
   */
  isInitialized(): boolean {
    return firebaseInitialized;
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
