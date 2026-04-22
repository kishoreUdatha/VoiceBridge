import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallRecording } from '../hooks/useCallRecording';
import OutcomeButton from '../components/OutcomeButton';
import { formatDuration } from '../utils/formatters';
import { RootStackParamList, CallOutcome } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Outcome'>;
type OutcomeRouteProp = RouteProp<RootStackParamList, 'Outcome'>;

interface OutcomeOption {
  outcome: CallOutcome;
  label: string;
  icon: string;
}

const OUTCOME_OPTIONS: OutcomeOption[] = [
  { outcome: 'INTERESTED', label: 'Interested', icon: 'thumb-up' },
  { outcome: 'NOT_INTERESTED', label: 'Not Interested', icon: 'thumb-down' },
  { outcome: 'CALLBACK', label: 'Callback', icon: 'phone-return' },
  { outcome: 'CONVERTED', label: 'Converted', icon: 'check-circle' },
  { outcome: 'NO_ANSWER', label: 'No Answer', icon: 'phone-missed' },
  { outcome: 'BUSY', label: 'Busy', icon: 'phone-lock' },
  { outcome: 'WRONG_NUMBER', label: 'Wrong Number', icon: 'phone-cancel' },
  { outcome: 'VOICEMAIL', label: 'Voicemail', icon: 'voicemail' },
];

const OutcomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OutcomeRouteProp>();
  const { call, recordingPath } = route.params;

  const { submitOutcome, callDuration } = useCallRecording();

  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Callback scheduling state
  const [callbackDate, setCallbackDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleOutcomeSelect = useCallback((outcome: CallOutcome) => {
    setSelectedOutcome(outcome);
    // Set default callback time to next business hour if selecting callback
    if (outcome === 'CALLBACK') {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      // If after 6 PM, set to next day 10 AM
      if (nextHour.getHours() >= 18) {
        nextHour.setDate(nextHour.getDate() + 1);
        nextHour.setHours(10, 0, 0, 0);
      }
      // If before 9 AM, set to 10 AM
      if (nextHour.getHours() < 9) {
        nextHour.setHours(10, 0, 0, 0);
      }
      setCallbackDate(nextHour);
    }
  }, []);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(callbackDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setCallbackDate(newDate);
    }
  }, [callbackDate]);

  const handleTimeChange = useCallback((event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(callbackDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setCallbackDate(newDate);
    }
  }, [callbackDate]);

  const formatCallbackDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';

    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatCallbackTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSubmit = useCallback(async () => {
    if (!selectedOutcome) {
      Alert.alert('Select Outcome', 'Please select a call outcome before saving.');
      return;
    }

    // Validate callback date is in the future
    if (selectedOutcome === 'CALLBACK') {
      const now = new Date();
      if (callbackDate <= now) {
        Alert.alert('Invalid Time', 'Please select a future date and time for the callback.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Include callback date in notes if CALLBACK selected
      let finalNotes = notes.trim();
      if (selectedOutcome === 'CALLBACK') {
        const callbackInfo = `Callback scheduled: ${formatCallbackDate(callbackDate)} at ${formatCallbackTime(callbackDate)}`;
        finalNotes = finalNotes ? `${callbackInfo}\n\n${finalNotes}` : callbackInfo;
      }

      const success = await submitOutcome(
        selectedOutcome,
        finalNotes || undefined,
        selectedOutcome === 'CALLBACK' ? callbackDate.toISOString() : undefined
      );

      if (success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedOutcome, notes, callbackDate, submitOutcome, navigation]);

  const handleSkip = useCallback(() => {
    Alert.alert(
      'Skip Outcome',
      'Are you sure you want to skip without recording the outcome? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          },
        },
      ]
    );
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call Outcome</Text>
        <View style={styles.skipButton} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Call Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Icon name="timer-outline" size={20} color="#6B7280" />
            <Text style={styles.summaryLabel}>Call Duration</Text>
            <Text style={styles.summaryValue}>{formatDuration(callDuration)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Icon name="microphone" size={20} color="#6B7280" />
            <Text style={styles.summaryLabel}>Recording</Text>
            <Text style={[styles.summaryValue, { color: recordingPath ? '#10B981' : '#9CA3AF' }]}>
              {recordingPath ? 'Captured' : 'Not Available'}
            </Text>
          </View>
        </View>

        {/* Outcome Selection */}
        <Text style={styles.sectionTitle}>Select Outcome</Text>
        <View style={styles.outcomeGrid}>
          {OUTCOME_OPTIONS.map((option) => (
            <OutcomeButton
              key={option.outcome}
              outcome={option.outcome}
              label={option.label}
              icon={option.icon}
              selected={selectedOutcome === option.outcome}
              onPress={handleOutcomeSelect}
            />
          ))}
        </View>

        {/* Callback Scheduler - Only show when CALLBACK is selected */}
        {selectedOutcome === 'CALLBACK' && (
          <View style={styles.callbackSection}>
            <Text style={styles.sectionTitle}>
              <Icon name="calendar-clock" size={18} color="#3B82F6" /> Schedule Callback
            </Text>
            <View style={styles.callbackCard}>
              {/* Date Picker */}
              <TouchableOpacity
                style={styles.callbackRow}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.callbackIconContainer}>
                  <Icon name="calendar" size={22} color="#3B82F6" />
                </View>
                <View style={styles.callbackInfo}>
                  <Text style={styles.callbackLabel}>Date</Text>
                  <Text style={styles.callbackValue}>{formatCallbackDate(callbackDate)}</Text>
                </View>
                <Icon name="chevron-right" size={24} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.callbackDivider} />

              {/* Time Picker */}
              <TouchableOpacity
                style={styles.callbackRow}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.callbackIconContainer}>
                  <Icon name="clock-outline" size={22} color="#3B82F6" />
                </View>
                <View style={styles.callbackInfo}>
                  <Text style={styles.callbackLabel}>Time</Text>
                  <Text style={styles.callbackValue}>{formatCallbackTime(callbackDate)}</Text>
                </View>
                <Icon name="chevron-right" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Date/Time Pickers */}
            {showDatePicker && (
              <DateTimePicker
                value={callbackDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={callbackDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                is24Hour={false}
              />
            )}
          </View>
        )}

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes (Optional)</Text>
        <View style={styles.notesContainer}>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes about the call..."
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            !selectedOutcome && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedOutcome || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="check" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Save & Continue</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  skipButton: {
    width: 60,
    alignItems: 'flex-start',
  },
  skipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  outcomeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 24,
  },
  notesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  notesInput: {
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 120,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Callback scheduling styles
  callbackSection: {
    marginBottom: 24,
  },
  callbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  callbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  callbackIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callbackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  callbackLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  callbackValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  callbackDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 68,
  },
});

export default OutcomeScreen;
