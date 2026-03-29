/**
 * Offline Queue Service
 * Manages queuing and syncing of offline operations
 * Automatically retries failed operations when network is restored
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { telecallerApi } from '../api/telecaller';
import { networkMonitor } from './networkMonitor';
import { recordingBackupService } from './recordingBackup';

const QUEUE_KEY = '@voicebridge:offline_queue';
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 5000, 30000, 60000, 300000]; // 1s, 5s, 30s, 1m, 5m

export type QueueItemType =
  | 'call_update'
  | 'recording_upload'
  | 'outcome_submit'
  | 'assigned_data_update';

export type QueueItemStatus = 'pending' | 'processing' | 'failed';

export interface QueueItem {
  id: string;
  type: QueueItemType;
  data: any;
  createdAt: number;
  retries: number;
  lastError?: string;
  lastAttempt?: number;
  status: QueueItemStatus;
}

export interface QueueStatus {
  total: number;
  pending: number;
  processing: number;
  failed: number;
  isProcessing: boolean;
  isOnline: boolean;
}

type QueueListener = (queue: QueueItem[]) => void;
type StatusListener = (status: QueueStatus) => void;

class OfflineQueue {
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private isInitialized: boolean = false;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // Listeners
  private queueListeners: Set<QueueListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  /**
   * Initialize the offline queue
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[OfflineQueue] Initializing...');

    // Load queue from storage
    await this.loadQueue();

    // Start network monitoring
    networkMonitor.start();

    // Process queue when network is restored
    networkMonitor.onNetworkRestored(() => {
      console.log('[OfflineQueue] Network restored, processing queue...');
      this.processQueue();
    });

    // Process queue when app comes to foreground
    networkMonitor.onAppForeground(() => {
      console.log('[OfflineQueue] App foreground, processing queue...');
      this.processQueue();
    });

    // Initial processing if online
    const isOnline = await networkMonitor.isOnline();
    if (isOnline && this.queue.length > 0) {
      this.processQueue();
    }

    this.isInitialized = true;
    console.log('[OfflineQueue] Initialized with', this.queue.length, 'items');
  }

  /**
   * Load queue from persistent storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        // Reset any items stuck in processing state
        this.queue.forEach(item => {
          if (item.status === 'processing') {
            item.status = 'pending';
          }
        });
        await this.saveQueue();
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to persistent storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[OfflineQueue] Failed to save queue:', error);
    }
  }

  /**
   * Generate unique ID for queue item
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add item to queue
   */
  async add(
    type: QueueItemType,
    data: any,
    options?: { skipDuplicate?: boolean }
  ): Promise<string> {
    // Check for duplicates if needed
    if (options?.skipDuplicate) {
      const existing = this.queue.find(
        item => item.type === type &&
        item.data.callId === data.callId &&
        item.status !== 'failed'
      );
      if (existing) {
        console.log('[OfflineQueue] Skipping duplicate item:', existing.id);
        return existing.id;
      }
    }

    const queueItem: QueueItem = {
      id: this.generateId(),
      type,
      data,
      createdAt: Date.now(),
      retries: 0,
      status: 'pending',
    };

    this.queue.push(queueItem);
    await this.saveQueue();
    this.notifyListeners();

    console.log('[OfflineQueue] Added item:', queueItem.id, type);

    // Try to process immediately if online
    this.processQueue();

    return queueItem.id;
  }

  /**
   * Add call update to queue
   */
  async addCallUpdate(callId: string, payload: any): Promise<string> {
    return this.add('call_update', { callId, payload }, { skipDuplicate: true });
  }

  /**
   * Add recording upload to queue
   */
  async addRecordingUpload(
    callId: string,
    recordingPath: string,
    duration?: number
  ): Promise<string> {
    return this.add(
      'recording_upload',
      { callId, recordingPath, duration },
      { skipDuplicate: true }
    );
  }

  /**
   * Add outcome submission to queue
   */
  async addOutcomeSubmit(
    callId: string,
    outcome: string,
    notes?: string,
    duration?: number
  ): Promise<string> {
    return this.add(
      'outcome_submit',
      { callId, outcome, notes, duration },
      { skipDuplicate: true }
    );
  }

  /**
   * Process the queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('[OfflineQueue] Already processing, skipping');
      return;
    }

    const isOnline = await networkMonitor.isOnline();
    if (!isOnline) {
      console.log('[OfflineQueue] Offline, skipping queue processing');
      return;
    }

    this.isProcessing = true;
    this.notifyStatusListeners();
    console.log('[OfflineQueue] Processing queue, items:', this.queue.length);

    // Get items to process (pending or failed with retries remaining)
    const itemsToProcess = this.queue.filter(
      item => item.status === 'pending' ||
      (item.status === 'failed' && item.retries < MAX_RETRIES)
    );

    for (const item of itemsToProcess) {
      try {
        // Update status to processing
        item.status = 'processing';
        item.lastAttempt = Date.now();
        this.notifyListeners();

        // Process the item
        await this.processItem(item);

        // Success - remove from queue
        this.queue = this.queue.filter(q => q.id !== item.id);
        console.log('[OfflineQueue] Item processed successfully:', item.id);

      } catch (error: any) {
        console.error('[OfflineQueue] Item processing failed:', item.id, error.message);

        item.retries++;
        item.lastError = error.message || 'Unknown error';

        if (item.retries >= MAX_RETRIES) {
          item.status = 'failed';
          console.error('[OfflineQueue] Item failed after max retries:', item.id);
        } else {
          item.status = 'pending';
          // Schedule retry with exponential backoff
          this.scheduleRetry(item);
        }
      }

      // Save after each item
      await this.saveQueue();
      this.notifyListeners();
    }

    this.isProcessing = false;
    this.notifyStatusListeners();
    console.log('[OfflineQueue] Queue processing complete');
  }

  /**
   * Process individual queue item
   */
  private async processItem(item: QueueItem): Promise<void> {
    console.log('[OfflineQueue] Processing item:', item.type, item.data);

    switch (item.type) {
      case 'call_update':
        await telecallerApi.updateCall(item.data.callId, item.data.payload);
        break;

      case 'recording_upload': {
        // Check if we have a backup (more reliable)
        const backup = await recordingBackupService.getBackupForCall(item.data.callId);
        const pathToUpload = backup?.backupPath || item.data.recordingPath;

        await telecallerApi.uploadRecording(
          item.data.callId,
          pathToUpload,
          item.data.duration
        );

        // Mark backup as uploaded
        if (backup) {
          await recordingBackupService.markUploaded(item.data.callId);
        }
        break;
      }

      case 'outcome_submit':
        await telecallerApi.updateCall(item.data.callId, {
          outcome: item.data.outcome,
          notes: item.data.notes,
          duration: item.data.duration,
        });
        break;

      case 'assigned_data_update':
        await telecallerApi.updateAssignedDataStatus(
          item.data.id,
          item.data.status,
          item.data.notes
        );
        break;

      default:
        throw new Error(`Unknown queue item type: ${item.type}`);
    }
  }

  /**
   * Schedule retry for failed item
   */
  private scheduleRetry(item: QueueItem): void {
    // Clear any existing timeout
    const existingTimeout = this.retryTimeouts.get(item.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const delay = RETRY_DELAYS[Math.min(item.retries - 1, RETRY_DELAYS.length - 1)];
    console.log(`[OfflineQueue] Scheduling retry for ${item.id} in ${delay}ms`);

    const timeout = setTimeout(() => {
      this.retryTimeouts.delete(item.id);
      this.processQueue();
    }, delay);

    this.retryTimeouts.set(item.id, timeout);
  }

  /**
   * Retry all failed items
   */
  async retryFailed(): Promise<void> {
    const failedItems = this.queue.filter(item => item.status === 'failed');

    for (const item of failedItems) {
      item.status = 'pending';
      item.retries = 0;
      item.lastError = undefined;
    }

    await this.saveQueue();
    this.notifyListeners();

    console.log('[OfflineQueue] Retrying', failedItems.length, 'failed items');
    this.processQueue();
  }

  /**
   * Clear failed items
   */
  async clearFailed(): Promise<void> {
    const failedCount = this.queue.filter(item => item.status === 'failed').length;
    this.queue = this.queue.filter(item => item.status !== 'failed');
    await this.saveQueue();
    this.notifyListeners();
    console.log('[OfflineQueue] Cleared', failedCount, 'failed items');
  }

  /**
   * Remove specific item from queue
   */
  async remove(itemId: string): Promise<boolean> {
    const index = this.queue.findIndex(item => item.id === itemId);
    if (index >= 0) {
      this.queue.splice(index, 1);
      await this.saveQueue();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Get queue status
   */
  getStatus(): QueueStatus {
    return {
      total: this.queue.length,
      pending: this.queue.filter(q => q.status === 'pending').length,
      processing: this.queue.filter(q => q.status === 'processing').length,
      failed: this.queue.filter(q => q.status === 'failed').length,
      isProcessing: this.isProcessing,
      isOnline: networkMonitor.getConnectionStatus(),
    };
  }

  /**
   * Get all queue items
   */
  getItems(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * Get failed items
   */
  getFailedItems(): QueueItem[] {
    return this.queue.filter(item => item.status === 'failed');
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: QueueListener): () => void {
    this.queueListeners.add(listener);
    // Immediately call with current queue
    listener([...this.queue]);
    return () => this.queueListeners.delete(listener);
  }

  /**
   * Subscribe to status changes
   */
  subscribeToStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    // Immediately call with current status
    listener(this.getStatus());
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Notify queue listeners
   */
  private notifyListeners(): void {
    const queueCopy = [...this.queue];
    this.queueListeners.forEach(listener => listener(queueCopy));
    this.notifyStatusListeners();
  }

  /**
   * Notify status listeners
   */
  private notifyStatusListeners(): void {
    const status = this.getStatus();
    this.statusListeners.forEach(listener => listener(status));
  }

  /**
   * Clear all pending timeouts
   */
  private clearAllTimeouts(): void {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  /**
   * Cleanup and stop the queue
   */
  async stop(): Promise<void> {
    this.clearAllTimeouts();
    networkMonitor.stop();
    this.queueListeners.clear();
    this.statusListeners.clear();
    this.isInitialized = false;
    console.log('[OfflineQueue] Stopped');
  }

  /**
   * Clear all items (use with caution)
   */
  async clearAll(): Promise<void> {
    this.clearAllTimeouts();
    this.queue = [];
    await this.saveQueue();
    this.notifyListeners();
    console.log('[OfflineQueue] All items cleared');
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();

export default offlineQueue;
