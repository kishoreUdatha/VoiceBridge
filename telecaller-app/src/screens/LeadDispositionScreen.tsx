import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList } from '../types';
import {
  submitLeadDisposition,
  fetchAssignableTelecallers,
  LeadDispositionPayload,
} from '../api/leads';

type Props = NativeStackScreenProps<RootStackParamList, 'LeadDisposition'>;

const NOT_CONNECTED_REASONS = [
  { key: 'did_not_pick', label: 'Did not pick' },
  { key: 'busy', label: 'Busy' },
  { key: 'switched_off', label: 'Switched off' },
  { key: 'network_issue', label: 'Network issue' },
  { key: 'wrong_number', label: 'Wrong number' },
  { key: 'other', label: 'Other' },
];

const CONNECTED_REASONS = [
  { key: 'interested', label: 'Interested' },
  { key: 'not_interested', label: 'Not interested' },
  { key: 'callback_later', label: 'Callback later' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'converted', label: 'Converted' },
  { key: 'do_not_disturb', label: 'Do not disturb' },
  { key: 'other', label: 'Other' },
];

const QUICK_FOLLOWUPS = [
  { key: '1h', label: '1 hour', minutes: 60 },
  { key: '6h', label: '6 hours', minutes: 360 },
  { key: '1d', label: '1 day', minutes: 1440 },
  { key: '3d', label: '3 days', minutes: 4320 },
];

const PURPLE = '#6B4EE6';
const PURPLE_DARK = '#5A3FD6';

const LeadDispositionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { leadId, callId } = route.params;

  const [callConnected, setCallConnected] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState('');
  const [followUpAt, setFollowUpAt] = useState<Date | null>(null);
  const [activeQuickFollowUp, setActiveQuickFollowUp] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reassign, setReassign] = useState(false);
  const [reassignTo, setReassignTo] = useState<{ id: string; name: string } | null>(null);
  const [team, setTeam] = useState<{ id: string; name: string }[]>([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (reassign && team.length === 0) {
      fetchAssignableTelecallers().then(setTeam);
    }
  }, [reassign, team.length]);

  const reasonOptions = useMemo(
    () => (callConnected ? CONNECTED_REASONS : NOT_CONNECTED_REASONS),
    [callConnected]
  );

  const handleQuickFollowUp = (q: typeof QUICK_FOLLOWUPS[number]) => {
    const dt = new Date(Date.now() + q.minutes * 60 * 1000);
    setFollowUpAt(dt);
    setActiveQuickFollowUp(q.key);
  };

  const handleConnectedToggle = (value: boolean) => {
    setCallConnected(value);
    setReason(null);
    setOtherReason('');
  };

  const validate = (): string | null => {
    if (callConnected === null) return 'Please answer "Was the call connected?"';
    if (!reason) return 'Please select a reason';
    if (reason === 'other' && !otherReason.trim()) return 'Please enter the other reason';
    if (reassign && !reassignTo) return 'Please select a teammate to reassign to';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Required', err);
      return;
    }

    const payload: LeadDispositionPayload = {
      lead_id: leadId,
      call_id: callId,
      call_connected: callConnected!,
      reason: reason!,
      other_reason: reason === 'other' ? otherReason.trim() : undefined,
      next_follow_up: followUpAt ? followUpAt.toISOString() : undefined,
      reassigned: reassign,
      reassign_to: reassign ? reassignTo?.id : undefined,
      notes: notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      await submitLeadDisposition(payload);
      Alert.alert('Saved', 'Call outcome submitted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert(
        'Submit failed',
        e?.response?.data?.message || e?.message || 'Unable to save outcome. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (d: Date) =>
    `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Call Outcome</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Card: Call connected toggle */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Was the call connected?</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                callConnected === false && styles.toggleBtnActiveRed,
              ]}
              onPress={() => handleConnectedToggle(false)}
              activeOpacity={0.8}
            >
              <Icon
                name="phone-missed"
                size={20}
                color={callConnected === false ? '#FFFFFF' : '#EF4444'}
              />
              <Text
                style={[
                  styles.toggleBtnText,
                  callConnected === false && styles.toggleBtnTextActive,
                ]}
              >
                Not Connected
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleBtn,
                callConnected === true && styles.toggleBtnActiveGreen,
              ]}
              onPress={() => handleConnectedToggle(true)}
              activeOpacity={0.8}
            >
              <Icon
                name="phone-check"
                size={20}
                color={callConnected === true ? '#FFFFFF' : '#10B981'}
              />
              <Text
                style={[
                  styles.toggleBtnText,
                  callConnected === true && styles.toggleBtnTextActive,
                ]}
              >
                Yes Connected
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card: Reason radio list */}
        {callConnected !== null && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {callConnected ? 'How did it go?' : 'Why not connected?'}
              <Text style={styles.required}> *</Text>
            </Text>
            <View style={styles.radioList}>
              {reasonOptions.map((opt) => {
                const selected = reason === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.radioRow, selected && styles.radioRowSelected]}
                    onPress={() => setReason(opt.key)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected && <View style={styles.radioInner} />}
                    </View>
                    <Text
                      style={[styles.radioLabel, selected && styles.radioLabelSelected]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {reason === 'other' && (
              <TextInput
                style={styles.input}
                placeholder="Please specify..."
                placeholderTextColor="#9CA3AF"
                value={otherReason}
                onChangeText={setOtherReason}
                multiline
              />
            )}
          </View>
        )}

        {/* Card: Next action / follow up */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Action</Text>
          <Text style={styles.cardSubtitle}>Schedule a follow-up reminder</Text>

          <View style={styles.quickRow}>
            {QUICK_FOLLOWUPS.map((q) => {
              const active = activeQuickFollowUp === q.key;
              return (
                <TouchableOpacity
                  key={q.key}
                  style={[styles.quickBtn, active && styles.quickBtnActive]}
                  onPress={() => handleQuickFollowUp(q)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.quickBtnText, active && styles.quickBtnTextActive]}
                  >
                    {q.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Icon name="calendar" size={18} color={PURPLE} />
              <Text style={styles.dateBtnText}>
                {followUpAt ? followUpAt.toLocaleDateString() : 'Pick date'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.8}
            >
              <Icon name="clock-outline" size={18} color={PURPLE} />
              <Text style={styles.dateBtnText}>
                {followUpAt
                  ? followUpAt.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Pick time'}
              </Text>
            </TouchableOpacity>
          </View>

          {followUpAt && (
            <View style={styles.scheduledPill}>
              <Icon name="check-circle" size={14} color="#10B981" />
              <Text style={styles.scheduledText}>
                Scheduled for {formatDateTime(followUpAt)}
              </Text>
            </View>
          )}
        </View>

        {/* Card: Reassign */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setReassign(!reassign)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, reassign && styles.checkboxChecked]}>
              {reassign && <Icon name="check" size={16} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkLabel}>Re-assign this lead</Text>
              <Text style={styles.cardSubtitle}>Transfer to another teammate</Text>
            </View>
          </TouchableOpacity>

          {reassign && (
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowTeamModal(true)}
              activeOpacity={0.8}
            >
              <Icon name="account-circle-outline" size={20} color={PURPLE} />
              <Text
                style={[
                  styles.dropdownText,
                  !reassignTo && { color: '#9CA3AF' },
                ]}
              >
                {reassignTo ? reassignTo.name : 'Select teammate'}
              </Text>
              <Icon name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Card: Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            placeholder="Any additional context..."
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky submit */}
      <View style={styles.submitBar}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="check-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Submit Outcome</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date / Time pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={followUpAt || new Date()}
          mode="date"
          minimumDate={new Date()}
          onChange={(_, d) => {
            setShowDatePicker(false);
            if (d) {
              const next = new Date(followUpAt || new Date());
              next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
              setFollowUpAt(next);
              setActiveQuickFollowUp(null);
            }
          }}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={followUpAt || new Date()}
          mode="time"
          onChange={(_, d) => {
            setShowTimePicker(false);
            if (d) {
              const next = new Date(followUpAt || new Date());
              next.setHours(d.getHours(), d.getMinutes());
              setFollowUpAt(next);
              setActiveQuickFollowUp(null);
            }
          }}
        />
      )}

      {/* Reassign teammate modal */}
      <Modal
        visible={showTeamModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTeamModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Teammate</Text>
              <TouchableOpacity onPress={() => setShowTeamModal(false)}>
                <Icon name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {team.length === 0 ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280' }}>No teammates available</Text>
              </View>
            ) : (
              <FlatList
                data={team}
                keyExtractor={(i) => i.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.teamRow}
                    onPress={() => {
                      setReassignTo(item);
                      setShowTeamModal(false);
                    }}
                  >
                    <Icon name="account-circle" size={28} color={PURPLE} />
                    <Text style={styles.teamName}>{item.name}</Text>
                    {reassignTo?.id === item.id && (
                      <Icon name="check" size={20} color={PURPLE} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1EB' },
  header: {
    backgroundColor: PURPLE_DARK,
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingBottom: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  required: { color: '#EF4444' },

  /* Toggle */
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  toggleBtnActiveRed: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  toggleBtnActiveGreen: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  toggleBtnTextActive: { color: '#FFFFFF' },

  /* Radio list */
  radioList: { marginTop: 8 },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  radioRowSelected: {
    borderColor: PURPLE,
    backgroundColor: '#F5F3FF',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioOuterSelected: { borderColor: PURPLE },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PURPLE,
  },
  radioLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  radioLabelSelected: { color: PURPLE, fontWeight: '700' },

  /* Input */
  input: {
    marginTop: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },

  /* Quick follow-ups */
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickBtnActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  quickBtnTextActive: { color: '#FFFFFF' },

  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  dateBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: PURPLE,
  },
  scheduledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  scheduledText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },

  /* Reassign */
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  checkLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },

  /* Sticky submit */
  submitBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  teamName: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
});

export default LeadDispositionScreen;
