import { NativeModules, Platform, PermissionsAndroid } from 'react-native';

// Call outcome based on duration
export type CallOutcome = 'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'REJECTED' | 'UNKNOWN';

export interface CallResult {
  phoneNumber: string;
  duration: number; // in seconds
  outcome: CallOutcome;
  timestamp: Date;
}

/**
 * Get the last call details from Android Call Log
 * Requires READ_CALL_LOG permission
 */
export const getLastCallDetails = async (phoneNumber: string): Promise<CallResult | null> => {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    // Check permission
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
    );

    if (!granted) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('[CallTracker] READ_CALL_LOG permission denied');
        return null;
      }
    }

    // Use native module to read call log
    if (NativeModules.CallLogModule) {
      const callLog = await NativeModules.CallLogModule.getLastCall(phoneNumber);
      if (callLog) {
        return {
          phoneNumber: callLog.phoneNumber,
          duration: callLog.duration,
          outcome: determineOutcome(callLog.duration, callLog.type),
          timestamp: new Date(callLog.date),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[CallTracker] Error reading call log:', error);
    return null;
  }
};

/**
 * Determine call outcome based on duration and type
 * Type: 1 = Incoming, 2 = Outgoing, 3 = Missed, 5 = Rejected
 */
const determineOutcome = (duration: number, type: number): CallOutcome => {
  if (type === 5) return 'REJECTED';
  if (type === 3) return 'NO_ANSWER';

  if (duration > 10) return 'CONNECTED';
  if (duration > 0 && duration <= 10) return 'BUSY'; // Very short = likely busy/voicemail
  return 'NO_ANSWER';
};

/**
 * Map call outcome to assigned data status
 */
export const outcomeToStatus = (outcome: CallOutcome): string => {
  switch (outcome) {
    case 'CONNECTED':
      return 'CALLING'; // Will be updated after AI analysis or manual input
    case 'NO_ANSWER':
      return 'NO_ANSWER';
    case 'BUSY':
      return 'NO_ANSWER';
    case 'REJECTED':
      return 'NOT_INTERESTED';
    default:
      return 'ASSIGNED';
  }
};
