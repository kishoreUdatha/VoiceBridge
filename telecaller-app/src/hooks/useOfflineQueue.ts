/**
 * Custom hook for using the offline queue in components
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineQueue, QueueStatus, QueueItem } from '../services/offlineQueue';
import { networkMonitor } from '../services/networkMonitor';

interface UseOfflineQueueReturn {
  // Status
  status: QueueStatus;
  isOnline: boolean;
  items: QueueItem[];
  failedItems: QueueItem[];
  pendingItems: QueueItem[];

  // Actions
  addCallUpdate: (callId: string, payload: any) => Promise<string>;
  addRecordingUpload: (callId: string, recordingPath: string, duration?: number) => Promise<string>;
  addOutcomeSubmit: (callId: string, outcome: string, notes?: string, duration?: number) => Promise<string>;
  retryFailed: () => Promise<void>;
  clearFailed: () => Promise<void>;
  processQueue: () => Promise<void>;
  removeItem: (itemId: string) => Promise<boolean>;
}

export const useOfflineQueue = (): UseOfflineQueueReturn => {
  const [status, setStatus] = useState<QueueStatus>(offlineQueue.getStatus());
  const [items, setItems] = useState<QueueItem[]>(offlineQueue.getItems());
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribeStatus = offlineQueue.subscribeToStatus(newStatus => {
      setStatus(newStatus);
    });

    // Subscribe to queue changes
    const unsubscribeQueue = offlineQueue.subscribe(newItems => {
      setItems(newItems);
    });

    // Subscribe to network changes
    const unsubscribeNetwork = networkMonitor.onNetworkChange(connected => {
      setIsOnline(connected);
    });

    // Get initial network status
    networkMonitor.isOnline().then(setIsOnline);

    return () => {
      unsubscribeStatus();
      unsubscribeQueue();
      unsubscribeNetwork();
    };
  }, []);

  // Filter items by status
  const failedItems = items.filter(item => item.status === 'failed');
  const pendingItems = items.filter(item => item.status === 'pending');

  // Actions
  const addCallUpdate = useCallback(
    (callId: string, payload: any) => offlineQueue.addCallUpdate(callId, payload),
    []
  );

  const addRecordingUpload = useCallback(
    (callId: string, recordingPath: string, duration?: number) =>
      offlineQueue.addRecordingUpload(callId, recordingPath, duration),
    []
  );

  const addOutcomeSubmit = useCallback(
    (callId: string, outcome: string, notes?: string, duration?: number) =>
      offlineQueue.addOutcomeSubmit(callId, outcome, notes, duration),
    []
  );

  const retryFailed = useCallback(() => offlineQueue.retryFailed(), []);

  const clearFailed = useCallback(() => offlineQueue.clearFailed(), []);

  const processQueue = useCallback(() => offlineQueue.processQueue(), []);

  const removeItem = useCallback(
    (itemId: string) => offlineQueue.remove(itemId),
    []
  );

  return {
    status,
    isOnline,
    items,
    failedItems,
    pendingItems,
    addCallUpdate,
    addRecordingUpload,
    addOutcomeSubmit,
    retryFailed,
    clearFailed,
    processQueue,
    removeItem,
  };
};

export default useOfflineQueue;
