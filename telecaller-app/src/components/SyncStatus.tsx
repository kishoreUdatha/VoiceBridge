/**
 * Sync Status Component
 * Displays offline queue status and sync progress
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { offlineQueue, QueueStatus, QueueItem } from '../services/offlineQueue';
import { networkMonitor } from '../services/networkMonitor';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SyncStatusProps {
  style?: any;
  showWhenSynced?: boolean;
  compact?: boolean;
}

const SyncStatus: React.FC<SyncStatusProps> = ({
  style,
  showWhenSynced = false,
  compact = false,
}) => {
  const [status, setStatus] = useState<QueueStatus>(offlineQueue.getStatus());
  const [isOnline, setIsOnline] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [failedItems, setFailedItems] = useState<QueueItem[]>([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subscribe to queue status changes
    const unsubscribeStatus = offlineQueue.subscribeToStatus(newStatus => {
      setStatus(newStatus);
      setIsOnline(newStatus.isOnline);
    });

    // Subscribe to queue changes for failed items
    const unsubscribeQueue = offlineQueue.subscribe(queue => {
      setFailedItems(queue.filter(item => item.status === 'failed'));
    });

    // Subscribe to network changes
    const unsubscribeNetwork = networkMonitor.onNetworkChange(connected => {
      setIsOnline(connected);
    });

    // Initial network check
    networkMonitor.isOnline().then(setIsOnline);

    return () => {
      unsubscribeStatus();
      unsubscribeQueue();
      unsubscribeNetwork();
    };
  }, []);

  // Pulse animation when syncing
  useEffect(() => {
    if (status.processing > 0) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status.processing, pulseAnim]);

  // Expand animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [expanded, slideAnim]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleRetryFailed = async () => {
    await offlineQueue.retryFailed();
  };

  const handleClearFailed = async () => {
    await offlineQueue.clearFailed();
  };

  // Determine what to show
  const shouldShow = !isOnline || status.total > 0 || showWhenSynced;

  if (!shouldShow) {
    return null;
  }

  // Determine status type
  let statusType: 'offline' | 'syncing' | 'pending' | 'failed' | 'synced' = 'synced';
  if (!isOnline) {
    statusType = 'offline';
  } else if (status.processing > 0) {
    statusType = 'syncing';
  } else if (status.failed > 0) {
    statusType = 'failed';
  } else if (status.pending > 0) {
    statusType = 'pending';
  }

  const getStatusConfig = () => {
    switch (statusType) {
      case 'offline':
        return {
          icon: 'wifi-off',
          iconColor: '#EF4444',
          text: 'Offline - Changes will sync when connected',
          textColor: '#EF4444',
          bgColor: '#FEE2E2',
        };
      case 'syncing':
        return {
          icon: 'sync',
          iconColor: '#3B82F6',
          text: `Syncing ${status.processing} item${status.processing > 1 ? 's' : ''}...`,
          textColor: '#3B82F6',
          bgColor: '#DBEAFE',
        };
      case 'pending':
        return {
          icon: 'clock-outline',
          iconColor: '#F59E0B',
          text: `${status.pending} pending`,
          textColor: '#F59E0B',
          bgColor: '#FEF3C7',
        };
      case 'failed':
        return {
          icon: 'alert-circle',
          iconColor: '#EF4444',
          text: `${status.failed} failed`,
          textColor: '#EF4444',
          bgColor: '#FEE2E2',
        };
      case 'synced':
      default:
        return {
          icon: 'check-circle',
          iconColor: '#10B981',
          text: 'All synced',
          textColor: '#10B981',
          bgColor: '#D1FAE5',
        };
    }
  };

  const config = getStatusConfig();

  if (compact) {
    // Compact mode - just show icon
    return (
      <View style={[styles.compactContainer, { backgroundColor: config.bgColor }, style]}>
        {statusType === 'syncing' ? (
          <Animated.View style={{ opacity: pulseAnim }}>
            <Icon name={config.icon} size={16} color={config.iconColor} />
          </Animated.View>
        ) : (
          <Icon name={config.icon} size={16} color={config.iconColor} />
        )}
        {status.total > 0 && statusType !== 'synced' && (
          <Text style={[styles.compactBadge, { color: config.textColor }]}>
            {status.total}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }, style]}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {statusType === 'syncing' ? (
            <Animated.View style={{ opacity: pulseAnim }}>
              <Icon name={config.icon} size={18} color={config.iconColor} />
            </Animated.View>
          ) : (
            <Icon name={config.icon} size={18} color={config.iconColor} />
          )}
          <Text style={[styles.statusText, { color: config.textColor }]}>
            {config.text}
          </Text>
        </View>

        {status.total > 0 && (
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#6B7280"
          />
        )}
      </TouchableOpacity>

      {/* Expanded Details */}
      {expanded && status.total > 0 && (
        <View style={styles.details}>
          {/* Status Breakdown */}
          <View style={styles.breakdown}>
            <View style={styles.breakdownItem}>
              <Icon name="clock-outline" size={14} color="#F59E0B" />
              <Text style={styles.breakdownText}>Pending: {status.pending}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Icon name="sync" size={14} color="#3B82F6" />
              <Text style={styles.breakdownText}>Processing: {status.processing}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Icon name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.breakdownText}>Failed: {status.failed}</Text>
            </View>
          </View>

          {/* Failed Items List */}
          {failedItems.length > 0 && (
            <View style={styles.failedList}>
              <Text style={styles.failedTitle}>Failed Items:</Text>
              {failedItems.slice(0, 3).map(item => (
                <View key={item.id} style={styles.failedItem}>
                  <View style={styles.failedItemInfo}>
                    <Text style={styles.failedItemType}>
                      {item.type.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.failedItemError} numberOfLines={1}>
                      {item.lastError || 'Unknown error'}
                    </Text>
                  </View>
                  <Text style={styles.failedItemRetries}>
                    {item.retries}/{5}
                  </Text>
                </View>
              ))}
              {failedItems.length > 3 && (
                <Text style={styles.moreItems}>
                  +{failedItems.length - 3} more
                </Text>
              )}
            </View>
          )}

          {/* Actions */}
          {status.failed > 0 && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetryFailed}
              >
                <Icon name="refresh" size={14} color="#FFF" />
                <Text style={styles.retryButtonText}>Retry All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearFailed}
              >
                <Icon name="close" size={14} color="#6B7280" />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  details: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  breakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 4,
  },
  failedList: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  failedTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  failedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  failedItemInfo: {
    flex: 1,
  },
  failedItemType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textTransform: 'capitalize',
  },
  failedItemError: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  failedItemRetries: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '500',
    marginLeft: 8,
  },
  moreItems: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default SyncStatus;
