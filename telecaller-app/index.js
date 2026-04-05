import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import App from './src/App';
import { name as appName } from './app.json';

/**
 * Background Message Handler
 * Handles FCM messages when app is killed or in background
 * MUST be registered before AppRegistry.registerComponent
 */
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[BackgroundHandler] Message received:', remoteMessage);

  // The notification will be shown automatically by FCM
  // We can do additional processing here if needed

  // Store the notification data for later processing
  // This could be useful for analytics or offline queuing
  const notificationData = {
    id: remoteMessage.messageId,
    type: remoteMessage.data?.type || 'SYSTEM',
    title: remoteMessage.notification?.title,
    body: remoteMessage.notification?.body,
    data: remoteMessage.data,
    receivedAt: Date.now(),
  };

  console.log('[BackgroundHandler] Processed:', notificationData);
});

/**
 * Notifee Background Event Handler
 * Handles notification interactions when app is in background
 */
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('[NotifeeBackground] Event type:', type, 'Detail:', detail);

  if (type === EventType.PRESS) {
    // User pressed the notification
    console.log('[NotifeeBackground] Notification pressed:', detail.notification?.data);
    // The actual navigation will happen when app comes to foreground
  }

  if (type === EventType.DISMISSED) {
    // User dismissed the notification
    console.log('[NotifeeBackground] Notification dismissed:', detail.notification?.id);
  }
});

// Register the main application component
AppRegistry.registerComponent(appName, () => App);
