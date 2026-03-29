import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  NativeModules,
  AppState,
  AppStateStatus,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { AccessibilityRecording } = NativeModules;

const STORAGE_KEY = '@accessibility_setup_shown';
const PERMISSIONS_KEY = '@runtime_permissions_granted';

interface AccessibilitySetupModalProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

/**
 * Modal that guides users to enable Accessibility Service for call recording.
 * Shows automatically on first launch if accessibility is not enabled.
 */
const AccessibilitySetupModal: React.FC<AccessibilitySetupModalProps> = ({
  onComplete,
  forceShow = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [step, setStep] = useState(0); // 0 = permissions, 1 = intro, 2 = instructions, 3 = success
  const [waitingForReturn, setWaitingForReturn] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Request runtime permissions one by one (like Runo)
  const requestRuntimePermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      // Check if already granted
      const alreadyGranted = await AsyncStorage.getItem(PERMISSIONS_KEY);
      if (alreadyGranted === 'true') {
        return true;
      }

      // Request Phone permission
      const phoneResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        {
          title: 'Phone Permission',
          message: 'Telecaller CRM needs access to detect incoming and outgoing calls.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      // Request Call Log permission
      const callLogResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        {
          title: 'Call Log Permission',
          message: 'Telecaller CRM needs access to call logs to track call history and duration.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      // Request Make Calls permission
      const callPhoneResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        {
          title: 'Make Calls Permission',
          message: 'Telecaller CRM needs permission to make calls directly from the app.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      // Request Notifications permission (Android 13+)
      let notificationResult = PermissionsAndroid.RESULTS.GRANTED;
      if (Platform.Version >= 33) {
        notificationResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notifications Permission',
            message: 'Telecaller CRM needs permission to send you notifications about leads and calls.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
      }

      const allGranted =
        phoneResult === PermissionsAndroid.RESULTS.GRANTED &&
        callLogResult === PermissionsAndroid.RESULTS.GRANTED &&
        callPhoneResult === PermissionsAndroid.RESULTS.GRANTED;

      if (allGranted) {
        await AsyncStorage.setItem(PERMISSIONS_KEY, 'true');
      }

      return allGranted;
    } catch (error) {
      console.warn('[AccessibilitySetup] Permission error:', error);
      return false;
    }
  };

  // Check if accessibility is enabled
  const checkAccessibility = async (): Promise<boolean> => {
    if (!AccessibilityRecording) return false;
    try {
      const enabled = await AccessibilityRecording.isAccessibilityEnabled();
      setIsEnabled(enabled);
      return enabled;
    } catch (error) {
      console.warn('[AccessibilitySetup] Error checking:', error);
      return false;
    }
  };

  // Check if we should show the modal
  useEffect(() => {
    const init = async () => {
      if (forceShow) {
        setStep(1);
        setVisible(true);
        return;
      }

      // First request runtime permissions
      const permsGranted = await requestRuntimePermissions();
      setPermissionsGranted(permsGranted);

      // Check if accessibility already enabled
      const enabled = await checkAccessibility();
      if (enabled) {
        return;
      }

      // Check if already shown and dismissed
      const alreadyShown = await AsyncStorage.getItem(STORAGE_KEY);
      if (alreadyShown === 'dismissed') {
        return;
      }

      // Show modal at step 1 (intro) since permissions are done via popups
      setStep(1);
      setVisible(true);
    };

    init();
  }, [forceShow]);

  // Listen for app returning from settings
  useEffect(() => {
    if (!waitingForReturn) return;

    const handleAppState = async (state: AppStateStatus) => {
      if (state === 'active') {
        const enabled = await checkAccessibility();
        if (enabled) {
          setStep(3); // Success step
          setWaitingForReturn(false);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [waitingForReturn]);

  // Open accessibility settings
  const openSettings = async () => {
    if (!AccessibilityRecording) return;

    try {
      setWaitingForReturn(true);
      setStep(2);
      await AccessibilityRecording.openAccessibilitySettings();
    } catch (error) {
      console.error('[AccessibilitySetup] Error opening settings:', error);
    }
  };

  // Dismiss modal
  const handleDismiss = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'dismissed');
    setVisible(false);
    onComplete?.();
  };

  // Complete setup
  const handleComplete = () => {
    setVisible(false);
    onComplete?.();
  };

  // Skip for now
  const handleSkip = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'skipped');
    setVisible(false);
    onComplete?.();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Step 1: Introduction */}
          {step === 1 && (
            <>
              <View style={styles.iconContainer}>
                <Icon name="microphone-outline" size={48} color="#10B981" />
              </View>

              <Text style={styles.title}>Enable Call Recording</Text>

              <Text style={styles.description}>
                To record your calls and get AI-powered insights, you need to enable the Accessibility Service.
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Icon name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.featureText}>Automatic call recording</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.featureText}>AI transcription in Telugu, Hindi, English</Text>
                </View>
                <View style={styles.featureItem}>
                  <Icon name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.featureText}>Smart lead classification</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={openSettings}>
                <Text style={styles.primaryButtonText}>Enable Now</Text>
                <Icon name="arrow-right" size={20} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Skip for now (use duration-based classification)</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 2: Instructions */}
          {step === 2 && (
            <>
              <View style={styles.iconContainer}>
                <Icon name="cog-outline" size={48} color="#6366F1" />
              </View>

              <Text style={styles.title}>Follow These Steps</Text>

              <View style={styles.stepsList}>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>Find "Installed Services" or "Downloaded apps"</Text>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>Tap on "Telecaller CRM"</Text>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepText}>Enable the toggle switch</Text>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <Text style={styles.stepText}>Tap "Allow" when prompted</Text>
                </View>
              </View>

              <View style={styles.waitingContainer}>
                <Icon name="loading" size={24} color="#6366F1" />
                <Text style={styles.waitingText}>Waiting for you to return...</Text>
              </View>

              <TouchableOpacity style={styles.secondaryButton} onPress={checkAccessibility}>
                <Text style={styles.secondaryButtonText}>I've enabled it</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <>
              <View style={[styles.iconContainer, styles.successIcon]}>
                <Icon name="check-circle" size={48} color="#10B981" />
              </View>

              <Text style={styles.title}>All Set!</Text>

              <Text style={styles.description}>
                Call recording is now enabled. Your calls will be automatically recorded and analyzed by AI.
              </Text>

              <TouchableOpacity style={styles.primaryButton} onPress={handleComplete}>
                <Text style={styles.primaryButtonText}>Start Using App</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    backgroundColor: '#D1FAE5',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  featureList: {
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  stepsList: {
    width: '100%',
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  stepText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
  },
  waitingText: {
    fontSize: 14,
    color: '#6366F1',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
  },
  secondaryButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 16,
    padding: 8,
  },
  skipButtonText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default AccessibilitySetupModal;
