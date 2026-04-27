/**
 * Message Retry Service
 * Handles automatic retry of failed WhatsApp/SMS messages with exponential backoff
 */

import { prisma } from '../config/database';
import { createWhatsAppService } from '../integrations/whatsapp.service';

// Retry intervals in minutes (exponential backoff)
const RETRY_INTERVALS = [1, 5, 15, 30, 60]; // 1min, 5min, 15min, 30min, 1hr

interface RetryResult {
  messageId: string;
  success: boolean;
  error?: string;
  nextRetryAt?: Date;
}

class MessageRetryService {
  private isProcessing = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the retry processor (runs every minute)
   */
  start() {
    if (this.intervalId) {
      console.log('[MessageRetry] Already running');
      return;
    }

    console.log('[MessageRetry] Starting retry processor (checks every minute)');
    this.intervalId = setInterval(() => this.processRetryQueue(), 60 * 1000);

    // Run immediately on start
    this.processRetryQueue();
  }

  /**
   * Stop the retry processor
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[MessageRetry] Stopped retry processor');
    }
  }

  /**
   * Process messages that need to be retried
   */
  async processRetryQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const now = new Date();

      // Find failed messages that are due for retry
      const messagesToRetry = await prisma.messageLog.findMany({
        where: {
          status: 'FAILED',
          nextRetryAt: {
            lte: now,
          },
          retryCount: {
            lt: prisma.messageLog.fields.maxRetries,
          },
        },
        take: 50, // Process in batches
        orderBy: {
          nextRetryAt: 'asc',
        },
      });

      if (messagesToRetry.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`[MessageRetry] Processing ${messagesToRetry.length} messages for retry`);

      for (const message of messagesToRetry) {
        await this.retryMessage(message);
        // Small delay between retries to avoid rate limiting
        await this.sleep(500);
      }
    } catch (error) {
      console.error('[MessageRetry] Error processing retry queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Retry a single message
   */
  async retryMessage(message: any): Promise<RetryResult> {
    const newRetryCount = message.retryCount + 1;
    const retryErrors = Array.isArray(message.retryErrors) ? message.retryErrors : [];

    console.log(`[MessageRetry] Retrying message ${message.id} (attempt ${newRetryCount}/${message.maxRetries})`);

    try {
      let success = false;
      let error: string | undefined;
      let externalId: string | undefined;

      if (message.type === 'WHATSAPP') {
        const result = await this.retryWhatsApp(message);
        success = result.success;
        error = result.error;
        externalId = result.messageId;
      } else if (message.type === 'SMS') {
        const result = await this.retrySMS(message);
        success = result.success;
        error = result.error;
        externalId = result.messageId;
      } else {
        error = `Unsupported message type: ${message.type}`;
      }

      if (success) {
        // Mark as sent
        await prisma.messageLog.update({
          where: { id: message.id },
          data: {
            status: 'SENT',
            retryCount: newRetryCount,
            lastRetryAt: new Date(),
            sentAt: new Date(),
            nextRetryAt: null,
            error: null,
            externalId: externalId || message.externalId,
          },
        });

        console.log(`[MessageRetry] Message ${message.id} sent successfully on retry ${newRetryCount}`);
        return { messageId: message.id, success: true };
      } else {
        // Calculate next retry time or mark as permanently failed
        const nextRetryAt = this.calculateNextRetryTime(newRetryCount, message.maxRetries);
        retryErrors.push({
          attempt: newRetryCount,
          error: error || 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        await prisma.messageLog.update({
          where: { id: message.id },
          data: {
            status: nextRetryAt ? 'FAILED' : 'FAILED', // Keep as FAILED
            retryCount: newRetryCount,
            lastRetryAt: new Date(),
            nextRetryAt: nextRetryAt,
            error: error || 'Retry failed',
            retryErrors: retryErrors,
          },
        });

        if (!nextRetryAt) {
          console.log(`[MessageRetry] Message ${message.id} permanently failed after ${newRetryCount} attempts`);
        } else {
          console.log(`[MessageRetry] Message ${message.id} will retry at ${nextRetryAt.toISOString()}`);
        }

        return { messageId: message.id, success: false, error, nextRetryAt: nextRetryAt || undefined };
      }
    } catch (err: any) {
      console.error(`[MessageRetry] Error retrying message ${message.id}:`, err);

      const nextRetryAt = this.calculateNextRetryTime(newRetryCount, message.maxRetries);
      retryErrors.push({
        attempt: newRetryCount,
        error: err.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      await prisma.messageLog.update({
        where: { id: message.id },
        data: {
          retryCount: newRetryCount,
          lastRetryAt: new Date(),
          nextRetryAt: nextRetryAt,
          error: err.message || 'Retry failed',
          retryErrors: retryErrors,
        },
      });

      return { messageId: message.id, success: false, error: err.message };
    }
  }

  /**
   * Retry sending a WhatsApp message
   */
  private async retryWhatsApp(message: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const whatsappService = createWhatsAppService(message.organizationId);
    await whatsappService.loadConfig();

    if (!await whatsappService.isConfigured()) {
      return { success: false, error: 'WhatsApp not configured for organization' };
    }

    const result = await whatsappService.sendMessage({
      to: message.to,
      message: message.content,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }

  /**
   * Retry sending an SMS message
   */
  private async retrySMS(message: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Import SMS service dynamically to avoid circular deps
    try {
      const { sendSMS } = await import('../integrations/sms.service');
      const result = await sendSMS(message.to, message.content);
      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Calculate next retry time using exponential backoff
   */
  private calculateNextRetryTime(currentRetryCount: number, maxRetries: number): Date | null {
    if (currentRetryCount >= maxRetries) {
      return null; // No more retries
    }

    const intervalIndex = Math.min(currentRetryCount, RETRY_INTERVALS.length - 1);
    const intervalMinutes = RETRY_INTERVALS[intervalIndex];

    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + intervalMinutes);

    return nextRetry;
  }

  /**
   * Schedule a message for retry (called when initial send fails)
   */
  async scheduleRetry(messageId: string): Promise<void> {
    const message = await prisma.messageLog.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      console.warn(`[MessageRetry] Message ${messageId} not found`);
      return;
    }

    if (message.retryCount >= message.maxRetries) {
      console.log(`[MessageRetry] Message ${messageId} has exceeded max retries`);
      return;
    }

    const nextRetryAt = this.calculateNextRetryTime(message.retryCount, message.maxRetries);

    if (nextRetryAt) {
      await prisma.messageLog.update({
        where: { id: messageId },
        data: {
          nextRetryAt,
        },
      });
      console.log(`[MessageRetry] Scheduled retry for message ${messageId} at ${nextRetryAt.toISOString()}`);
    }
  }

  /**
   * Manually trigger retry for a specific message
   */
  async manualRetry(messageId: string): Promise<RetryResult> {
    const message = await prisma.messageLog.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return { messageId, success: false, error: 'Message not found' };
    }

    if (message.status !== 'FAILED') {
      return { messageId, success: false, error: 'Message is not in failed status' };
    }

    // Reset retry count for manual retry
    await prisma.messageLog.update({
      where: { id: messageId },
      data: {
        retryCount: 0,
        maxRetries: 3,
        nextRetryAt: new Date(), // Retry immediately
      },
    });

    const updatedMessage = await prisma.messageLog.findUnique({
      where: { id: messageId },
    });

    return this.retryMessage(updatedMessage);
  }

  /**
   * Get retry statistics
   * @param organizationId - Organization ID
   * @param type - Optional message type filter ('WHATSAPP', 'SMS', etc.)
   */
  async getRetryStats(organizationId: string, type?: string): Promise<{
    pending: number;
    retrying: number;
    failed: number;
    successfulRetries: number;
  }> {
    const typeFilter = type ? { type } : {};

    const [pending, retrying, failed] = await Promise.all([
      prisma.messageLog.count({
        where: {
          organizationId,
          ...typeFilter,
          status: 'FAILED',
          nextRetryAt: { not: null },
          retryCount: { lt: 3 },
        },
      }),
      prisma.messageLog.count({
        where: {
          organizationId,
          ...typeFilter,
          status: 'FAILED',
          nextRetryAt: { lte: new Date() },
          retryCount: { lt: 3 },
        },
      }),
      prisma.messageLog.count({
        where: {
          organizationId,
          ...typeFilter,
          status: 'FAILED',
          OR: [
            { nextRetryAt: null },
            { retryCount: { gte: 3 } },
          ],
        },
      }),
    ]);

    // Count messages that succeeded after retry
    const successfulRetries = await prisma.messageLog.count({
      where: {
        organizationId,
        ...typeFilter,
        status: 'SENT',
        retryCount: { gt: 0 },
      },
    });

    return { pending, retrying, failed, successfulRetries };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const messageRetryService = new MessageRetryService();
export default messageRetryService;
