package ai.myleadx.app.accessibility;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import javax.annotation.Nullable;

/**
 * React Native module for managing Accessibility Service for call recording
 */
public class AccessibilityModule extends ReactContextBaseJavaModule {
    private static final String TAG = "AccessibilityModule";
    private static final String MODULE_NAME = "AccessibilityRecording";

    private final ReactApplicationContext reactContext;

    public AccessibilityModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;

        // Set up callback from accessibility service
        CallAccessibilityService.setRecordingCallback(new CallAccessibilityService.RecordingCallback() {
            @Override
            public void onRecordingStarted(String path, String phoneNumber) {
                Log.d(TAG, "Recording started: " + path);
                WritableMap params = Arguments.createMap();
                params.putString("path", path);
                params.putString("phoneNumber", phoneNumber);
                sendEvent("onAccessibilityRecordingStarted", params);
            }

            @Override
            public void onRecordingStopped(String path, long duration, String phoneNumber) {
                Log.d(TAG, "Recording stopped: " + path + ", duration: " + duration);
                WritableMap params = Arguments.createMap();
                params.putString("path", path);
                params.putDouble("duration", duration);
                params.putString("phoneNumber", phoneNumber);
                sendEvent("onAccessibilityRecordingStopped", params);
            }

            @Override
            public void onRecordingError(String error) {
                Log.e(TAG, "Recording error: " + error);
                WritableMap params = Arguments.createMap();
                params.putString("error", error);
                sendEvent("onAccessibilityRecordingError", params);
            }
        });
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        } catch (Exception e) {
            Log.e(TAG, "Error sending event: " + e.getMessage());
        }
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Required for RN event emitter
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        // Required for RN event emitter
    }

    /**
     * Check if accessibility service is enabled
     */
    @ReactMethod
    public void isAccessibilityEnabled(Promise promise) {
        try {
            boolean enabled = isAccessibilityServiceEnabled();
            Log.d(TAG, "Accessibility service enabled: " + enabled);
            promise.resolve(enabled);
        } catch (Exception e) {
            Log.e(TAG, "Error checking accessibility: " + e.getMessage());
            promise.reject("ERROR", e.getMessage());
        }
    }

    /**
     * Open accessibility settings for user to enable the service
     */
    @ReactMethod
    public void openAccessibilitySettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error opening settings: " + e.getMessage());
            promise.reject("ERROR", e.getMessage());
        }
    }

    /**
     * Check if currently recording
     */
    @ReactMethod
    public void isRecording(Promise promise) {
        CallAccessibilityService service = CallAccessibilityService.getInstance();
        if (service != null) {
            promise.resolve(service.isCurrentlyRecording());
        } else {
            promise.resolve(false);
        }
    }

    /**
     * Get current recording path
     */
    @ReactMethod
    public void getRecordingPath(Promise promise) {
        CallAccessibilityService service = CallAccessibilityService.getInstance();
        if (service != null) {
            promise.resolve(service.getCurrentRecordingPath());
        } else {
            promise.resolve(null);
        }
    }

    /**
     * Manually start recording (if service is enabled)
     */
    @ReactMethod
    public void startRecording(String phoneNumber, Promise promise) {
        CallAccessibilityService service = CallAccessibilityService.getInstance();
        if (service != null && CallAccessibilityService.isServiceEnabled()) {
            service.startRecording(phoneNumber);
            promise.resolve(true);
        } else {
            promise.reject("SERVICE_NOT_ENABLED", "Accessibility service is not enabled");
        }
    }

    /**
     * Manually stop recording
     */
    @ReactMethod
    public void stopRecording(Promise promise) {
        CallAccessibilityService service = CallAccessibilityService.getInstance();
        if (service != null) {
            service.stopRecording();
            promise.resolve(true);
        } else {
            promise.resolve(false);
        }
    }

    /**
     * Check if the accessibility service is enabled in system settings
     */
    private boolean isAccessibilityServiceEnabled() {
        String serviceName = reactContext.getPackageName() + "/" +
                            CallAccessibilityService.class.getCanonicalName();

        try {
            int enabled = Settings.Secure.getInt(
                reactContext.getContentResolver(),
                Settings.Secure.ACCESSIBILITY_ENABLED, 0
            );

            if (enabled != 1) {
                return false;
            }

            String enabledServices = Settings.Secure.getString(
                reactContext.getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            );

            if (enabledServices != null) {
                TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
                splitter.setString(enabledServices);

                while (splitter.hasNext()) {
                    String service = splitter.next();
                    ComponentName componentName = ComponentName.unflattenFromString(service);
                    if (componentName != null) {
                        String enabledServiceName = componentName.getPackageName() + "/" +
                                                   componentName.getClassName();
                        if (enabledServiceName.equalsIgnoreCase(serviceName)) {
                            return true;
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking accessibility service: " + e.getMessage());
        }

        return false;
    }
}
