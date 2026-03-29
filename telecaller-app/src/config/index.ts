/**
 * App Configuration
 *
 * Configuration priority:
 * 1. Environment variable from .env file (PRODUCTION_API_URL or API_URL)
 * 2. Auto-detect based on platform (emulator/simulator/device)
 *
 * For Physical Device Testing:
 * - Set USE_PHYSICAL_DEVICE = true
 * - Update PHYSICAL_DEVICE_IP to your computer's local IP
 * - Ensure phone and computer are on the same WiFi
 * - Ensure firewall allows port 3001
 */

import { Platform } from 'react-native';

// Try to import react-native-config (may not be available in all builds)
let Config: { API_URL?: string; PRODUCTION_API_URL?: string } = {};
try {
  Config = require('react-native-config').default || {};
} catch (e) {
  // react-native-config not available, use defaults
}

// ============================================================
// CONFIGURATION - Adjust these settings as needed
// ============================================================

// Set to true when using ADB reverse (recommended for physical device)
// Run: adb reverse tcp:3001 tcp:3001
const USE_ADB_REVERSE = Config.USE_ADB_REVERSE !== 'false';

// Set to true when testing on physical device WITHOUT adb reverse
const USE_PHYSICAL_DEVICE = Config.USE_PHYSICAL_DEVICE === 'true';

// Your computer's local IP (only used when USE_PHYSICAL_DEVICE is true)
// Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
const PHYSICAL_DEVICE_IP = Config.PHYSICAL_DEVICE_IP || '192.168.29.116';

// API Port (configurable)
const API_PORT = Config.API_PORT || '3001';

// Production API URL (used when env variable is set)
const PRODUCTION_API_URL = Config.PRODUCTION_API_URL || Config.API_URL || '';

// ============================================================

// Determine the API URL based on environment and platform
const getApiUrl = (): string => {
  // Priority 1: Production URL from environment
  if (PRODUCTION_API_URL && PRODUCTION_API_URL.startsWith('http')) {
    return PRODUCTION_API_URL;
  }

  // Priority 2: ADB reverse mode (localhost works on physical device)
  if (USE_ADB_REVERSE) {
    return `http://localhost:${API_PORT}/api`;
  }

  // Priority 3: Physical device mode (use computer's IP)
  if (USE_PHYSICAL_DEVICE && PHYSICAL_DEVICE_IP) {
    return `http://${PHYSICAL_DEVICE_IP}:${API_PORT}/api`;
  }

  // Priority 4: Platform-specific defaults for development
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine
    return `http://10.0.2.2:${API_PORT}/api`;
  }

  // iOS simulator can use localhost directly
  return `http://localhost:${API_PORT}/api`;
};

// API URL - auto-detected based on configuration
export const API_URL = getApiUrl();

// Alternative URLs for reference/debugging
export const API_URLS = {
  local: `http://localhost:${API_PORT}/api`,
  androidEmulator: `http://10.0.2.2:${API_PORT}/api`,
  physicalDevice: `http://${PHYSICAL_DEVICE_IP}:${API_PORT}/api`,
  production: PRODUCTION_API_URL,
};

// App constants
export const APP_CONFIG = {
  callRecordingEnabled: true,
  autoSendSmsOnCall: true,
  maxCallDuration: 3600, // 1 hour in seconds
  callPrepEnabled: true, // Smart Call Prep feature
  dailyCallTarget: 30, // Default daily call target
};

// Debug info (only in development)
if (__DEV__) {
  console.log('[Config] ═══════════════════════════════════════');
  console.log('[Config] Platform:', Platform.OS);
  console.log('[Config] API URL:', API_URL);
  console.log('[Config] Physical device mode:', USE_PHYSICAL_DEVICE);
  console.log('[Config] Production URL configured:', !!PRODUCTION_API_URL);
  console.log('[Config] ═══════════════════════════════════════');
}

export default {
  API_URL,
  API_URLS,
  APP_CONFIG,
};
