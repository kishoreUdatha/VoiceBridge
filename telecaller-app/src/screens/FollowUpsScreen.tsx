/**
 * Follow-Ups Screen
 * Displays scheduled follow-ups, callbacks, and reminders for the telecaller
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { RootStackParamList, Lead } from '../types';
import { followUpApi, FollowUp, FollowUpStats, FollowUpStatus } from '../api/telecaller';
import { formatRelativeTime, formatDate, formatTime } from '../utils/formatters';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterTab = 'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING';

const FollowUpsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // State
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [stats, setStats] = useState<FollowUpStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [error, setError] = useState<string | null>(null);

  // Reschedule modal state
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Load data
  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);

    try {
      // Load stats and follow-ups in parallel
      const [statsData, followUpsData] = await Promise.all([
        followUpApi.getFollowUpStats().catch(() => null),
        loadFollowUpsByTab(activeTab),
      ]);

      if (statsData) setStats(statsData);
      setFollowUps(followUpsData);
    } catch (err: any) {
      console.error('[FollowUps] Error loading data:', err);
      setError(err.message || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  // Load follow-ups based on active tab
  const loadFollowUpsByTab = async (tab: FilterTab): Promise<FollowUp[]> => {
    try {
      switch (tab) {
        case 'OVERDUE':
          return await followUpApi.getOverdueFollowUps();
        case 'TODAY':
          return await followUpApi.getTodayFollowUps();
        case 'UPCOMING':
          const result = await followUpApi.getFollowUps('UPCOMING');
          return result.followUps;
        case 'ALL':
        default:
          const allResult = await followUpApi.getFollowUps();
          return allResult.followUps;
      }
    } catch (error) {
      console.error('[FollowUps] Error loading follow-ups:', error);
      return [];
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload when tab changes
  useEffect(() => {
    loadData(false);
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  // Handle call action
  const handleCall = (followUp: FollowUp) => {
    if (!followUp.lead) {
      Alert.alert('Error', 'Lead information not available');
      return;
    }

    const lead: Lead = {
      id: followUp.leadId,
      name: `${followUp.lead.firstName} ${followUp.lead.lastName || ''}`.trim(),
      phone: followUp.lead.phone,
      email: followUp.lead.email,
      company: followUp.lead.company,
      status: (followUp.lead.status as any) || 'CONTACTED',
      createdAt: followUp.createdAt,
      updatedAt: followUp.updatedAt,
    };

    navigation.navigate('Call', { lead });
  };

  // Handle complete follow-up
  const handleComplete = async (followUp: FollowUp) => {
    Alert.alert(
      'Complete Follow-up',
      'Mark this follow-up as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await followUpApi.completeFollowUp(followUp.id);
              // Refresh data
              loadData(false);
              Alert.alert('Success', 'Follow-up marked as completed');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to complete follow-up');
            }
          },
        },
      ]
    );
  };

  // Handle reschedule
  const openRescheduleModal = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setRescheduleDate(new Date(followUp.scheduledAt));
    setRescheduleModal(true);
  };

  const handleReschedule = async () => {
    if (!selectedFollowUp) return;

    try {
      await followUpApi.rescheduleFollowUp(
        selectedFollowUp.id,
        rescheduleDate.toISOString()
      );
      setRescheduleModal(false);
      setSelectedFollowUp(null);
      loadData(false);
      Alert.alert('Success', 'Follow-up rescheduled');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reschedule');
    }
  };

  // Check if follow-up is overdue
  const isOverdue = (followUp: FollowUp): boolean => {
    return new Date(followUp.scheduledAt) < new Date() && followUp.status === 'UPCOMING';
  };

  // Check if follow-up is today
  const isToday = (followUp: FollowUp): boolean => {
    const today = new Date();
    const scheduled = new Date(followUp.scheduledAt);
    return (
      scheduled.getDate() === today.getDate() &&
      scheduled.getMonth() === today.getMonth() &&
      scheduled.getFullYear() === today.getFullYear()
    );
  };

  // Get status color
  const getStatusColor = (followUp: FollowUp): string => {
    if (followUp.status === 'COMPLETED') return '#10B981';
    if (followUp.status === 'CANCELLED') return '#6B7280';
    if (isOverdue(followUp)) return '#EF4444';
    if (isToday(followUp)) return '#F59E0B';
    return '#3B82F6';
  };

  // Get status label
  const getStatusLabel = (followUp: FollowUp): string => {
    if (followUp.status === 'COMPLETED') return 'Completed';
    if (followUp.status === 'CANCELLED') return 'Cancelled';
    if (isOverdue(followUp)) return 'Overdue';
    if (isToday(followUp)) return 'Today';
    return 'Upcoming';
  };

  // Render stats card
  const renderStats = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
          <Icon name="alert-circle" size={20} color="#EF4444" />
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.overdue}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
          <Icon name="calendar-today" size={20} color="#F59E0B" />
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.today}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
          <Icon name="calendar-clock" size={20} color="#3B82F6" />
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.upcoming}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
          <Icon name="check-circle" size={20} color="#10B981" />
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>
    );
  };

  // Render filter tabs
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {(['ALL', 'OVERDUE', 'TODAY', 'UPCOMING'] as FilterTab[]).map(tab => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.tabActive]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render follow-up item
  const renderFollowUp = ({ item }: { item: FollowUp }) => {
    const statusColor = getStatusColor(item);
    const statusLabel = getStatusLabel(item);
    const isActionable = item.status === 'UPCOMING';

    return (
      <View style={styles.followUpCard}>
        {/* Header with status */}
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.timeText}>
            {formatRelativeTime(item.scheduledAt)}
          </Text>
        </View>

        {/* Contact info */}
        <View style={styles.contactInfo}>
          <View style={styles.contactAvatar}>
            <Text style={styles.avatarText}>
              {item.lead?.firstName?.charAt(0) || '?'}
            </Text>
          </View>
          <View style={styles.contactDetails}>
            <Text style={styles.contactName}>
              {item.lead ? `${item.lead.firstName} ${item.lead.lastName || ''}`.trim() : 'Unknown Contact'}
            </Text>
            <Text style={styles.contactPhone}>{item.lead?.phone || 'No phone'}</Text>
            {item.lead?.company && (
              <Text style={styles.contactCompany}>{item.lead.company}</Text>
            )}
          </View>
        </View>

        {/* Schedule info */}
        <View style={styles.scheduleInfo}>
          <Icon name="calendar" size={14} color="#6B7280" />
          <Text style={styles.scheduleText}>
            {formatDate(item.scheduledAt)} at {formatTime(item.scheduledAt)}
          </Text>
          <View style={styles.typeBadge}>
            <Icon
              name={item.followUpType === 'AI_CALL' ? 'robot' : 'phone'}
              size={12}
              color="#6B7280"
            />
            <Text style={styles.typeText}>
              {item.followUpType === 'AI_CALL' ? 'AI Call' : item.followUpType === 'HUMAN_CALL' ? 'Call' : 'Manual'}
            </Text>
          </View>
        </View>

        {/* Message if any */}
        {item.message && (
          <View style={styles.messageContainer}>
            <Icon name="message-text-outline" size={14} color="#6B7280" />
            <Text style={styles.messageText} numberOfLines={2}>{item.message}</Text>
          </View>
        )}

        {/* Action buttons */}
        {isActionable && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.callBtn]}
              onPress={() => handleCall(item)}
            >
              <Icon name="phone" size={16} color="#FFF" />
              <Text style={styles.callBtnText}>Call Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rescheduleBtn]}
              onPress={() => openRescheduleModal(item)}
            >
              <Icon name="calendar-clock" size={16} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={() => handleComplete(item)}
            >
              <Icon name="check" size={16} color="#10B981" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="calendar-check" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Follow-ups</Text>
      <Text style={styles.emptyText}>
        {activeTab === 'OVERDUE'
          ? 'Great! No overdue follow-ups.'
          : activeTab === 'TODAY'
          ? 'No follow-ups scheduled for today.'
          : 'No follow-ups found.'}
      </Text>
    </View>
  );

  // Render reschedule modal
  const renderRescheduleModal = () => (
    <Modal
      visible={rescheduleModal}
      transparent
      animationType="slide"
      onRequestClose={() => setRescheduleModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Reschedule Follow-up</Text>

          {selectedFollowUp && (
            <Text style={styles.modalSubtitle}>
              {selectedFollowUp.lead?.firstName} {selectedFollowUp.lead?.lastName || ''}
            </Text>
          )}

          <View style={styles.dateTimeContainer}>
            <TouchableOpacity
              style={styles.dateTimeBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar" size={20} color="#3B82F6" />
              <Text style={styles.dateTimeText}>{formatDate(rescheduleDate.toISOString())}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateTimeBtn}
              onPress={() => setShowTimePicker(true)}
            >
              <Icon name="clock-outline" size={20} color="#3B82F6" />
              <Text style={styles.dateTimeText}>{formatTime(rescheduleDate.toISOString())}</Text>
            </TouchableOpacity>
          </View>

          {(showDatePicker || showTimePicker) && (
            <DateTimePicker
              value={rescheduleDate}
              mode={showDatePicker ? 'date' : 'time'}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(event, date) => {
                setShowDatePicker(false);
                setShowTimePicker(false);
                if (date) setRescheduleDate(date);
              }}
            />
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalCancelBtn]}
              onPress={() => setRescheduleModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalConfirmBtn]}
              onPress={handleReschedule}
            >
              <Text style={styles.modalConfirmText}>Reschedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading follow-ups...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderStats()}
      {renderTabs()}

      {error ? (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={followUps}
          renderItem={renderFollowUp}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderRescheduleModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  followUpCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  contactPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  contactCompany: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  scheduleText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  messageText: {
    fontSize: 13,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  callBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
  },
  callBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  rescheduleBtn: {
    width: 44,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  completeBtn: {
    width: 44,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
  },
  dateTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  dateTimeText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmBtn: {
    backgroundColor: '#3B82F6',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default FollowUpsScreen;
