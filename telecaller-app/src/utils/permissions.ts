import { Platform, PermissionsAndroid, Alert, Linking, Permission } from 'react-native';

export type PermissionType =
  | 'RECORD_AUDIO'
  | 'READ_PHONE_STATE'
  | 'CALL_PHONE'
  | 'READ_CALL_LOG'
  | 'CAMERA'
  | 'READ_EXTERNAL_STORAGE'
  | 'WRITE_EXTERNAL_STORAGE';

const PERMISSION_MAP: Record<PermissionType, Permission> = {
  RECORD_AUDIO: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  READ_PHONE_STATE: PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
  CALL_PHONE: PermissionsAndroid.PERMISSIONS.CALL_PHONE,
  READ_CALL_LOG: PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
  CAMERA: PermissionsAndroid.PERMISSIONS.CAMERA,
  READ_EXTERNAL_STORAGE: PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  WRITE_EXTERNAL_STORAGE: PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
};

const PERMISSION_MESSAGES: Record<PermissionType, { title: string; message: string }> = {
  RECORD_AUDIO: {
    title: 'Microphone Permission',
    message: 'This app needs microphone access to record calls for quality assurance.',
  },
  READ_PHONE_STATE: {
    title: 'Phone State Permission',
    message: 'This app needs to read phone state to detect when calls start and end.',
  },
  CALL_PHONE: {
    title: 'Phone Permission',
    message: 'This app needs permission to make phone calls.',
  },
  READ_CALL_LOG: {
    title: 'Call Log Permission',
    message: 'This app needs access to call logs to track call duration.',
  },
  CAMERA: {
    title: 'Camera Permission',
    message: 'This app needs camera access.',
  },
  READ_EXTERNAL_STORAGE: {
    title: 'Storage Permission',
    message: 'This app needs storage access to save recordings.',
  },
  WRITE_EXTERNAL_STORAGE: {
    title: 'Storage Permission',
    message: 'This app needs storage access to save recordings.',
  },
};

/**
 * Request a single permission
 */
export const requestPermission = async (permission: PermissionType): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS handles permissions differently
  }

  try {
    const androidPermission = PERMISSION_MAP[permission];
    const granted = await PermissionsAndroid.check(androidPermission);

    if (granted) {
      return true;
    }

    const result = await PermissionsAndroid.request(androidPermission, {
      title: PERMISSION_MESSAGES[permission].title,
      message: PERMISSION_MESSAGES[permission].message,
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    });

    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error(`Error requesting ${permission} permission:`, error);
    return false;
  }
};

/**
 * Request multiple permissions
 */
export const requestMultiplePermissions = async (
  permissions: PermissionType[]
): Promise<Record<PermissionType, boolean>> => {
  if (Platform.OS !== 'android') {
    return permissions.reduce(
      (acc, perm) => {
        acc[perm] = true;
        return acc;
      },
      {} as Record<PermissionType, boolean>
    );
  }

  const results: Record<PermissionType, boolean> = {} as any;

  for (const permission of permissions) {
    results[permission] = await requestPermission(permission);
  }

  return results;
};

/**
 * Check if permission is granted
 */
export const checkPermission = async (permission: PermissionType): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const androidPermission = PERMISSION_MAP[permission];
    return await PermissionsAndroid.check(androidPermission);
  } catch (error) {
    console.error(`Error checking ${permission} permission:`, error);
    return false;
  }
};

/**
 * Request all permissions needed for call recording
 */
export const requestCallPermissions = async (): Promise<boolean> => {
  const permissions: PermissionType[] = [
    'RECORD_AUDIO',
    'READ_PHONE_STATE',
    'CALL_PHONE',
    'READ_CALL_LOG',
  ];

  const results = await requestMultiplePermissions(permissions);
  const allGranted = Object.values(results).every((granted) => granted);

  if (!allGranted) {
    const deniedPermissions = Object.entries(results)
      .filter(([_, granted]) => !granted)
      .map(([perm]) => perm);

    Alert.alert(
      'Permissions Required',
      `The following permissions are required for the app to work properly: ${deniedPermissions.join(', ')}. Please grant them in app settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }

  return allGranted;
};

/**
 * Open app settings for manual permission grant
 */
export const openAppSettings = async (): Promise<void> => {
  try {
    await Linking.openSettings();
  } catch (error) {
    console.error('Error opening settings:', error);
    Alert.alert(
      'Error',
      'Unable to open app settings. Please go to Settings > Apps > Telecaller CRM to manage permissions.'
    );
  }
};

export default {
  requestPermission,
  requestMultiplePermissions,
  checkPermission,
  requestCallPermissions,
  openAppSettings,
};
