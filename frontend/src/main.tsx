import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { store } from './store';
import ErrorBoundary from './components/ErrorBoundary';
import { BrandingProvider } from './contexts/BrandingContext';
import './index.css';

// Initialize i18n
import './i18n';

// Initialize Error Tracking
import { errorTracker } from './utils/errorTracking';
errorTracker.init();

// Register Service Worker for PWA (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // Unregister service workers in development to avoid caching issues
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('SW unregistered for development');
    });
  });
}

// Loading fallback component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      <p className="text-slate-500 text-sm">Loading...</p>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <Provider store={store}>
          <BrowserRouter>
            <BrandingProvider>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </BrandingProvider>
          </BrowserRouter>
        </Provider>
      </Suspense>
    </ErrorBoundary>
  // </React.StrictMode>
);
