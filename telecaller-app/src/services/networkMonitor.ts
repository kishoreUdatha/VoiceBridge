/**
 * Network Monitor Service
 * Monitors network connectivity and emits events when network state changes
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

type NetworkListener = (isConnected: boolean) => void;
type EventListener = () => void;

class NetworkMonitor {
  private isConnected: boolean = true;
  private unsubscribeNetInfo: (() => void) | null = null;
  private appStateSubscription: any = null;

  // Event listeners
  private networkChangeListeners: Set<NetworkListener> = new Set();
  private networkRestoredListeners: Set<EventListener> = new Set();
  private appForegroundListeners: Set<EventListener> = new Set();

  /**
   * Start monitoring network state
   */
  start(): void {
    console.log('[NetworkMonitor] Starting network monitoring...');

    // Monitor network changes
    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;

      console.log('[NetworkMonitor] Network state changed:', {
        wasConnected,
        isConnected: this.isConnected,
        type: state.type,
      });

      // Emit network change event
      this.networkChangeListeners.forEach(listener => listener(this.isConnected));

      // If network was restored, emit event
      if (!wasConnected && this.isConnected) {
        console.log('[NetworkMonitor] Network restored! Triggering sync...');
        this.networkRestoredListeners.forEach(listener => listener());
      }
    });

    // Monitor app state changes
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );

    console.log('[NetworkMonitor] Network monitoring started');
  }

  /**
   * Handle app state changes (background/foreground)
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      console.log('[NetworkMonitor] App came to foreground');

      // Check network and trigger sync if online
      NetInfo.fetch().then(state => {
        if (state.isConnected) {
          console.log('[NetworkMonitor] App foreground + online, triggering sync...');
          this.appForegroundListeners.forEach(listener => listener());
        }
      });
    }
  };

  /**
   * Stop monitoring network state
   */
  stop(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    console.log('[NetworkMonitor] Network monitoring stopped');
  }

  /**
   * Check if currently online
   */
  async isOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected ?? false;
    } catch (error) {
      console.error('[NetworkMonitor] Error checking network state:', error);
      return false;
    }
  }

  /**
   * Get current connection status synchronously
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Subscribe to network change events
   */
  onNetworkChange(listener: NetworkListener): () => void {
    this.networkChangeListeners.add(listener);
    return () => this.networkChangeListeners.delete(listener);
  }

  /**
   * Subscribe to network restored events
   */
  onNetworkRestored(listener: EventListener): () => void {
    this.networkRestoredListeners.add(listener);
    return () => this.networkRestoredListeners.delete(listener);
  }

  /**
   * Subscribe to app foreground events (when app comes to foreground and is online)
   */
  onAppForeground(listener: EventListener): () => void {
    this.appForegroundListeners.add(listener);
    return () => this.appForegroundListeners.delete(listener);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.networkChangeListeners.clear();
    this.networkRestoredListeners.clear();
    this.appForegroundListeners.clear();
  }
}

// Export singleton instance
export const networkMonitor = new NetworkMonitor();

export default networkMonitor;
