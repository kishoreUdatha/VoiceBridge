import React, { useState, useCallback, useEffect } from 'react';
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
import { telecallerApi, CustomCallOutcome } from '../api/telecaller';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Outcome'>;
type OutcomeRouteProp = RouteProp<RootStackParamList, 'Outcome'>;

// Fallback outcomes in case API fails
const FALLBACK_OUTCOMES: CustomCallOutcome[] = [
  { id: '1', slug: 'interested', name: 'Interested', icon: 'thumb-up', color: '#10B981', notePrompt: 'What are they interested in?', requiresFollowUp: true, requiresSubOption: false, subOptions: [] },
  { id: '2', slug: 'not_interested', name: 'Not Interested', icon: 'thumb-down', color: '#EF4444', notePrompt: 'Why are they not interested?', requiresFollowUp: false, requiresSubOption: false, subOptions: [] },
  { id: '3', slug: 'callback', name: 'Callback', icon: 'phone-return', color: '#F59E0B', notePrompt: 'When is convenient for them?', requiresFollowUp: true, requiresSubOption: false, subOptions: [] },
  { id: '4', slug: 'converted', name: 'Converted', icon: 'check-circle', color: '#22C55E', notePrompt: 'What convinced them?', requiresFollowUp: false, requiresSubOption: false, subOptions: [] },
  { id: '5', slug: 'no_answer', name: 'No Answer', icon: 'phone-missed', color: '#6B7280', notePrompt: 'How many attempts?', requiresFollowUp: true, requiresSubOption: false, subOptions: [] },
  { id: '6', slug: 'busy', name: 'Busy', icon: 'phone-lock', color: '#F97316', notePrompt: 'Did they say when to call back?', requiresFollowUp: true, requiresSubOption: false, subOptions: [] },
  { id: '7', slug: 'wrong_number', name: 'Wrong Number', icon: 'phone-cancel', color: '#DC2626', notePrompt: 'Any correct number provided?', requiresFollowUp: false, requiresSubOption: false, subOptions: [] },
  { id: '8', slug: 'voicemail', name: 'Voicemail', icon: 'voicemail', color: '#8B5CF6', notePrompt: 'What message did you leave?', requiresFollowUp: true, requiresSubOption: false, subOptions: [] },
];

const OutcomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OutcomeRouteProp>();
  const { call, recordingPath } = route.params;

  const { submitOutcome, callDuration } = useCallRecording();

  // Outcomes state
  const [outcomes, setOutcomes] = useState<CustomCallOutcome[]>(FALLBACK_OUTCOMES);
  const [isLoadingOutcomes, setIsLoadingOutcomes] = useState(true);

  // Selection state
  const [selectedOutcome, setSelectedOutcome] = useState<CustomCallOutcome | null>(null);
  const [selectedSubOption, setSelectedSubOption] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Callback scheduling state
  const [callbackDate, setCallbackDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Fetch outcomes from API on mount
  useEffect(() => {
    const fetchOutcomes = async () => {
      try {
        setIsLoadingOutcomes(true);
        const fetchedOutcomes = await telecallerApi.getCallOutcomes();
        if (fetchedOutcomes && fetchedOutcomes.length > 0) {
          setOutcomes(fetchedOutcomes);
        }
      } catch (error) {
        console.log('[OutcomeScreen] Failed to fetch outcomes, using fallback:', error);
        // Keep using fallback outcomes
      } finally {
        setIsLoadingOutcomes(false);
      }
    };

    fetchOutcomes();
  }, []);

  const handleOutcomeSelect = useCallback((outcome: CustomCallOutcome) => {
    setSelectedOutcome(outcome);
    setSelectedSubOption(null); // Reset sub-option when changing outcome

    // Set default callback time if outcome requires follow-up
    if (outcome.requiresFollowUp || outcome.slug === 'callback') {
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

  // Map slug to CallOutcome type for API compatibility
  const getCallOutcomeFromSlug = (slug: string): CallOutcome => {
    const mapping: Record<string, CallOutcome> = {
      'interested': 'INTERESTED',
      'not_interested': 'NOT_INTERESTED',
      'callback': 'CALLBACK',
      'converted': 'CONVERTED',
      'no_answer': 'NO_ANSWER',
      'busy': 'BUSY',
      'wrong_number': 'WRONG_NUMBER',
      'voicemail': 'VOICEMAIL',
    };
    return mapping[slug] || slug.toUpperCase() as CallOutcome;
  };

  const handleSubmit = useCallback(async () => {
    if (!selectedOutcome) {
      Alert.alert('Select Outcome', 'Please select a call outcome before saving.');
      return;
    }

    // Validate sub-option if required
    if (selectedOutcome.requiresSubOption && selectedOutcome.subOptions.length > 0 && !selectedSubOption) {
      Alert.alert('Select Option', `Please select a ${selectedOutcome.name} option.`);
      return;
    }

    // Validate callback date is in the future for outcomes requiring follow-up
    const showFollowUpScheduler = selectedOutcome.requiresFollowUp || selectedOutcome.slug === 'callback';
    if (showFollowUpScheduler) {
      const now = new Date();
      if (callbackDate <= now) {
        Alert.alert('Invalid Time', 'Please select a future date and time for the follow-up.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Build notes with sub-option and callback info
      let finalNotes = notes.trim();

      // Add sub-option to notes
      if (selectedSubOption) {
        const subOptionInfo = `Selected: ${selectedSubOption}`;
        finalNotes = finalNotes ? `${subOptionInfo}\n\n${finalNotes}` : subOptionInfo;
      }

      // Add callback date to notes if follow-up is scheduled
      if (showFollowUpScheduler) {
        const callbackInfo = `Follow-up scheduled: ${formatCallbackDate(callbackDate)} at ${formatCallbackTime(callbackDate)}`;
        finalNotes = finalNotes ? `${callbackInfo}\n\n${finalNotes}` : callbackInfo;
      }

      const outcomeForApi = getCallOutcomeFromSlug(selectedOutcome.slug);

      const success = await submitOutcome(
        outcomeForApi,
        finalNotes || undefined,
        showFollowUpScheduler ? callbackDate.toISOString() : undefined,
        alternatePhone.trim() || undefined
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
  }, [selectedOutcome, selectedSubOption, notes, callbackDate, submitOutcome, navigation, alternatePhone]);

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

  // Determine if we should show the follow-up scheduler
  const showFollowUpScheduler = selectedOutcome && (selectedOutcome.requiresFollowUp || selectedOutcome.slug === 'callback');

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

        {/* Alternate Phone - Customer provided different number */}
        <View style={styles.alternatePhoneSection}>
          <Text style={styles.sectionTitle}>
            <Icon name="phone-plus" size={18} color="#10B981" /> Alternate Phone (Optional)
          </Text>
          <View style={styles.alternatePhoneContainer}>
            <Icon name="phone-outline" size={20} color="#6B7280" style={styles.phoneIcon} />
            <TextInput
              style={styles.alternatePhoneInput}
              placeholder="Customer's alternate number (if provided)"
              placeholderTextColor="#9CA3AF"
              value={alternatePhone}
              onChangeText={setAlternatePhone}
              keyboardType="phone-pad"
              maxLength={15}
            />
            {alternatePhone.length > 0 && (
              <TouchableOpacity onPress={() => setAlternatePhone('')}>
                <Icon name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.alternatePhoneHint}>
            If customer said "Call me on different number", enter it here
          </Text>
        </View>

        {/* Outcome Selection */}
        <Text style={styles.sectionTitle}>Select Outcome</Text>
        {isLoadingOutcomes ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading outcomes...</Text>
          </View>
        ) : (
          <View style={styles.outcomeGrid}>
            {outcomes.map((outcome) => (
              <OutcomeButton
                key={outcome.id}
                outcome={outcome.slug.toUpperCase() as CallOutcome}
                label={outcome.name}
                icon={outcome.icon}
                color={outcome.color}
                selected={selectedOutcome?.id === outcome.id}
                onPress={() => handleOutcomeSelect(outcome)}
              />
            ))}
          </View>
        )}

        {/* Sub-options selection (e.g., NEET, EAMCET, JEE) */}
        {selectedOutcome?.requiresSubOption && selectedOutcome.subOptions.length > 0 && (
          <View style={styles.subOptionsSection}>
            <Text style={styles.sectionTitle}>
              <Icon name="format-list-bulleted" size={18} color="#8B5CF6" /> Select {selectedOutcome.name} Type
            </Text>
            <View style={styles.subOptionsGrid}>
              {selectedOutcome.subOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.subOptionButton,
                    selectedSubOption === option && styles.subOptionButtonSelected,
                  ]}
                  onPress={() => setSelectedSubOption(option)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.subOptionText,
                      selectedSubOption === option && styles.subOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Follow-up Scheduler - Show when outcome requires follow-up */}
        {showFollowUpScheduler && (
          <View style={styles.callbackSection}>
            <Text style={styles.sectionTitle}>
              <Icon name="calendar-clock" size={18} color="#3B82F6" /> Schedule Follow-up
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

        {/* Contextual Reason/Notes based on outcome */}
        <Text style={styles.sectionTitle}>
          <Icon name="note-text" size={18} color="#6366F1" />{' '}
          {selectedOutcome ? 'Reason / Details' : 'Notes (Select outcome first)'}
        </Text>
        <View style={[styles.notesContainer, selectedOutcome && styles.notesContainerActive]}>
          <TextInput
            style={styles.notesInput}
            placeholder={
              selectedOutcome?.notePrompt ||
              'Select an outcome above to see what details to capture...'
            }
            placeholderTextColor={selectedOutcome ? '#6B7280' : '#9CA3AF'}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!!selectedOutcome}
          />
        </View>
        {selectedOutcome && (
          <Text style={styles.notesHint}>
            <Icon name="information-outline" size={14} color="#6B7280" /> Recording the reason helps in follow-ups
          </Text>
        )}

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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
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
  // Sub-options styles
  subOptionsSection: {
    marginBottom: 24,
  },
  subOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  subOptionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    margin: 4,
  },
  subOptionButtonSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  subOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  subOptionTextSelected: {
    color: '#FFFFFF',
  },
  notesContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  notesContainerActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#6366F1',
    borderWidth: 1.5,
  },
  notesInput: {
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 120,
  },
  notesHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 24,
    marginLeft: 4,
  },
  // Alternate Phone styles
  alternatePhoneSection: {
    marginBottom: 24,
  },
  alternatePhoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  phoneIcon: {
    marginRight: 10,
  },
  alternatePhoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 14,
  },
  alternatePhoneHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    marginLeft: 4,
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
