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
import LinearGradient from 'react-native-linear-gradient';
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

const InfoRow: React.FC<{
  icon: string;
  iconColor: string;
  label: string;
  value?: string | null;
  isLast?: boolean;
}> = ({ icon, iconColor, label, value, isLast }) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={[styles.infoIconWrap, { backgroundColor: iconColor + '1A' }]}>
      <Icon name={icon} size={18} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  </View>
);

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
      // Navigate to CallScreen which handles recording and call tracking
      navigation.navigate('Call', { lead: selectedLead });
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
      <LinearGradient
        colors={['#6B4EE6', '#5A3FD6', '#A06CD5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerCard}
      >
        <View style={styles.headerBlob} />
        <LinearGradient
          colors={['#FFFFFF', '#F3F4F6']}
          style={styles.avatarContainer}
        >
          <Text style={styles.avatarText}>
            {(selectedLead.name || selectedLead.firstName || '?').charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>
        <Text style={styles.leadName}>{selectedLead.name}</Text>
        {selectedLead.company && (
          <View style={styles.companyChip}>
            <Icon name="office-building" size={12} color="#FFFFFF" />
            <Text style={styles.companyName}>{selectedLead.company}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedLead.status] }]}
          onPress={() => setShowStatusPicker(!showStatusPicker)}
          activeOpacity={0.85}
        >
          <Icon name="circle" size={8} color="#FFFFFF" />
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
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCall} activeOpacity={0.7}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.actionIcon}>
            <Icon name="phone" size={22} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleSMS} activeOpacity={0.7}>
          <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.actionIcon}>
            <Icon name="message-text" size={22} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.actionText}>SMS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp} activeOpacity={0.7}>
          <LinearGradient colors={['#25D366', '#128C7E']} style={styles.actionIcon}>
            <Icon name="whatsapp" size={22} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.actionText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleEmail}
          disabled={!selectedLead.email}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={selectedLead.email ? ['#F59E0B', '#D97706'] : ['#D1D5DB', '#9CA3AF']}
            style={styles.actionIcon}
          >
            <Icon name="email" size={22} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.actionText}>Email</Text>
        </TouchableOpacity>
      </View>

      {/* Log Call Outcome CTA */}
      <TouchableOpacity
        style={styles.dispositionCta}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('LeadDisposition', { leadId: selectedLead.id })}
      >
        <Icon name="clipboard-edit-outline" size={20} color="#FFFFFF" />
        <Text style={styles.dispositionCtaText}>Log Call Outcome</Text>
      </TouchableOpacity>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="phone" iconColor="#10B981" label="Phone" value={selectedLead.phone} />
          {selectedLead.email && (
            <InfoRow icon="email" iconColor="#3B82F6" label="Email" value={selectedLead.email} />
          )}
          {selectedLead.company && (
            <InfoRow icon="domain" iconColor="#A06CD5" label="Company" value={selectedLead.company} />
          )}
          <InfoRow icon="tag" iconColor="#F59E0B" label="Source" value={selectedLead.source || 'Unknown'} />
          <InfoRow
            icon="calendar"
            iconColor="#6B4EE6"
            label="Created"
            value={new Date(selectedLead.createdAt).toLocaleDateString()}
          />
          {selectedLead.lastContactedAt && (
            <InfoRow
              icon="clock-outline"
              iconColor="#EC4899"
              label="Last Contact"
              value={new Date(selectedLead.lastContactedAt).toLocaleDateString()}
              isLast
            />
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
  dispositionCta: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#6B4EE6',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#6B4EE6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dispositionCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
