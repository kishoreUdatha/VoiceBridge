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
  StatusBar,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, Lead, Call, LeadStatus } from '../types';
import { useAppSelector, useAppDispatch } from '../store';
import { fetchLeadById, updateLeadStatus } from '../store/slices/leadsSlice';
import { fetchCallHistory } from '../store/slices/callsSlice';
import CallHistoryItem from '../components/CallHistoryItem';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { Avatar, Badge, Card } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'LeadDetail'>;

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: colors.primary[500],
  CONTACTED: colors.warning[500],
  QUALIFIED: '#8B5CF6',
  NEGOTIATION: '#EC4899',
  CONVERTED: colors.success[500],
  LOST: colors.error[500],
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
      await Promise.all([
        dispatch(fetchLeadById(leadId)),
        dispatch(fetchCallHistory({ leadId })),
      ]);
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
      navigation.navigate('SmartCallPrep', { lead: selectedLead });
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
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading lead details...</Text>
      </View>
    );
  }

  if (!selectedLead) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconBg}>
          <Icon name="account-off" size={48} color={colors.neutral[400]} />
        </View>
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary[600]} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.neutral[0]}
          />
        }
      >
        {/* Header with Avatar */}
        <LinearGradient
          colors={[colors.primary[600], colors.primary[700]]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Icon name="arrow-left" size={24} color={colors.neutral[0]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEdit} style={styles.editBtn}>
              <Icon name="pencil" size={20} color={colors.neutral[0]} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <Avatar
              name={selectedLead.name}
              size="xl"
              backgroundColor={`${colors.neutral[0]}20`}
              textColor={colors.neutral[0]}
            />
            <Text style={styles.leadName}>{selectedLead.name}</Text>
            {selectedLead.company && (
              <Text style={styles.companyName}>{selectedLead.company}</Text>
            )}
            <TouchableOpacity
              style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[selectedLead.status]}20` }]}
              onPress={() => setShowStatusPicker(!showStatusPicker)}
            >
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[selectedLead.status] }]} />
              <Text style={[styles.statusText, { color: STATUS_COLORS[selectedLead.status] }]}>
                {selectedLead.status}
              </Text>
              <Icon name="chevron-down" size={16} color={STATUS_COLORS[selectedLead.status]} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Status Picker */}
        {showStatusPicker && (
          <Card style={styles.statusPicker}>
            <Text style={styles.statusPickerTitle}>Change Status</Text>
            {STATUS_OPTIONS.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  selectedLead.status === status && styles.statusOptionActive,
                ]}
                onPress={() => handleStatusChange(status)}
              >
                <View style={[styles.statusOptionDot, { backgroundColor: STATUS_COLORS[status] }]} />
                <Text style={styles.statusOptionText}>{status}</Text>
                {selectedLead.status === status && (
                  <Icon name="check" size={18} color={colors.primary[500]} />
                )}
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <LinearGradient
              colors={[colors.success[500], colors.success[600]]}
              style={styles.actionGradient}
            >
              <Icon name="phone" size={22} color={colors.neutral[0]} />
            </LinearGradient>
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleSMS}>
            <View style={[styles.actionIcon, { backgroundColor: colors.primary[500] }]}>
              <Icon name="message-text" size={22} color={colors.neutral[0]} />
            </View>
            <Text style={styles.actionText}>SMS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
            <View style={[styles.actionIcon, { backgroundColor: '#25D366' }]}>
              <Icon name="whatsapp" size={22} color={colors.neutral[0]} />
            </View>
            <Text style={styles.actionText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleEmail}
            disabled={!selectedLead.email}
          >
            <View style={[styles.actionIcon, { backgroundColor: selectedLead.email ? colors.warning[500] : colors.neutral[300] }]}>
              <Icon name="email" size={22} color={colors.neutral[0]} />
            </View>
            <Text style={[styles.actionText, !selectedLead.email && { color: colors.text.tertiary }]}>
              Email
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Card padding="none">
            <InfoRow icon="phone" label="Phone" value={selectedLead.phone} />
            {selectedLead.email && (
              <InfoRow icon="email" label="Email" value={selectedLead.email} />
            )}
            {selectedLead.company && (
              <InfoRow icon="domain" label="Company" value={selectedLead.company} />
            )}
            <InfoRow icon="tag" label="Source" value={selectedLead.source || 'Unknown'} />
            <InfoRow
              icon="calendar"
              label="Created"
              value={new Date(selectedLead.createdAt).toLocaleDateString()}
            />
            {selectedLead.lastContactedAt && (
              <InfoRow
                icon="clock-outline"
                label="Last Contact"
                value={new Date(selectedLead.lastContactedAt).toLocaleDateString()}
                showDivider={false}
              />
            )}
          </Card>
        </View>

        {/* Notes */}
        {selectedLead.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Card>
              <Text style={styles.notesText}>{selectedLead.notes}</Text>
            </Card>
          </View>
        )}

        {/* Call History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Call History</Text>
            <Badge label={`${leadCalls.length}`} variant="info" size="sm" />
          </View>
          {leadCalls.length > 0 ? (
            <Card padding="none">
              {leadCalls.map((call, index) => (
                <CallHistoryItem
                  key={call.id}
                  call={call}
                  showDivider={index < leadCalls.length - 1}
                />
              ))}
            </Card>
          ) : (
            <Card style={styles.emptyState}>
              <Icon name="phone-off" size={40} color={colors.neutral[300]} />
              <Text style={styles.emptyText}>No calls recorded yet</Text>
            </Card>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const InfoRow = ({ icon, label, value, showDivider = true }: any) => (
  <View style={[styles.infoRow, !showDivider && styles.infoRowNoBorder]}>
    <View style={styles.infoIconContainer}>
      <Icon name={icon} size={18} color={colors.text.secondary} />
    </View>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background.secondary,
  },
  errorIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginTop: spacing.base,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  retryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.base,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    color: colors.neutral[0],
    fontWeight: typography.fontWeight.semiBold,
    fontSize: typography.fontSize.base,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.base,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${colors.neutral[0]}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${colors.neutral[0]}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
  },
  leadName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
    marginTop: spacing.md,
  },
  companyName: {
    fontSize: typography.fontSize.base,
    color: `${colors.neutral[0]}80`,
    marginTop: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
  },
  statusPicker: {
    marginHorizontal: spacing.base,
    marginTop: -spacing.md,
    marginBottom: spacing.sm,
  },
  statusPickerTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  statusOptionActive: {
    backgroundColor: colors.neutral[50],
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
  },
  statusOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background.card,
    paddingVertical: spacing.lg,
    marginTop: -spacing.base,
    marginHorizontal: spacing.base,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  infoRowNoBorder: {
    borderBottomWidth: 0,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'right',
  },
  notesText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  bottomPadding: {
    height: spacing['2xl'],
  },
});

export default LeadDetailScreen;
