import React, { useEffect, useRef } from 'react';
import { StatusBar, LogBox, ActivityIndicator, View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { store, persistor } from './store';
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import AccessibilitySetupModal from './components/AccessibilitySetupModal';

// Services
import { offlineQueue, recordingBackupService, notificationService } from './services';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
]);

// Loading component for PersistGate
const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3B82F6" />
  </View>
);

const App: React.FC = () => {
  const appState = useRef(AppState.currentState);
  const servicesInitialized = useRef(false);

  useEffect(() => {
    // Initialize services on app start
    const initializeServices = async () => {
      if (servicesInitialized.current) return;

      try {
        console.log('[App] Initializing services...');

        // Initialize offline queue (includes network monitoring)
        await offlineQueue.init();
        console.log('[App] Offline queue initialized');

        // Cleanup old recording backups
        const cleanupResult = await recordingBackupService.cleanup();
        console.log('[App] Recording backup cleanup:', cleanupResult);

        // Initialize push notifications
        const notificationsInitialized = await notificationService.init();
        console.log('[App] Notifications initialized:', notificationsInitialized);

        servicesInitialized.current = true;
        console.log('[App] All services initialized');
      } catch (error) {
        console.error('[App] Failed to initialize services:', error);
      }
    };

    initializeServices();

    // Handle app state changes for background sync
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        console.log('[App] App came to foreground, processing offline queue...');
        offlineQueue.processQueue();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <Provider store={store}>
          <PersistGate loading={<LoadingScreen />} persistor={persistor}>
            <SafeAreaProvider>
              <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
              <AppNavigator />
              <AccessibilitySetupModal />
            </SafeAreaProvider>
          </PersistGate>
        </Provider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});

export default App;
