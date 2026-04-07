import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

// Silence React Native Firebase v22 modular API deprecation warnings until migration is complete.
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

// Lazy-load native push deps so the app boots even when the APK was built without
// firebase / notifee native modules (or google-services.json is missing).
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fbMessaging = require('@react-native-firebase/messaging');
  const messaging = fbMessaging?.default || fbMessaging;
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[BackgroundHandler] Message received:', remoteMessage);
  });
} catch (e) {
  console.warn('[index] firebase messaging not available — skipping background handler');
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const notifeeMod = require('@notifee/react-native');
  const notifee = notifeeMod?.default || notifeeMod;
  const EventType = notifeeMod?.EventType || { PRESS: 1, DISMISSED: 0 };
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    console.log('[NotifeeBackground] Event type:', type, 'Detail:', detail);
    if (type === EventType.PRESS) {
      console.log('[NotifeeBackground] Notification pressed:', detail.notification?.data);
    }
  });
} catch (e) {
  console.warn('[index] notifee not available — skipping background event handler');
}

AppRegistry.registerComponent(appName, () => App);
