import { useCallback, useRef, useEffect } from 'react';
import { Linking, Platform, Alert, AppState, AppStateStatus } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../store';
import {
  startCall,
  setIsRecording,
  setCallDuration,
  incrementCallDuration,
  setRecordingPath,
} from '../store/slices/callsSlice';
import { requestCallPermissions } from '../utils/permissions';
import { Lead, StartCallPayload, RootStackParamList, Call } from '../types';
import { NativeModules, DeviceEventEmitter } from 'react-native';

const NativeCallRecording = NativeModules.CallRecording;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UseDirectCallReturn {
  initiateCall: (lead: Lead) => Promise<boolean>;
  isCallInProgress: boolean;
}

/**
 * Hook for direct call flow - opens dialer immediately, shows outcome when user returns
 * No intermediate "Active Call" screen needed
 */
export const useDirectCall = (): UseDirectCallReturn => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();
  const { currentCall, currentRecordingPath, callDuration } = useAppSelector((state) => state.calls);

  const isCallInProgressRef = useRef(false);
  const callStartTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentLeadRef = useRef<Lead | null>(null);
  const callDataRef = useRef<Call | null>(null);
  const appWentToBackgroundRef = useRef(false);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Handle app state changes - detect when user returns from dialer
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('[useDirectCall] AppState changed to:', nextAppState, 'callInProgress:', isCallInProgressRef.current);

      // Track when app goes to background (dialer takes over)
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (isCallInProgressRef.current) {
          appWentToBackgroundRef.current = true;
          console.log('[useDirectCall] App went to background during call');
        }
      }

      // When app becomes active and we were in a call that went to background
      if (nextAppState === 'active' && isCallInProgressRef.current && appWentToBackgroundRef.current) {
        console.log('[useDirectCall] User returned from dialer - showing outcome');

        // Small delay to ensure app is fully active
        setTimeout(async () => {
          // Stop timer and recording
          stopTimer();

          // Stop recording if active
          if (NativeCallRecording && typeof NativeCallRecording.stopRecording === 'function') {
            try {
              const result = await NativeCallRecording.stopRecording();
              console.log('[useDirectCall] Recording stopped:', result);
              if (result.path) {
                dispatch(setRecordingPath(result.path));
              }
              if (result.duration > 0) {
                dispatch(setCallDuration(result.duration));
              }
            } catch (err) {
              console.log('[useDirectCall] Stop recording skipped:', err);
            }
          }

          dispatch(setIsRecording(false));

          // Reset flags
          const lead = currentLeadRef.current;
          const callData = callDataRef.current;
          isCallInProgressRef.current = false;
          appWentToBackgroundRef.current = false;
          currentLeadRef.current = null;
          callDataRef.current = null;

          // Navigate to Outcome screen
          if (lead || callData) {
            console.log('[useDirectCall] Navigating to Outcome screen');
            navigation.navigate('Outcome', {
              call: callData as any,
              recordingPath: undefined,
            });
          }
        }, 500);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [dispatch, navigation, stopTimer]);

  // Listen for call answered event to start timer
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('onCallAnswered', () => {
      console.log('[useDirectCall] Call answered - starting timer');
      if (!timerRef.current && isCallInProgressRef.current) {
        callStartTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          dispatch(incrementCallDuration());
        }, 1000);
      }
    });
    return () => sub.remove();
  }, [dispatch]);

  // Listen for recording auto-stop event
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'onRecordingAutoStopped',
      (event: { path: string; duration: number }) => {
        console.log('[useDirectCall] Recording auto-stopped:', event);
        stopTimer();
        dispatch(setRecordingPath(event.path));
        dispatch(setCallDuration(event.duration));
        dispatch(setIsRecording(false));
      }
    );
    return () => subscription.remove();
  }, [dispatch, stopTimer]);

  // Initiate a call - opens dialer directly
  const initiateCall = useCallback(
    async (lead: Lead): Promise<boolean> => {
      try {
        console.log('[useDirectCall] ====== INITIATING CALL ======');
        console.log('[useDirectCall] Lead:', lead.name, lead.phone);

        // Request permissions
        const hasPermissions = await requestCallPermissions();
        if (!hasPermissions) {
          Alert.alert(
            'Permissions Required',
            'Please grant the required permissions to make calls.'
          );
          return false;
        }

        // Clean phone number
        const cleanPhone = lead.phone.replace(/[^\d+]/g, '');

        // Generate unique request ID for idempotency (prevents duplicate call creation)
        const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        console.log('[useDirectCall] Request ID:', requestId);

        // Create call record in backend
        const payload: StartCallPayload = {
          leadId: lead.id,
          phoneNumber: lead.phone,
          requestId,
        };

        let callData: Call | null = null;
        try {
          const call = await dispatch(startCall(payload)).unwrap();
          callData = call;
          console.log('[useDirectCall] Call record created:', call.id);
        } catch (err) {
          console.warn('[useDirectCall] Backend call creation failed:', err);
          // Create a minimal call object for outcome screen
          callData = {
            id: `temp_${Date.now()}`,
            leadId: lead.id,
            leadName: lead.name,
            leadPhone: lead.phone,
            userId: '',
            status: 'INITIATED',
            duration: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Call;
        }

        // Start recording service
        if (NativeCallRecording && typeof NativeCallRecording.startRecording === 'function') {
          try {
            const path = await NativeCallRecording.startRecording(callData?.id || 'temp');
            console.log('[useDirectCall] Recording started:', path);
            dispatch(setRecordingPath(path));
            dispatch(setIsRecording(true));
          } catch (err) {
            console.log('[useDirectCall] Recording start skipped:', err);
          }
        }

        // Mark call in progress and store refs
        isCallInProgressRef.current = true;
        appWentToBackgroundRef.current = false;
        currentLeadRef.current = lead;
        callDataRef.current = callData;

        // Open phone dialer
        const phoneUrl = Platform.select({
          android: `tel:${cleanPhone}`,
          ios: `tel://${cleanPhone}`,
          default: `tel:${cleanPhone}`,
        });

        console.log('[useDirectCall] Opening dialer:', phoneUrl);
        await Linking.openURL(phoneUrl!);

        console.log('[useDirectCall] Dialer opened, waiting for user to return...');
        return true;
      } catch (err) {
        console.error('[useDirectCall] Error:', err);
        Alert.alert('Error', 'Failed to initiate call. Please try again.');
        isCallInProgressRef.current = false;
        appWentToBackgroundRef.current = false;
        currentLeadRef.current = null;
        callDataRef.current = null;
        return false;
      }
    },
    [dispatch]
  );

  return {
    initiateCall,
    isCallInProgress: isCallInProgressRef.current,
  };
};

export default useDirectCall;
