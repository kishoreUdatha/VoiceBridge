import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, Lead, Call, LeadStatus } from '../types';
import { useAppSelector, useAppDispatch } from '../store';
import { fetchLeadById, updateLeadStatus } from '../store/slices/leadsSlice';
import { fetchCallHistory } from '../store/slices/callsSlice';
import CallHistoryItem from '../components/CallHistoryItem';

type Props = NativeStackScreenProps<RootStackParamList, 'LeadDetail'>;

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: '#3B82F6',
  CONTACTED: '#F59E0B',
  QUALIFIED: '#8B5CF6',
  NEGOTIATION: '#EC4899',
  CONVERTED: '#10B981',
  LOST: '#EF4444',
};

const STATUS_OPTIONS: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'NEGOTIATION',
  'CONVERTED',
  'LOST',
];

const LeadDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { leadId } = route.params;
  const dispatch = useAppDispatch();
  const { selectedLead, isLoading, error } = useAppSelector((state) => state.leads);
  const { calls } = useAppSelector((state) => state.calls);
  const [refreshing, setRefreshing] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const loadLeadData = useCallback(async () => {
    try {
      console.log('[LeadDetail] Loading lead:', leadId);
      await Promise.all([
        dispatch(fetchLeadById(leadId)),
        dispatch(fetchCallHistory({ leadId })),
      ]);
      console.log('[LeadDetail] Lead loaded successfully');
    } catch (error) {
      console.error('[LeadDetail] Error loading lead:', error);
    }
  }, [dispatch, leadId]);

  useEffect(() => {
    loadLeadData();
  }, [loadLeadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeadData();
    setRefreshing(false);
  };

  const handleCall = () => {
    if (selectedLead) {
      // Directly open phone dialer to make the call
      const cleanPhone = selectedLead.phone.replace(/[^\d+]/g, '');
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {
        Alert.alert('Error', 'Cannot open phone dialer');
      });
    }
  };

  const handleEmail = () => {
    if (selectedLead?.email) {
      Linking.openURL(`mailto:${selectedLead.email}`);
    }
  };

  const handleWhatsApp = () => {
    if (selectedLead?.phone) {
      const phone = selectedLead.phone.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const handleSMS = () => {
    if (selectedLead?.phone) {
      Linking.openURL(`sms:${selectedLead.phone}`);
    }
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (selectedLead) {
      try {
        await dispatch(updateLeadStatus({ leadId: selectedLead.id, status: newStatus }));
        setShowStatusPicker(false);
      } catch (error) {
        Alert.alert('Error', 'Failed to update lead status');
      }
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditLead', { leadId });
  };

  if (isLoading && !selectedLead) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!selectedLead) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="account-off" size={64} color="#9CA3AF" />
        <Text style={styles.errorText}>{error || 'Lead not found'}</Text>
        <Text style={styles.errorSubtext}>ID: {leadId}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadLeadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const leadCalls = calls.filter((call) => call.leadId === leadId);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {(selectedLead.name || selectedLead.firstName || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.leadName}>{selectedLead.name}</Text>
        {selectedLead.company && (
          <Text style={styles.companyName}>{selectedLead.company}</Text>
        )}
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedLead.status] }]}
          onPress={() => setShowStatusPicker(!showStatusPicker)}
        >
          <Text style={styles.statusText}>{selectedLead.status}</Text>
          <Icon name="chevron-down" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Status Picker */}
        {showStatusPicker && (
          <View style={styles.statusPicker}>
            {STATUS_OPTIONS.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  selectedLead.status === status && styles.statusOptionActive,
                ]}
                onPress={() => handleStatusChange(status)}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]}
                />
                <Text style={styles.statusOptionText}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
          <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
            <Icon name="phone" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleSMS}>
          <View style={[styles.actionIcon, { backgroundColor: '#3B82F6' }]}>
            <Icon name="message-text" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.actionText}>SMS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
          <View style={[styles.actionIcon, { backgroundColor: '#25D366' }]}>
            <Icon name="whatsapp" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.actionText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleEmail}
          disabled={!selectedLead.email}
        >
          <View style={[styles.actionIcon, { backgroundColor: selectedLead.email ? '#F59E0B' : '#D1D5DB' }]}>
            <Icon name="email" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.actionText}>Email</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="phone" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{selectedLead.phone}</Text>
          </View>

          {selectedLead.email && (
            <View style={styles.infoRow}>
              <Icon name="email" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{selectedLead.email}</Text>
            </View>
          )}

          {selectedLead.company && (
            <View style={styles.infoRow}>
              <Icon name="domain" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Company</Text>
              <Text style={styles.infoValue}>{selectedLead.company}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Icon name="tag" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>Source</Text>
            <Text style={styles.infoValue}>{selectedLead.source || 'Unknown'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="calendar" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {new Date(selectedLead.createdAt).toLocaleDateString()}
            </Text>
          </View>

          {selectedLead.lastContactedAt && (
            <View style={styles.infoRow}>
              <Icon name="clock-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Last Contact</Text>
              <Text style={styles.infoValue}>
                {new Date(selectedLead.lastContactedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Notes */}
      {selectedLead.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>{selectedLead.notes}</Text>
          </View>
        </View>
      )}

      {/* Call History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Call History ({leadCalls.length})</Text>
        {leadCalls.length > 0 ? (
          leadCalls.map((call) => (
            <CallHistoryItem key={call.id} call={call} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="phone-off" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No calls yet</Text>
          </View>
        )}
      </View>

      {/* Edit Button */}
      <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
        <Icon name="pencil" size={20} color="#FFFFFF" />
        <Text style={styles.editButtonText}>Edit Lead</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  leadName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  statusPicker: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
    width: '100%',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  statusOptionActive: {
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 32,
  },
});

export default LeadDetailScreen;
