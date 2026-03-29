import { useEffect, useCallback, useRef } from 'react';
import { NativeModules, NativeEventEmitter, Linking, Platform, Alert, DeviceEventEmitter } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import {
  startCall,
  updateCall,
  uploadRecording,
  setIsRecording,
  setCallDuration,
  incrementCallDuration,
  resetCallState,
  addPendingUpload,
  setRecordingPath,
} from '../store/slices/callsSlice';
import { requestCallPermissions } from '../utils/permissions';
import { Lead, CallOutcome, StartCallPayload, UpdateCallPayload } from '../types';

// Offline services
import { offlineQueue, recordingBackupService } from '../services';

// Native module interface (will be implemented in Java)
interface CallRecordingModuleType {
  startRecording: (callId: string) => Promise<string>;
  stopRecording: () => Promise<{ path: string; duration: number }>;
  isRecording: () => Promise<boolean>;
  getRecordingPath: () => Promise<string | null>;
}

// Get native module (fallback to mock for development)
const NativeCallRecording = NativeModules.CallRecording;

// Debug: Log all available native modules
console.log('============================================');
console.log('[CallRecording] DEBUG: All NativeModules:', Object.keys(NativeModules));
console.log('[CallRecording] Native module available:', !!NativeCallRecording);
console.log('[CallRecording] Native module object:', NativeCallRecording);
if (NativeCallRecording) {
  console.log('[CallRecording] Available methods:', Object.keys(NativeCallRecording));
  console.log('[CallRecording] startRecording type:', typeof NativeCallRecording.startRecording);
  console.log('[CallRecording] stopRecording type:', typeof NativeCallRecording.stopRecording);
}
console.log('============================================');

const CallRecordingModule: CallRecordingModuleType = NativeCallRecording || {
  startRecording: async (callId: string) => {
    console.log('[CallRecording] !!!! USING MOCK startRecording !!!! Native module not available');
    console.log('[CallRecording] Mock called with callId:', callId);
    return '/mock/recording/path.m4a';
  },
  stopRecording: async () => {
    console.log('[CallRecording] !!!! USING MOCK stopRecording !!!! Native module not available');
    return { path: '/mock/recording/path.m4a', duration: 0 };
  },
  isRecording: async () => false,
  getRecordingPath: async () => null,
};

interface UseCallRecordingReturn {
  currentCall: any;
  isRecording: boolean;
  callDuration: number;
  isLoading: boolean;
  error: string | null;
  recordingPath: string | null;
  initiateCall: (lead: Lead) => Promise<boolean>;
  endCall: () => Promise<void>;
  submitOutcome: (outcome: CallOutcome, notes?: string) => Promise<boolean>;
  cancelCall: () => void;
}

export const useCallRecording = (): UseCallRecordingReturn => {
  const dispatch = useAppDispatch();
  const { currentCall, isRecording, callDuration, isLoading, error, currentRecordingPath } = useAppSelector(
    (state) => state.calls
  );

  // Use Redux state for recording path (persists across navigation)
  const recordingPath = currentRecordingPath;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Listen for auto-stop event (when call ends automatically)
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'onRecordingAutoStopped',
      (event: { path: string; duration: number }) => {
        console.log('[useCallRecording] ========== AUTO-STOP EVENT RECEIVED ==========');
        console.log('[useCallRecording] Path:', event.path);
        console.log('[useCallRecording] Duration:', event.duration);

        // Stop the timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Update state with the accurate duration from native
        dispatch(setRecordingPath(event.path));
        dispatch(setCallDuration(event.duration));
        dispatch(setIsRecording(false));

        console.log('[useCallRecording] State updated after auto-stop');
      }
    );

    return () => {
      subscription.remove();
    };
  }, [dispatch]);

  // Start call duration timer
  const startTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      dispatch(incrementCallDuration());
    }, 1000);
  }, [dispatch]);

  // Stop call duration timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Initiate a call
  const initiateCall = useCallback(
    async (lead: Lead): Promise<boolean> => {
      try {
        console.log('============================================');
        console.log('[useCallRecording] >>>>>> INITIATE CALL STARTED <<<<<<');
        console.log('[useCallRecording] Lead ID:', lead.id);
        console.log('[useCallRecording] Lead Phone:', lead.phone);
        console.log('[useCallRecording] Lead Name:', lead.name);
        console.log('============================================');

        // Request permissions first
        console.log('[useCallRecording] Requesting permissions...');
        const hasPermissions = await requestCallPermissions();
        console.log('[useCallRecording] Permissions granted:', hasPermissions);

        if (!hasPermissions) {
          Alert.alert(
            'Permissions Required',
            'Please grant the required permissions to make calls and record.',
          );
          return false;
        }

        // Clean phone number - remove non-numeric chars except +
        const cleanPhone = lead.phone.replace(/[^\d+]/g, '');
        console.log('[useCallRecording] Clean phone:', cleanPhone);

        // STEP 1: Create call record in backend FIRST (to get call ID)
        const payload: StartCallPayload = {
          leadId: lead.id,
          phoneNumber: lead.phone,
        };

        let callId: string | null = null;
        try {
          console.log('[useCallRecording] Creating backend call record...');
          const call = await dispatch(startCall(payload)).unwrap();
          callId = call.id;
          console.log('[useCallRecording] Call record created:', callId);
        } catch (backendError) {
          console.warn('[useCallRecording] Backend call creation failed:', backendError);
          // Generate a temporary ID for recording
          callId = `temp_${Date.now()}`;
          console.log('[useCallRecording] Using temp call ID:', callId);
        }

        // STEP 2: Start recording with Foreground Service BEFORE opening dialer
        // This keeps the app alive in background!
        try {
          console.log('[useCallRecording] ========== STARTING RECORDING ==========');
          console.log('[useCallRecording] Call ID:', callId);
          console.log('[useCallRecording] Native module exists:', !!NativeCallRecording);

          const path = await CallRecordingModule.startRecording(callId);

          console.log('[useCallRecording] ========== RECORDING STARTED ==========');
          console.log('[useCallRecording] Recording path:', path);

          dispatch(setRecordingPath(path));
          dispatch(setIsRecording(true));
        } catch (recordingError: any) {
          console.error('[useCallRecording] ========== RECORDING FAILED ==========');
          console.error('[useCallRecording] Error:', recordingError?.message || recordingError);
          // Continue without recording - still make the call
        }

        // STEP 3: Start timer
        console.log('[useCallRecording] Starting call duration timer...');
        startTimer();
        console.log('[useCallRecording] Timer started successfully');

        // STEP 4: Open phone dialer LAST (after recording is already running)
        const phoneUrl = Platform.select({
          android: `tel:${cleanPhone}`,
          ios: `tel://${cleanPhone}`,
          default: `tel:${cleanPhone}`,
        });

        console.log('[useCallRecording] Opening dialer with URL:', phoneUrl);

        try {
          const canOpen = await Linking.canOpenURL(phoneUrl!);
          console.log('[useCallRecording] Can open URL:', canOpen);

          if (canOpen) {
            await Linking.openURL(phoneUrl!);
            console.log('[useCallRecording] Dialer opened successfully');
          } else {
            console.log('[useCallRecording] canOpenURL returned false, trying anyway...');
            await Linking.openURL(phoneUrl!);
          }
        } catch (linkingError) {
          console.error('[useCallRecording] Linking error:', linkingError);
          Alert.alert('Error', 'Cannot open phone dialer. Please check app permissions.');
          return false;
        }

        return true;
      } catch (err) {
        console.error('Error initiating call:', err);
        Alert.alert('Error', 'Failed to initiate call. Please try again.');
        return false;
      }
    },
    [dispatch, startTimer]
  );

  // End call (stop recording, stop timer, auto-upload for AI analysis)
  const endCall = useCallback(async (): Promise<void> => {
    console.log('[useCallRecording] ========== END CALL ==========');
    console.log('[useCallRecording] Is recording:', isRecording);
    console.log('[useCallRecording] Current recording path:', recordingPath);
    console.log('[useCallRecording] Current call ID:', currentCall?.id);

    // Stop timer
    stopTimer();

    let finalRecordingPath = recordingPath;
    let finalDuration = callDuration;

    // Stop recording
    if (isRecording) {
      try {
        console.log('[useCallRecording] Stopping recording...');
        const result = await CallRecordingModule.stopRecording();

        console.log('[useCallRecording] ========== RECORDING STOPPED ==========');
        console.log('[useCallRecording] Result path:', result.path);
        console.log('[useCallRecording] Duration:', result.duration, 'seconds');

        finalRecordingPath = result.path;
        dispatch(setRecordingPath(result.path));
        dispatch(setIsRecording(false));

        // Use actual recording duration from native module (more accurate than JS timer)
        if (result.duration > 0) {
          finalDuration = result.duration;
          dispatch(setCallDuration(result.duration));
        }
      } catch (err: any) {
        console.error('[useCallRecording] ========== STOP RECORDING FAILED ==========');
        console.error('[useCallRecording] Error:', err?.message || err);
      }
    } else {
      console.log('[useCallRecording] Not recording, skipping stop');
    }

    // Auto-upload recording for AI analysis using offline queue
    if (finalRecordingPath && currentCall?.id) {
      console.log('[useCallRecording] ========== QUEUING RECORDING UPLOAD ==========');
      console.log('[useCallRecording] Call ID:', currentCall.id);
      console.log('[useCallRecording] Recording path:', finalRecordingPath);
      console.log('[useCallRecording] Duration:', finalDuration);

      // STEP 1: Backup recording locally first (prevents data loss)
      try {
        const backupPath = await recordingBackupService.backup(
          currentCall.id,
          finalRecordingPath
        );
        if (backupPath) {
          console.log('[useCallRecording] Recording backed up to:', backupPath);
        }
      } catch (backupError) {
        console.warn('[useCallRecording] Recording backup failed:', backupError);
        // Continue anyway - we still have the original path
      }

      // STEP 2: Add to Redux pending uploads (for UI tracking)
      dispatch(
        addPendingUpload({
          callId: currentCall.id,
          recordingPath: finalRecordingPath,
        })
      );

      // STEP 3: Add to offline queue (handles retries & offline sync)
      try {
        await offlineQueue.addRecordingUpload(
          currentCall.id,
          finalRecordingPath,
          finalDuration
        );
        console.log('[useCallRecording] Recording upload queued successfully');
      } catch (queueError) {
        console.error('[useCallRecording] Failed to queue recording upload:', queueError);

        // Fallback: try direct upload
        dispatch(
          uploadRecording({
            callId: currentCall.id,
            recordingPath: finalRecordingPath,
            duration: finalDuration,
          })
        ).then(() => {
          console.log('[useCallRecording] Fallback: Recording upload initiated');
        }).catch((err) => {
          console.warn('[useCallRecording] Fallback upload also failed:', err);
        });
      }
    }
  }, [dispatch, isRecording, recordingPath, currentCall, callDuration, stopTimer]);

  // Submit call outcome
  const submitOutcome = useCallback(
    async (outcome: CallOutcome, notes?: string): Promise<boolean> => {
      console.log('[useCallRecording] ========== SUBMIT OUTCOME ==========');
      console.log('[useCallRecording] Outcome:', outcome);
      console.log('[useCallRecording] Notes:', notes);
      console.log('[useCallRecording] Call duration:', callDuration);
      console.log('[useCallRecording] Recording path:', recordingPath);
      console.log('[useCallRecording] Current call:', currentCall?.id);

      if (!currentCall) {
        console.error('[useCallRecording] No current call to submit outcome for');
        return false;
      }

      try {
        const payload: UpdateCallPayload = {
          outcome,
          notes,
          duration: callDuration,
        };

        // Try direct API call first
        try {
          console.log('[useCallRecording] Updating call with payload:', JSON.stringify(payload));
          await dispatch(updateCall({ callId: currentCall.id, payload })).unwrap();
          console.log('[useCallRecording] Call updated successfully (online)');
        } catch (updateError: any) {
          console.warn('[useCallRecording] Direct update failed, queuing for later:', updateError?.message);

          // Queue outcome submission for offline sync
          await offlineQueue.addOutcomeSubmit(
            currentCall.id,
            outcome,
            notes,
            callDuration
          );
          console.log('[useCallRecording] Outcome queued for offline sync');
        }

        // Queue recording upload if available (using offline queue)
        if (recordingPath) {
          console.log('[useCallRecording] ========== QUEUING RECORDING UPLOAD ==========');
          console.log('[useCallRecording] Call ID:', currentCall.id);
          console.log('[useCallRecording] Recording path:', recordingPath);

          // Add to Redux pending (for UI)
          dispatch(
            addPendingUpload({
              callId: currentCall.id,
              recordingPath,
            })
          );

          // Backup and queue via offline queue
          try {
            await recordingBackupService.backup(currentCall.id, recordingPath);
            await offlineQueue.addRecordingUpload(
              currentCall.id,
              recordingPath,
              callDuration
            );
            console.log('[useCallRecording] Recording upload queued');
          } catch (queueError) {
            console.warn('[useCallRecording] Queue failed, trying direct upload:', queueError);
            // Fallback to direct upload
            dispatch(
              uploadRecording({
                callId: currentCall.id,
                recordingPath,
              })
            ).catch((err) => {
              console.warn('[useCallRecording] Direct upload also failed:', err);
            });
          }
        } else {
          console.log('[useCallRecording] No recording to upload');
        }

        // Reset state (resetCallState already sets recordingPath to null)
        dispatch(resetCallState());

        console.log('[useCallRecording] Outcome submitted successfully');
        return true;
      } catch (err) {
        console.error('[useCallRecording] Error submitting outcome:', err);

        // Even on error, try to queue for later
        try {
          await offlineQueue.addOutcomeSubmit(
            currentCall.id,
            outcome,
            notes,
            callDuration
          );
          console.log('[useCallRecording] Outcome queued despite error');
          dispatch(resetCallState());
          return true;
        } catch (queueErr) {
          Alert.alert('Error', 'Failed to save call outcome. Please try again.');
          return false;
        }
      }
    },
    [currentCall, callDuration, recordingPath, dispatch]
  );

  // Cancel call without saving
  const cancelCall = useCallback(() => {
    stopTimer();
    dispatch(resetCallState());
  }, [dispatch, stopTimer]);

  return {
    currentCall,
    isRecording,
    callDuration,
    isLoading,
    error,
    recordingPath,
    initiateCall,
    endCall,
    submitOutcome,
    cancelCall,
  };
};

export default useCallRecording;
