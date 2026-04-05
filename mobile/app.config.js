// Mobile App Configuration
// Environment variables can be set in .env file or through EAS Build

export default {
  name: 'VoiceBridge',
  slug: 'voicebridge-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#4F46E5',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.voicebridge.mobile',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#4F46E5',
    },
    package: 'com.voicebridge.mobile',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    // API Configuration - Can be overridden via environment variables
    apiUrl: process.env.API_URL || 'http://localhost:3001/api',
    // For physical device testing, use your PC's local IP
    // Example: API_URL=http://192.168.1.100:3001/api npx expo start
  },
  plugins: [
    [
      'expo-camera',
      {
        cameraPermission: 'Allow VoiceBridge to access your camera for check-in photos.',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Allow VoiceBridge to access your location for check-ins.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow VoiceBridge to access your photos for attachments.',
      },
    ],
  ],
};
