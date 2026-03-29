import { useEffect, useState, useCallback } from 'react';
import { NativeModules, NativeEventEmitter, Platform, Alert, Linking } from 'react-native';

const { AccessibilityRecording } = NativeModules;

interface RecordingEvent {
  path: string;
  phoneNumber?: string;
  duration?: number;
  error?: string;
}

interface UseAccessibilityRecordingResult {
  isAccessibilityEnabled: boolean;
  isRecording: boolean;
  lastRecordingPath: string | null;
  lastRecordingDuration: number | null;
  checkAccessibilityEnabled: () => Promise<boolean>;
  openAccessibilitySettings: () => Promise<void>;
  startRecording: (phoneNumber: string) => Promise<boolean>;
  stopRecording: () => Promise<boolean>;
}

/**
 * Hook for using Accessibility Service based call recording
 *
 * This recording method works on Android 10+ where normal recording is blocked.
 * User must enable the Accessibility Service in Settings for this to work.
 */
export const useAccessibilityRecording = (): UseAccessibilityRecordingResult => {
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lastRecordingPath, setLastRecordingPath] = useState<string | null>(null);
  const [lastRecordingDuration, setLastRecordingDuration] = useState<number | null>(null);

  // Check if accessibility service is enabled
  const checkAccessibilityEnabled = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AccessibilityRecording) {
      return false;
    }

    try {
      const enabled = await AccessibilityRecording.isAccessibilityEnabled();
      setIsAccessibilityEnabled(enabled);
      return enabled;
    } catch (error) {
      console.warn('[AccessibilityRecording] Error checking status:', error);
      return false;
    }
  }, []);

  // Open accessibility settings
  const openAccessibilitySettings = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'android' || !AccessibilityRecording) {
      Alert.alert('Not Available', 'Accessibility recording is only available on Android');
      return;
    }

    try {
      await AccessibilityRecording.openAccessibilitySettings();
    } catch (error) {
      console.error('[AccessibilityRecording] Error opening settings:', error);
      // Fallback to generic settings
      Linking.openSettings();
    }
  }, []);

  // Start recording manually
  const startRecording = useCallback(async (phoneNumber: string): Promise<boolean> => {
    if (!AccessibilityRecording) return false;

    try {
      await AccessibilityRecording.startRecording(phoneNumber);
      setIsRecording(true);
      return true;
    } catch (error: any) {
      console.warn('[AccessibilityRecording] Start error:', error?.message);
      return false;
    }
  }, []);

  // Stop recording manually
  const stopRecording = useCallback(async (): Promise<boolean> => {
    if (!AccessibilityRecording) return false;

    try {
      await AccessibilityRecording.stopRecording();
      setIsRecording(false);
      return true;
    } catch (error: any) {
      console.warn('[AccessibilityRecording] Stop error:', error?.message);
      return false;
    }
  }, []);

  // Listen for recording events from native
  useEffect(() => {
    if (Platform.OS !== 'android' || !AccessibilityRecording) {
      return;
    }

    // Check initial status
    checkAccessibilityEnabled();

    const eventEmitter = new NativeEventEmitter(AccessibilityRecording);

    const startedSubscription = eventEmitter.addListener(
      'onAccessibilityRecordingStarted',
      (event: RecordingEvent) => {
        console.log('[AccessibilityRecording] Recording started:', event.path);
        setIsRecording(true);
        setLastRecordingPath(event.path);
      }
    );

    const stoppedSubscription = eventEmitter.addListener(
      'onAccessibilityRecordingStopped',
      (event: RecordingEvent) => {
        console.log('[AccessibilityRecording] Recording stopped:', event.path, 'duration:', event.duration);
        setIsRecording(false);
        setLastRecordingPath(event.path);
        setLastRecordingDuration(event.duration || null);
      }
    );

    const errorSubscription = eventEmitter.addListener(
      'onAccessibilityRecordingError',
      (event: RecordingEvent) => {
        console.error('[AccessibilityRecording] Error:', event.error);
        setIsRecording(false);
      }
    );

    return () => {
      startedSubscription.remove();
      stoppedSubscription.remove();
      errorSubscription.remove();
    };
  }, [checkAccessibilityEnabled]);

  return {
    isAccessibilityEnabled,
    isRecording,
    lastRecordingPath,
    lastRecordingDuration,
    checkAccessibilityEnabled,
    openAccessibilitySettings,
    startRecording,
    stopRecording,
  };
};

/**
 * Prompt user to enable accessibility service
 */
export const promptEnableAccessibility = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    Alert.alert(
      'Enable Call Recording',
      'To record calls, you need to enable the Accessibility Service.\n\n' +
      '1. Tap "Open Settings"\n' +
      '2. Find "Telecaller CRM" in the list\n' +
      '3. Enable the service\n' +
      '4. Return to the app',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Open Settings',
          onPress: async () => {
            try {
              if (AccessibilityRecording) {
                await AccessibilityRecording.openAccessibilitySettings();
              } else {
                await Linking.openSettings();
              }
              resolve(true);
            } catch (error) {
              resolve(false);
            }
          },
        },
      ]
    );
  });
};

export default useAccessibilityRecording;
