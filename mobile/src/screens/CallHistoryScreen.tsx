import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import telecallerService, { TelecallerCall } from '../services/telecaller.service';

const OUTCOMES = [
  { value: '', label: 'All', color: '#6b7280' },
  { value: 'INTERESTED', label: 'Interested', color: '#10b981' },
  { value: 'CONVERTED', label: 'Converted', color: '#8b5cf6' },
  { value: 'CALLBACK', label: 'Callback', color: '#f59e0b' },
  { value: 'NOT_INTERESTED', label: 'Not Interested', color: '#ef4444' },
  { value: 'NO_ANSWER', label: 'No Answer', color: '#6b7280' },
];

const OUTCOME_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  INTERESTED: { color: '#10b981', bg: '#d1fae5', label: 'Interested' },
  CONVERTED: { color: '#8b5cf6', bg: '#ede9fe', label: 'Converted' },
  CALLBACK: { color: '#f59e0b', bg: '#fef3c7', label: 'Callback' },
  NOT_INTERESTED: { color: '#ef4444', bg: '#fee2e2', label: 'Not Interested' },
  NO_ANSWER: { color: '#6b7280', bg: '#f3f4f6', label: 'No Answer' },
  BUSY: { color: '#f97316', bg: '#ffedd5', label: 'Busy' },
  WRONG_NUMBER: { color: '#dc2626', bg: '#fee2e2', label: 'Wrong Number' },
};

export default function CallHistoryScreen() {
  const navigation = useNavigation<any>();
  const [calls, setCalls] = useState<TelecallerCall[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchCalls = useCallback(async (reset = false) => {
    try {
      const newOffset = reset ? 0 : offset;
      const res = await telecallerService.getMyCalls({
        outcome: selectedOutcome || undefined,
        limit: 20,
        offset: newOffset,
      });

      const data = res.data.data;
      if (reset) {
        setCalls(data.calls || []);
      } else {
        setCalls(prev => [...prev, ...(data.calls || [])]);
      }
      setTotal(data.total || 0);
      setHasMore((data.calls?.length || 0) === 20);
      setOffset(newOffset + 20);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedOutcome, offset]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      setOffset(0);
      fetchCalls(true);
    }, [selectedOutcome])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    setOffset(0);
    fetchCalls(true);
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchCalls(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getOutcomeStyle = (outcome?: string) => {
    return OUTCOME_STYLES[outcome || ''] || { color: '#3b82f6', bg: '#dbeafe', label: 'Pending' };
  };

  const handleCallAgain = (phoneNumber: string, contactName?: string) => {
    Alert.alert(
      'Call Again',
      `Call ${contactName || phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            // Open phone dialer
            Linking.openURL(`tel:${phoneNumber}`).catch(() => {
              Alert.alert('Error', 'Unable to open phone dialer');
            });
          },
        },
        {
          text: 'Log Call',
          onPress: () => {
            // Navigate to NewCallScreen with phone number pre-filled
            navigation.navigate('NewCall', { phoneNumber, contactName });
          },
        },
      ]
    );
  };

  const renderCallItem = ({ item }: { item: TelecallerCall }) => {
    const outcomeStyle = getOutcomeStyle(item.outcome);
    return (
      <TouchableOpacity
        style={styles.callCard}
        onPress={() => navigation.navigate('CallDetail', { call: item })}
      >
        <View style={styles.callHeader}>
          <View style={styles.callAvatar}>
            <Text style={styles.callAvatarText}>
              {(item.contactName || item.phoneNumber).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.callInfo}>
            <Text style={styles.callName}>{item.contactName || 'Unknown'}</Text>
            <Text style={styles.callPhone}>{item.phoneNumber}</Text>
          </View>
          <View style={[styles.outcomeBadge, { backgroundColor: outcomeStyle.bg }]}>
            <Text style={[styles.outcomeText, { color: outcomeStyle.color }]}>
              {outcomeStyle.label}
            </Text>
          </View>
        </View>
        <View style={styles.callFooter}>
          <Text style={styles.callTime}>{formatDateTime(item.createdAt)}</Text>
          <Text style={styles.callDuration}>{formatDuration(item.duration)}</Text>
        </View>
        {item.notes && (
          <Text style={styles.callNotes} numberOfLines={2}>{item.notes}</Text>
        )}
        {/* Call Again Button */}
        <TouchableOpacity
          style={styles.callAgainButton}
          onPress={(e) => {
            e.stopPropagation();
            handleCallAgain(item.phoneNumber, item.contactName);
          }}
        >
          <Text style={styles.callAgainIcon}>📞</Text>
          <Text style={styles.callAgainText}>Call Again</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={OUTCOMES}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedOutcome === item.value && { backgroundColor: item.color },
              ]}
              onPress={() => setSelectedOutcome(item.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedOutcome === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>{total} calls</Text>
      </View>

      {/* Calls List */}
      {isLoading && calls.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : calls.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📞</Text>
          <Text style={styles.emptyText}>No calls found</Text>
          <Text style={styles.emptySubtext}>
            {selectedOutcome ? 'Try a different filter' : 'Start logging your calls'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          renderItem={renderCallItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore && calls.length > 0 ? (
              <ActivityIndicator style={{ padding: 16 }} color="#3b82f6" />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4b5563',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultsCount: {
    fontSize: 13,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  callCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  callHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  callAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
  },
  callInfo: {
    flex: 1,
  },
  callName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  callPhone: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  outcomeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  outcomeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  callFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  callTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  callDuration: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
  },
  callNotes: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  callAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  callAgainIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  callAgainText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
