import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  BackHandler,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallRecording } from '../hooks/useCallRecording';
import CallTimer from '../components/CallTimer';
import CallButton from '../components/CallButton';
import RecordingIndicator from '../components/RecordingIndicator';
import { formatPhoneNumber } from '../utils/formatters';
import { RootStackParamList, Lead } from '../types';
import { messagingApi } from '../api/messaging';
import { appointmentsApi } from '../api/appointments';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Call'>;
type CallRouteProp = RouteProp<RootStackParamList, 'Call'>;

type MessageType = 'SMS' | 'WHATSAPP' | 'EMAIL';
type LocationType = 'PHONE' | 'VIDEO' | 'IN_PERSON';

interface QuickAction {
  type: string;
  icon: string;
  color: string;
  label: string;
}

const QUICK_MESSAGES: QuickAction[] = [
  { type: 'SMS', icon: 'message-text', color: '#3B82F6', label: 'SMS' },
  { type: 'WHATSAPP', icon: 'whatsapp', color: '#25D366', label: 'WhatsApp' },
  { type: 'EMAIL', icon: 'email', color: '#EA4335', label: 'Email' },
];

const LOCATION_TYPES: { type: LocationType; icon: string; label: string }[] = [
  { type: 'PHONE', icon: 'phone', label: 'Phone Call' },
  { type: 'VIDEO', icon: 'video', label: 'Video Call' },
  { type: 'IN_PERSON', icon: 'account-group', label: 'In Person' },
];

// Default message templates
const DEFAULT_TEMPLATES = {
  SMS: "Hi {name}, thank you for speaking with us! As discussed, I'm sending you the details. Feel free to reach out if you have any questions.",
  WHATSAPP: "Hi {name}! 👋\n\nThank you for your time on the call. Here are the details we discussed:\n\n📋 Our solution can help you achieve your goals.\n\nLet me know if you have any questions!",
  EMAIL: "Dear {name},\n\nThank you for taking the time to speak with me today.\n\nAs discussed during our call, I wanted to share some additional information about our services.\n\nPlease feel free to reach out if you have any questions.\n\nBest regards",
};

const CallScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CallRouteProp>();
  const { lead } = route.params;

  const {
    currentCall,
    isRecording,
    callDuration,
    recordingPath,
    endCall,
    initiateCall,
  } = useCallRecording();

  const [callInitiated, setCallInitiated] = useState(false);

  // Initiate the call when screen mounts
  useEffect(() => {
    const startCall = async () => {
      console.log('============================================');
      console.log('[CallScreen] useEffect triggered');
      console.log('[CallScreen] callInitiated:', callInitiated);
      console.log('[CallScreen] lead:', lead?.id, lead?.phone);
      console.log('============================================');

      if (!callInitiated && lead) {
        setCallInitiated(true);
        console.log('[CallScreen] >>>>>> CALLING initiateCall NOW <<<<<<');
        const success = await initiateCall(lead);
        console.log('[CallScreen] initiateCall returned:', success);
        if (!success) {
          console.log('[CallScreen] Call initiation failed, going back');
          // Go back if call initiation failed
          navigation.goBack();
        } else {
          console.log('[CallScreen] Call initiation succeeded!');
        }
      } else {
        console.log('[CallScreen] Skipping - already initiated or no lead');
      }
    };
    startCall();
  }, [lead, callInitiated, initiateCall, navigation]);

  // Messaging state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedMessageType, setSelectedMessageType] = useState<MessageType>('SMS');
  const [messageText, setMessageText] = useState('');
  const [emailSubject, setEmailSubject] = useState('Follow-up from our call');
  const [isSending, setIsSending] = useState(false);
  const [sentMessages, setSentMessages] = useState<MessageType[]>([]);
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);

  // Appointment state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow
  const [appointmentTime, setAppointmentTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [appointmentDuration, setAppointmentDuration] = useState(30);
  const [appointmentLocationType, setAppointmentLocationType] = useState<LocationType>('PHONE');
  const [appointmentTitle, setAppointmentTitle] = useState('Follow-up Call');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [sendCalendarInvite, setSendCalendarInvite] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [appointmentBooked, setAppointmentBooked] = useState(false);

  // Auto-send welcome message when call starts
  useEffect(() => {
    if (autoSendEnabled && callDuration === 5) {
      handleAutoSend();
    }
  }, [callDuration, autoSendEnabled]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleEndCall();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  const handleAutoSend = async () => {
    try {
      await messagingApi.quickSend('SMS', lead.id, lead.phone, lead.email);
      setSentMessages(prev => [...prev, 'SMS']);
    } catch (error) {
      console.log('Auto-send failed:', error);
    }
  };

  const handleOpenMessageModal = (type: MessageType) => {
    setSelectedMessageType(type);
    const template = DEFAULT_TEMPLATES[type].replace('{name}', lead.name.split(' ')[0]);
    setMessageText(template);
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setIsSending(true);

    try {
      let response;

      switch (selectedMessageType) {
        case 'SMS':
          response = await messagingApi.sendSMS({
            leadId: lead.id,
            phone: lead.phone,
            message: messageText,
          });
          break;

        case 'WHATSAPP':
          response = await messagingApi.sendWhatsApp({
            leadId: lead.id,
            phone: lead.phone,
            message: messageText,
          });
          break;

        case 'EMAIL':
          if (!lead.email) {
            Alert.alert('Error', 'No email address available for this lead');
            setIsSending(false);
            return;
          }
          response = await messagingApi.sendEmail({
            leadId: lead.id,
            phone: lead.phone,
            email: lead.email,
            subject: emailSubject,
            message: messageText,
          });
          break;
      }

      if (response?.success || response?.status === 'sent' || response?.status === 'queued') {
        setSentMessages(prev => [...prev, selectedMessageType]);
        setShowMessageModal(false);
        Alert.alert('Success', `${selectedMessageType} sent successfully!`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to send ${selectedMessageType}: ${(error as Error).message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickSend = async (type: MessageType) => {
    if (sentMessages.includes(type)) {
      handleOpenMessageModal(type);
      return;
    }

    Alert.alert(
      `Send ${type}`,
      `Send a quick ${type} to ${lead.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Customize', onPress: () => handleOpenMessageModal(type) },
        {
          text: 'Send Now',
          onPress: async () => {
            setIsSending(true);
            try {
              await messagingApi.quickSend(type, lead.id, lead.phone, lead.email);
              setSentMessages(prev => [...prev, type]);
              Alert.alert('Success', `${type} sent!`);
            } catch (error) {
              Alert.alert('Error', `Failed to send: ${(error as Error).message}`);
            } finally {
              setIsSending(false);
            }
          },
        },
      ]
    );
  };

  // Appointment booking
  const handleBookAppointment = async () => {
    setIsBooking(true);

    try {
      // Combine date and time
      const scheduledAt = new Date(appointmentDate);
      scheduledAt.setHours(appointmentTime.getHours());
      scheduledAt.setMinutes(appointmentTime.getMinutes());
      scheduledAt.setSeconds(0);

      const appointment = await appointmentsApi.bookAppointment({
        leadId: lead.id,
        title: appointmentTitle,
        description: appointmentNotes,
        scheduledAt: scheduledAt.toISOString(),
        duration: appointmentDuration,
        locationType: appointmentLocationType,
        contactName: lead.name,
        contactPhone: lead.phone,
        contactEmail: lead.email,
        sendCalendarInvite,
        sendReminders: true,
      });

      setAppointmentBooked(true);
      setShowAppointmentModal(false);

      Alert.alert(
        'Appointment Booked! 📅',
        `${appointmentTitle}\n${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\n${sendCalendarInvite ? '✉️ Calendar invite sent to customer' : ''}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to book appointment: ${(error as Error).message}`);
    } finally {
      setIsBooking(false);
    }
  };

  const handleQuickBook = () => {
    Alert.alert(
      'Quick Book Appointment',
      'Book a 30-minute phone call for tomorrow?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Customize', onPress: () => setShowAppointmentModal(true) },
        {
          text: 'Book Now',
          onPress: async () => {
            setIsBooking(true);
            try {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(10, 0, 0, 0);

              await appointmentsApi.quickBook(
                lead.id,
                lead.name,
                lead.phone,
                lead.email,
                tomorrow.toISOString()
              );

              setAppointmentBooked(true);
              Alert.alert('Success', 'Appointment booked for tomorrow at 10:00 AM!\n\n✉️ Calendar invite sent.');
            } catch (error) {
              Alert.alert('Error', `Failed to book: ${(error as Error).message}`);
            } finally {
              setIsBooking(false);
            }
          },
        },
      ]
    );
  };

  const handleEndCall = async () => {
    Alert.alert(
      'End Call',
      'Are you ready to end the call? AI will analyze the recording and determine the outcome.',
      [
        { text: 'Continue Call', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            await endCall();
            if (currentCall) {
              // Navigate to AI-powered analysis screen instead of manual outcome
              navigation.replace('CallAnalysis', {
                callId: currentCall.id,
                duration: callDuration,
                recordingPath: recordingPath || undefined,
              });
            } else {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setAppointmentDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setAppointmentTime(selectedTime);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Call Info */}
      <View style={styles.callInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {lead.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{lead.name}</Text>
        <Text style={styles.phone}>{formatPhoneNumber(lead.phone)}</Text>
        {lead.company && <Text style={styles.company}>{lead.company}</Text>}
      </View>

      {/* Timer and Recording */}
      <View style={styles.timerContainer}>
        <CallTimer seconds={callDuration} size="large" />
        <RecordingIndicator isRecording={isRecording} style={styles.recordingIndicator} />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        {/* Messaging Row */}
        <Text style={styles.quickActionsTitle}>Quick Send</Text>
        <View style={styles.quickActionsRow}>
          {QUICK_MESSAGES.map((msg) => {
            const isSent = sentMessages.includes(msg.type as MessageType);
            return (
              <TouchableOpacity
                key={msg.type}
                style={[
                  styles.quickActionButton,
                  { borderColor: msg.color },
                  isSent && { backgroundColor: msg.color + '20' },
                ]}
                onPress={() => handleQuickSend(msg.type as MessageType)}
                disabled={isSending}
              >
                <Icon
                  name={isSent ? 'check-circle' : msg.icon}
                  size={22}
                  color={msg.color}
                />
                <Text style={[styles.quickActionLabel, { color: msg.color }]}>
                  {msg.label}
                </Text>
                {isSent && <Text style={styles.sentBadge}>Sent</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Appointment Button */}
        <TouchableOpacity
          style={[
            styles.appointmentButton,
            appointmentBooked && styles.appointmentButtonBooked,
          ]}
          onPress={handleQuickBook}
          disabled={isBooking}
        >
          <Icon
            name={appointmentBooked ? 'calendar-check' : 'calendar-plus'}
            size={22}
            color={appointmentBooked ? '#10B981' : '#8B5CF6'}
          />
          <Text style={[
            styles.appointmentButtonText,
            appointmentBooked && { color: '#10B981' },
          ]}>
            {appointmentBooked ? 'Appointment Booked' : 'Book Appointment'}
          </Text>
          {!appointmentBooked && (
            <Icon name="chevron-right" size={20} color="#8B5CF6" />
          )}
        </TouchableOpacity>

        {/* Auto-send toggle */}
        <TouchableOpacity
          style={styles.autoSendToggle}
          onPress={() => setAutoSendEnabled(!autoSendEnabled)}
        >
          <Icon
            name={autoSendEnabled ? 'toggle-switch' : 'toggle-switch-off'}
            size={28}
            color={autoSendEnabled ? '#10B981' : '#9CA3AF'}
          />
          <Text style={styles.autoSendText}>Auto-send SMS on call start</Text>
        </TouchableOpacity>
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {isRecording ? 'Recording in progress' : 'Call in progress'}
        </Text>
      </View>

      {/* End Call Button */}
      <View style={styles.buttonContainer}>
        <CallButton variant="end" size="large" onPress={handleEndCall} />
        <Text style={styles.endCallText}>End Call</Text>
      </View>

      {/* Message Modal */}
      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send {selectedMessageType}</Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>To: {lead.name}</Text>
              <Text style={styles.modalSubLabel}>
                {selectedMessageType === 'EMAIL' ? lead.email || 'No email' : lead.phone}
              </Text>

              {selectedMessageType === 'EMAIL' && (
                <>
                  <Text style={styles.inputLabel}>Subject</Text>
                  <TextInput
                    style={styles.subjectInput}
                    value={emailSubject}
                    onChangeText={setEmailSubject}
                    placeholder="Email subject"
                    placeholderTextColor="#9CA3AF"
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={styles.messageInput}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Type your message..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowMessageModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: QUICK_MESSAGES.find(m => m.type === selectedMessageType)?.color },
                ]}
                onPress={handleSendMessage}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.sendButtonText}>Send</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Appointment Modal */}
      <Modal
        visible={showAppointmentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 Book Appointment</Text>
              <TouchableOpacity onPress={() => setShowAppointmentModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>With: {lead.name}</Text>
              <Text style={styles.modalSubLabel}>{lead.phone}</Text>

              {/* Title */}
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.subjectInput}
                value={appointmentTitle}
                onChangeText={setAppointmentTitle}
                placeholder="Appointment title"
                placeholderTextColor="#9CA3AF"
              />

              {/* Date & Time */}
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeCol}>
                  <Text style={styles.inputLabel}>Date</Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Icon name="calendar" size={20} color="#6B7280" />
                    <Text style={styles.dateTimeText}>
                      {appointmentDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateTimeCol}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Icon name="clock-outline" size={20} color="#6B7280" />
                    <Text style={styles.dateTimeText}>
                      {appointmentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Duration */}
              <Text style={styles.inputLabel}>Duration</Text>
              <View style={styles.durationRow}>
                {[15, 30, 45, 60].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.durationButton,
                      appointmentDuration === mins && styles.durationButtonActive,
                    ]}
                    onPress={() => setAppointmentDuration(mins)}
                  >
                    <Text style={[
                      styles.durationText,
                      appointmentDuration === mins && styles.durationTextActive,
                    ]}>
                      {mins} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Location Type */}
              <Text style={styles.inputLabel}>Meeting Type</Text>
              <View style={styles.locationRow}>
                {LOCATION_TYPES.map((loc) => (
                  <TouchableOpacity
                    key={loc.type}
                    style={[
                      styles.locationButton,
                      appointmentLocationType === loc.type && styles.locationButtonActive,
                    ]}
                    onPress={() => setAppointmentLocationType(loc.type)}
                  >
                    <Icon
                      name={loc.icon}
                      size={20}
                      color={appointmentLocationType === loc.type ? '#FFFFFF' : '#6B7280'}
                    />
                    <Text style={[
                      styles.locationText,
                      appointmentLocationType === loc.type && styles.locationTextActive,
                    ]}>
                      {loc.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={appointmentNotes}
                onChangeText={setAppointmentNotes}
                placeholder="Add notes..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Calendar Invite Toggle */}
              <TouchableOpacity
                style={styles.calendarInviteToggle}
                onPress={() => setSendCalendarInvite(!sendCalendarInvite)}
              >
                <Icon
                  name={sendCalendarInvite ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={24}
                  color={sendCalendarInvite ? '#8B5CF6' : '#9CA3AF'}
                />
                <View style={styles.calendarInviteText}>
                  <Text style={styles.calendarInviteTitle}>Send Calendar Invite</Text>
                  <Text style={styles.calendarInviteSubtitle}>
                    Customer will receive email with calendar event
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAppointmentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: '#8B5CF6' }]}
                onPress={handleBookAppointment}
                disabled={isBooking}
              >
                {isBooking ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="calendar-check" size={18} color="#FFFFFF" />
                    <Text style={styles.sendButtonText}>Book</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={appointmentDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={appointmentTime}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}

      {/* Loading Overlay */}
      {(isSending || isBooking) && !showMessageModal && !showAppointmentModal && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>
            {isBooking ? 'Booking...' : 'Sending...'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 40,
  },
  callInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  phone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  company: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  recordingIndicator: {
    marginTop: 8,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  quickActionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 10,
    textAlign: 'center',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  quickActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 70,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  sentBadge: {
    fontSize: 8,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  appointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  appointmentButtonBooked: {
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  appointmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  autoSendToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  autoSendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 13,
    color: '#4B5563',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  endCallText: {
    marginTop: 8,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSubLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
  },
  subjectInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 16,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 120,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 80,
    marginBottom: 16,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateTimeCol: {
    flex: 1,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 15,
    color: '#1F2937',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  durationButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  durationText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  durationTextActive: {
    color: '#FFFFFF',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  locationButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    gap: 4,
  },
  locationButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  locationText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  locationTextActive: {
    color: '#FFFFFF',
  },
  calendarInviteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    gap: 12,
  },
  calendarInviteText: {
    flex: 1,
  },
  calendarInviteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  calendarInviteSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4B5563',
  },
});

export default CallScreen;
