import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import telecallerService from '../services/telecaller.service';

const OUTCOMES = [
  { value: 'INTERESTED', label: 'Interested', icon: '👍', color: '#10b981', bg: '#d1fae5' },
  { value: 'CONVERTED', label: 'Converted', icon: '🎉', color: '#8b5cf6', bg: '#ede9fe' },
  { value: 'CALLBACK', label: 'Callback', icon: '📅', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'NOT_INTERESTED', label: 'Not Interested', icon: '👎', color: '#ef4444', bg: '#fee2e2' },
  { value: 'NO_ANSWER', label: 'No Answer', icon: '📵', color: '#6b7280', bg: '#f3f4f6' },
  { value: 'BUSY', label: 'Busy', icon: '⏳', color: '#f97316', bg: '#ffedd5' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number', icon: '❌', color: '#dc2626', bg: '#fee2e2' },
];

const DURATIONS = [
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 180, label: '3m' },
  { value: 300, label: '5m' },
  { value: 600, label: '10m' },
];

export default function NewCallScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const lead = route.params?.lead;

  const [phoneNumber, setPhoneNumber] = useState(lead?.phone || '');
  const [contactName, setContactName] = useState(lead ? `${lead.firstName} ${lead.lastName || ''}`.trim() : '');
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [customDuration, setCustomDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);

  // Make actual phone call
  const makeCall = async () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    const phoneUrl = Platform.OS === 'ios' ? `tel:${phoneNumber}` : `tel:${phoneNumber}`;

    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        setCallStarted(true);
        setCallStartTime(new Date());
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    } catch (error) {
      console.error('Error making call:', error);
      Alert.alert('Error', 'Failed to make call');
    }
  };

  // Calculate duration from call start time
  useEffect(() => {
    if (callStarted && callStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((new Date().getTime() - callStartTime.getTime()) / 1000);
        setDuration(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callStarted, callStartTime]);

  const handleSubmit = async () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    if (!selectedOutcome) {
      Alert.alert('Error', 'Please select an outcome');
      return;
    }

    const finalDuration = customDuration ? parseInt(customDuration) * 60 : duration;

    setIsSubmitting(true);
    try {
      await telecallerService.logCall({
        phoneNumber: phoneNumber.trim(),
        contactName: contactName.trim() || undefined,
        leadId: lead?.id,
        status: 'COMPLETED',
        outcome: selectedOutcome,
        duration: finalDuration,
        notes: notes.trim() || undefined,
        callDirection: 'OUTBOUND',
      });

      Alert.alert('Success', 'Call logged successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error logging call:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to log call');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <View style={styles.phoneInputRow}>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder="+91 98765 43210"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!lead}
            />
            <TouchableOpacity style={styles.callButton} onPress={makeCall}>
              <Text style={styles.callButtonText}>📞 Call</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter contact name"
            value={contactName}
            onChangeText={setContactName}
          />
        </View>
      </View>

      {/* Call Timer (if call started) */}
      {callStarted && (
        <View style={styles.timerSection}>
          <Text style={styles.timerLabel}>Call Duration</Text>
          <Text style={styles.timerValue}>{formatDuration(duration)}</Text>
          <TouchableOpacity
            style={styles.endCallButton}
            onPress={() => setCallStarted(false)}
          >
            <Text style={styles.endCallText}>End Call Timer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Outcome Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Call Outcome *</Text>
        <View style={styles.outcomesGrid}>
          {OUTCOMES.map((outcome) => (
            <TouchableOpacity
              key={outcome.value}
              style={[
                styles.outcomeCard,
                selectedOutcome === outcome.value && {
                  backgroundColor: outcome.bg,
                  borderColor: outcome.color,
                },
              ]}
              onPress={() => setSelectedOutcome(outcome.value)}
            >
              <Text style={styles.outcomeIcon}>{outcome.icon}</Text>
              <Text
                style={[
                  styles.outcomeLabel,
                  selectedOutcome === outcome.value && { color: outcome.color },
                ]}
              >
                {outcome.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Duration Selection (if not using timer) */}
      {!callStarted && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Call Duration</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[
                  styles.durationChip,
                  duration === d.value && !customDuration && styles.durationChipActive,
                ]}
                onPress={() => {
                  setDuration(d.value);
                  setCustomDuration('');
                }}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    duration === d.value && !customDuration && styles.durationChipTextActive,
                  ]}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.customDurationRow}>
            <Text style={styles.orText}>or</Text>
            <TextInput
              style={styles.customDurationInput}
              placeholder="Custom (mins)"
              value={customDuration}
              onChangeText={(text) => {
                setCustomDuration(text);
                if (text) setDuration(0);
              }}
              keyboardType="numeric"
            />
          </View>
        </View>
      )}

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add any notes about the call..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Log Call</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  phoneInput: {
    flex: 1,
  },
  callButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  timerSection: {
    backgroundColor: '#3b82f6',
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  timerLabel: {
    color: '#bfdbfe',
    fontSize: 14,
  },
  timerValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  endCallButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  endCallText: {
    color: '#fff',
    fontWeight: '600',
  },
  outcomesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  outcomeCard: {
    width: '31%',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  outcomeIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  outcomeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  durationChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  durationChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  durationChipTextActive: {
    color: '#fff',
  },
  customDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  orText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  customDurationInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  notesInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    color: '#1f2937',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
