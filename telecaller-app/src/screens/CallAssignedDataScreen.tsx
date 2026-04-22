import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  BackHandler,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  NativeModules,
  NativeEventEmitter,
  AppState,
  AppStateStatus,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList, AssignedData } from '../types';
import { telecallerApi } from '../api/telecaller';
import { requestCallPermissions } from '../utils/permissions';
import CallTimer from '../components/CallTimer';
import RecordingIndicator from '../components/RecordingIndicator';
import { formatPhoneNumber } from '../utils/formatters';
import { useAccessibilityRecording, promptEnableAccessibility } from '../hooks/useAccessibilityRecording';
import { backgroundUploadService } from '../services/backgroundUpload';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CallAssignedData'>;
type CallRouteProp = RouteProp<RootStackParamList, 'CallAssignedData'>;

// Native modules
const { CallRecording, CallLogModule, AccessibilityRecording } = NativeModules;

// Native module interface
interface CallRecordingModuleType {
  startRecording: (callId: string) => Promise<string>;
  stopRecording: () => Promise<{ path: string; duration: number }>;
  isRecording: () => Promise<boolean>;
}

const CallRecordingModule: CallRecordingModuleType = CallRecording || {
  startRecording: async (callId: string) => {
    console.log('[CallAssignedDataScreen] MOCK startRecording:', callId);
    return '/mock/recording/path.m4a';
  },
  stopRecording: async () => {
    return { path: '/mock/recording/path.m4a', duration: 0 };
  },
  isRecording: async () => false,
};

// Smart classification based on call duration
// AssignedData uses: CALLING, INTERESTED, NOT_INTERESTED, NO_ANSWER, CALLBACK_REQUESTED
// TelecallerCall uses: INTERESTED, NOT_INTERESTED, CALLBACK, NO_ANSWER, WRONG_NUMBER, BUSY, CONVERTED
const classifyCallOutcome = (duration: number, callAttempts: number): { assignedDataStatus: string; callOutcome: string } => {
  console.log('[CallAssignedDataScreen] Classifying with duration:', duration, 'attempts:', callAttempts);

  if (duration === 0 || duration < 0) {
    const status = callAttempts >= 3 ? 'NOT_INTERESTED' : 'NO_ANSWER';
    return { assignedDataStatus: status, callOutcome: status };
  } else if (duration <= 15) {
    const status = callAttempts >= 2 ? 'NOT_INTERESTED' : 'CALLBACK_REQUESTED';
    return { assignedDataStatus: status, callOutcome: status === 'CALLBACK_REQUESTED' ? 'CALLBACK' : status };
  } else if (duration <= 60) {
    return { assignedDataStatus: 'CALLBACK_REQUESTED', callOutcome: 'CALLBACK' };
  } else {
    return { assignedDataStatus: 'INTERESTED', callOutcome: 'INTERESTED' };
  }
};

const CallAssignedDataScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CallRouteProp>();
  const { data } = route.params;

  const [callId, setCallId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [recordingPath, setRecordingPath] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Starting call...');
  const [dialerOpened, setDialerOpened] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTime = useRef<number>(0);
  const hasEndedRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const returnCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Start timer
  const startTimer = useCallback(() => {
    callStartTime.current = Date.now();
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (returnCheckRef.current) {
      clearInterval(returnCheckRef.current);
      returnCheckRef.current = null;
    }
  }, []);

  // Get call duration from call log with retry logic
  const getCallDurationFromLog = useCallback(async (): Promise<number> => {
    console.log('[CallAssignedDataScreen] Getting call duration from log...');
    console.log('[CallAssignedDataScreen] Phone number:', data.phone);
    console.log('[CallAssignedDataScreen] CallLogModule available:', !!CallLogModule);

    const maxAttempts = 5;
    const delayMs = 1000; // 1 second between retries

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (CallLogModule && CallLogModule.getLastCall) {
          console.log(`[CallAssignedDataScreen] Attempt ${attempt}/${maxAttempts} - querying call log`);
          const callDetails = await CallLogModule.getLastCall(data.phone);
          console.log('[CallAssignedDataScreen] Call log result:', JSON.stringify(callDetails));

          if (callDetails && callDetails.duration !== undefined) {
            console.log('[CallAssignedDataScreen] Got duration from call log:', callDetails.duration);
            return callDetails.duration;
          }

          // If no result and we have more attempts, wait and retry
          if (attempt < maxAttempts) {
            console.log(`[CallAssignedDataScreen] No call log entry yet, waiting ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } else {
          console.log('[CallAssignedDataScreen] CallLogModule.getLastCall not available');
          break;
        }
      } catch (error: any) {
        console.warn(`[CallAssignedDataScreen] Attempt ${attempt} failed:`, error?.message || error);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // Fallback to timer duration (subtract estimated dialing time ~5 seconds)
    const elapsed = Math.floor((Date.now() - callStartTime.current) / 1000);
    const adjustedDuration = Math.max(0, elapsed - 5); // Subtract ~5s for dialing
    console.log('[CallAssignedDataScreen] Using timer duration:', elapsed, '-> adjusted:', adjustedDuration);
    return adjustedDuration;
  }, [data.phone]);

  // Auto-end call - returns quickly, recording search and upload happens in background
  const autoEndCall = useCallback(async (duration?: number, recPath?: string) => {
    if (hasEndedRef.current) {
      console.log('[CallAssignedDataScreen] Already ended, skipping');
      return;
    }
    hasEndedRef.current = true;

    console.log('[CallAssignedDataScreen] >>>>>> AUTO-END TRIGGERED <<<<<<');

    setIsEnding(true);
    stopTimer();

    // Get duration from call log (quick operation with retry)
    let finalDuration = duration;
    if (finalDuration === undefined) {
      setStatusMessage('Getting call duration...');
      finalDuration = await getCallDurationFromLog();
    }
    console.log('[CallAssignedDataScreen] Final duration:', finalDuration, 'seconds');

    // Use provided recording path or state
    const initialRecordingPath = recPath || recordingPath;
    console.log('[CallAssignedDataScreen] Initial recording path:', initialRecordingPath);

    // Store values for background processing
    const currentCallId = callId;
    const currentDataId = data.id;
    const phoneNumber = data.phone;
    const callAttempts = data.callAttempts || 1;

    // Start background recording search and upload (non-blocking)
    if (currentCallId && finalDuration > 5) {
      console.log('[CallAssignedDataScreen] Starting background recording search and upload...');
      setStatusMessage('Processing in background...');

      // Fire and forget - don't await
      (async () => {
        try {
          let uploadPath = initialRecordingPath;

          // Try to find system call recording in background
          if (CallRecording && CallRecording.findSystemCallRecording && phoneNumber) {
            console.log('[CallAssignedDataScreen] [BG] Searching for system recording...');

            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                const waitTime = attempt === 1 ? 2000 : 3000;
                await new Promise(resolve => setTimeout(resolve, waitTime));

                const systemRecording = await CallRecording.findSystemCallRecording(phoneNumber);
                if (systemRecording && systemRecording.path) {
                  console.log('[CallAssignedDataScreen] [BG] Found system recording:', systemRecording.path);
                  uploadPath = systemRecording.path;
                  break;
                }
              } catch (err) {
                console.log(`[CallAssignedDataScreen] [BG] Attempt ${attempt} failed:`, err);
              }
            }
          }

          // Upload recording in background
          if (uploadPath) {
            console.log('[CallAssignedDataScreen] [BG] Starting upload for:', uploadPath);

            if (backgroundUploadService.isAvailable()) {
              const started = await backgroundUploadService.uploadRecording(
                uploadPath,
                currentCallId,
                currentDataId,
                finalDuration,
                {
                  onSuccess: (cid, url) => console.log('[CallAssignedDataScreen] [BG] Upload success:', url),
                  onError: (cid, error) => console.warn('[CallAssignedDataScreen] [BG] Upload error:', error),
                  onProgress: (cid, progress) => console.log('[CallAssignedDataScreen] [BG] Progress:', progress + '%'),
                }
              );

              if (started) {
                console.log('[CallAssignedDataScreen] [BG] Background upload started');
                return;
              }
            }

            // Fallback: try direct upload
            try {
              await telecallerApi.uploadAssignedDataRecording(
                currentDataId,
                currentCallId,
                uploadPath,
                finalDuration,
                () => {}
              );
              console.log('[CallAssignedDataScreen] [BG] Direct upload completed');
            } catch (err) {
              console.warn('[CallAssignedDataScreen] [BG] Upload failed:', err);
            }
          }
        } catch (error) {
          console.error('[CallAssignedDataScreen] [BG] Background processing failed:', error);
        }
      })();
    }

    // Duration-based classification (quick, no waiting for upload)
    console.log('[CallAssignedDataScreen] Using duration-based classification');
    const { assignedDataStatus, callOutcome } = classifyCallOutcome(finalDuration, callAttempts);
    console.log('[CallAssignedDataScreen] Auto-classified:', { assignedDataStatus, callOutcome });

    setStatusMessage(`Setting status: ${assignedDataStatus.replace(/_/g, ' ')}`);

    try {
      // Update the assigned data status
      console.log('[CallAssignedDataScreen] Updating assigned data status to:', assignedDataStatus);
      await telecallerApi.updateAssignedDataStatus(data.id, assignedDataStatus as any);
      console.log('[CallAssignedDataScreen] Assigned data status updated');

      // Also update the call record with the correct outcome
      if (callId) {
        try {
          console.log('[CallAssignedDataScreen] Updating call record with outcome:', callOutcome);
          await telecallerApi.updateCall(callId, {
            outcome: callOutcome as any,
            duration: finalDuration,
            status: 'COMPLETED',
          });
          console.log('[CallAssignedDataScreen] Call record updated');
        } catch (err) {
          console.warn('[CallAssignedDataScreen] Failed to update call record:', err);
        }
      }

      setStatusMessage('Done!');
      setTimeout(() => navigation.goBack(), 500);
    } catch (error) {
      console.error('[CallAssignedDataScreen] Failed to update status:', error);
      setStatusMessage('Update failed');
      setTimeout(() => navigation.goBack(), 1000);
    }
  }, [data.id, data.phone, data.callAttempts, callId, recordingPath, navigation, stopTimer, getCallDurationFromLog]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('[CallAssignedDataScreen] App state:', appStateRef.current, '->', nextAppState);

      // User returned to the app after making a call
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        dialerOpened &&
        !hasEndedRef.current
      ) {
        console.log('[CallAssignedDataScreen] User returned from call!');

        // Wait for call log to update (Android needs time to write the entry)
        // Using 2.5 seconds initial delay, then retry logic in getCallDurationFromLog
        setTimeout(async () => {
          if (!hasEndedRef.current) {
            console.log('[CallAssignedDataScreen] Starting auto-end after delay');
            await autoEndCall();
          }
        }, 2500);
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [dialerOpened, autoEndCall]);

  // Listen for native recording auto-stop events
  useEffect(() => {
    if (!CallRecording) {
      console.log('[CallAssignedDataScreen] CallRecording module not available');
      return;
    }

    console.log('[CallAssignedDataScreen] Setting up recording event listener');
    const eventEmitter = new NativeEventEmitter(CallRecording);
    const subscription = eventEmitter.addListener('onRecordingAutoStopped', async (event) => {
      console.log('[CallAssignedDataScreen] Recording auto-stopped event:', JSON.stringify(event));
      setIsRecording(false);

      const recPath = event.path || null;
      if (recPath) {
        setRecordingPath(recPath);
      }

      const duration = event.duration || 0;
      // Pass both duration and recording path for AI analysis
      await autoEndCall(duration, recPath);
    });

    return () => subscription.remove();
  }, [autoEndCall]);

  // Listen for accessibility recording events (works on Android 10+)
  useEffect(() => {
    if (!AccessibilityRecording) {
      console.log('[CallAssignedDataScreen] AccessibilityRecording module not available');
      return;
    }

    console.log('[CallAssignedDataScreen] Setting up accessibility recording listener');
    const eventEmitter = new NativeEventEmitter(AccessibilityRecording);

    const stoppedSubscription = eventEmitter.addListener('onAccessibilityRecordingStopped', async (event) => {
      console.log('[CallAssignedDataScreen] Accessibility recording stopped:', JSON.stringify(event));
      setIsRecording(false);

      const recPath = event.path || null;
      if (recPath) {
        setRecordingPath(recPath);
      }

      const duration = event.duration || 0;
      // Pass both duration and recording path for AI analysis
      await autoEndCall(duration, recPath);
    });

    const startedSubscription = eventEmitter.addListener('onAccessibilityRecordingStarted', (event) => {
      console.log('[CallAssignedDataScreen] Accessibility recording started:', event.path);
      setIsRecording(true);
      if (event.path) {
        setRecordingPath(event.path);
      }
    });

    return () => {
      stoppedSubscription.remove();
      startedSubscription.remove();
    };
  }, [autoEndCall]);

  // Initialize call
  useEffect(() => {
    const initCall = async () => {
      console.log('============================================');
      console.log('[CallAssignedDataScreen] INIT CALL');
      console.log('[CallAssignedDataScreen] Data:', data.id, data.phone);
      console.log('============================================');

      try {
        // Request permissions
        setStatusMessage('Requesting permissions...');
        const hasPermissions = await requestCallPermissions();
        console.log('[CallAssignedDataScreen] Permissions:', hasPermissions);

        if (!hasPermissions) {
          setStatusMessage('Permissions denied');
          setTimeout(() => navigation.goBack(), 1500);
          return;
        }

        // Start call in backend
        setStatusMessage('Creating call record...');
        const result = await telecallerApi.startAssignedDataCall(data.id);
        console.log('[CallAssignedDataScreen] Call created:', result.call.id);
        setCallId(result.call.id);

        // Check for accessibility recording (works on Android 10+)
        let accessibilityEnabled = false;
        if (AccessibilityRecording) {
          try {
            accessibilityEnabled = await AccessibilityRecording.isAccessibilityEnabled();
            console.log('[CallAssignedDataScreen] Accessibility service enabled:', accessibilityEnabled);

            if (accessibilityEnabled) {
              // Start recording via accessibility service
              console.log('[CallAssignedDataScreen] Starting accessibility recording...');
              await AccessibilityRecording.startRecording(data.phone);
              setIsRecording(true);
            } else {
              // Prompt user to enable accessibility (one-time prompt)
              console.log('[CallAssignedDataScreen] Accessibility not enabled, will use duration-based classification');
            }
          } catch (err: any) {
            console.warn('[CallAssignedDataScreen] Accessibility check failed:', err?.message);
          }
        }

        // Fallback to regular recording service (may capture silence on Android 10+)
        if (!accessibilityEnabled) {
          try {
            console.log('[CallAssignedDataScreen] Starting fallback recording...');
            const path = await CallRecordingModule.startRecording(result.call.id);
            console.log('[CallAssignedDataScreen] Recording path:', path);
            setRecordingPath(path);
            setIsRecording(true);
          } catch (err: any) {
            console.warn('[CallAssignedDataScreen] Recording failed:', err?.message);
          }
        }

        // Start timer BEFORE opening dialer
        startTimer();
        setIsStarting(false);
        setStatusMessage('Opening dialer...');

        // Open phone dialer
        const phoneUrl = Platform.OS === 'android' ? `tel:${data.phone}` : `tel://${data.phone}`;
        console.log('[CallAssignedDataScreen] Opening:', phoneUrl);

        if (await Linking.canOpenURL(phoneUrl)) {
          await Linking.openURL(phoneUrl);
          setDialerOpened(true);
          console.log('[CallAssignedDataScreen] Dialer opened');
        }

        setStatusMessage('Call in progress');
      } catch (error: any) {
        console.error('[CallAssignedDataScreen] Init failed:', error?.message);
        setStatusMessage('Failed to start call');
        setTimeout(() => navigation.goBack(), 1500);
      }
    };

    initCall();

    return () => {
      stopTimer();
    };
  }, [data, navigation, startTimer, stopTimer]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!hasEndedRef.current) {
        autoEndCall();
      }
      return true;
    });
    return () => backHandler.remove();
  }, [autoEndCall]);

  // Manual end call button
  const handleManualEnd = async () => {
    if (hasEndedRef.current) return;
    console.log('[CallAssignedDataScreen] Manual end triggered');

    // Stop recording if active
    if (isRecording) {
      // Try accessibility recording first
      if (AccessibilityRecording) {
        try {
          await AccessibilityRecording.stopRecording();
          console.log('[CallAssignedDataScreen] Accessibility recording stopped');
          // The event listener will handle autoEndCall
          return;
        } catch (err) {
          console.warn('[CallAssignedDataScreen] Stop accessibility recording error:', err);
        }
      }

      // Fall back to regular recording
      try {
        const result = await CallRecordingModule.stopRecording();
        console.log('[CallAssignedDataScreen] Recording stopped:', JSON.stringify(result));
        setIsRecording(false);
        if (result.duration) {
          await autoEndCall(result.duration, result.path);
          return;
        }
      } catch (err) {
        console.warn('[CallAssignedDataScreen] Stop recording error:', err);
      }
    }

    await autoEndCall();
  };

  if (isStarting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>{statusMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Contact Info */}
      <View style={styles.contactInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(data.firstName || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{data.firstName} {data.lastName || ''}</Text>
        <Text style={styles.phone}>{formatPhoneNumber(data.phone)}</Text>
      </View>

      {/* Timer and Recording */}
      <View style={styles.timerContainer}>
        <CallTimer seconds={callDuration} size="large" />
        <RecordingIndicator isRecording={isRecording} style={styles.recordingIndicator} />
      </View>

      {/* Smart Classification Info */}
      <View style={styles.autoInfoBox}>
        <Icon name="clock-check-outline" size={24} color="#10B981" />
        <View style={styles.autoInfoText}>
          <Text style={styles.autoInfoTitle}>Smart Classification</Text>
          <Text style={styles.autoInfoDesc}>
            Call outcome is automatically classified based on duration and call history.
          </Text>
        </View>
      </View>

      {/* Duration Guide */}
      <View style={styles.durationGuide}>
        <Text style={styles.guideTitle}>How it works:</Text>
        <Text style={styles.guideText}>{'< 15s = No Answer/Callback | 15-60s = Callback | > 60s = Interested'}</Text>
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {isEnding ? statusMessage : 'Call in progress - duration tracking active'}
        </Text>
      </View>

      {/* End Call Button */}
      {!isEnding ? (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.endButton} onPress={handleManualEnd}>
            <Icon name="phone-hangup" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.endButtonText}>End Call</Text>
        </View>
      ) : (
        <View style={styles.buttonContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.processingText}>{statusMessage}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 50,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  contactInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
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
  name: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  phone: {
    fontSize: 16,
    color: '#6B7280',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  recordingIndicator: {
    marginTop: 12,
  },
  autoInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  autoInfoText: {
    flex: 1,
  },
  autoInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 2,
  },
  autoInfoDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  durationGuide: {
    marginTop: 16,
    marginHorizontal: 24,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  guideTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  guideText: {
    fontSize: 11,
    color: '#6B7280',
  },
  statusContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#4B5563',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
  },
  endButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  endButtonText: {
    marginTop: 10,
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});

export default CallAssignedDataScreen;
