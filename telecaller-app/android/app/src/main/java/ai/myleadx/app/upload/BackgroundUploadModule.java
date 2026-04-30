package ai.myleadx.app.upload;

import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import javax.annotation.Nullable;

public class BackgroundUploadModule extends ReactContextBaseJavaModule {
    private static final String TAG = "BackgroundUploadModule";
    private static final String MODULE_NAME = "BackgroundUpload";

    public BackgroundUploadModule(ReactApplicationContext reactContext) {
        super(reactContext);

        // Set up callback from service
        BackgroundUploadService.setCallback(new BackgroundUploadService.UploadCallback() {
            @Override
            public void onUploadProgress(String callId, int progress) {
                Log.d(TAG, "Upload progress: " + callId + " - " + progress + "%");
                WritableMap params = Arguments.createMap();
                params.putString("callId", callId);
                params.putInt("progress", progress);
                sendEvent("onUploadProgress", params);
            }

            @Override
            public void onUploadSuccess(String callId, String recordingUrl) {
                Log.d(TAG, "Upload success: " + callId + " - " + recordingUrl);
                WritableMap params = Arguments.createMap();
                params.putString("callId", callId);
                params.putString("recordingUrl", recordingUrl);
                sendEvent("onUploadSuccess", params);
            }

            @Override
            public void onUploadError(String callId, String error) {
                Log.e(TAG, "Upload error: " + callId + " - " + error);
                WritableMap params = Arguments.createMap();
                params.putString("callId", callId);
                params.putString("error", error);
                sendEvent("onUploadError", params);
            }
        });
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        try {
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
            Log.d(TAG, "Event sent: " + eventName);
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

    @ReactMethod
    public void uploadRecording(String filePath, String callId, String dataId, int duration, String apiUrl, String authToken, Promise promise) {
        Log.d(TAG, "========== BACKGROUND UPLOAD START ==========");
        Log.d(TAG, "File: " + filePath);
        Log.d(TAG, "Call ID: " + callId);
        Log.d(TAG, "Data ID: " + dataId);
        Log.d(TAG, "Duration: " + duration);
        Log.d(TAG, "API URL: " + apiUrl);

        try {
            Intent serviceIntent = new Intent(getReactApplicationContext(), BackgroundUploadService.class);
            serviceIntent.setAction(BackgroundUploadService.ACTION_UPLOAD);
            serviceIntent.putExtra(BackgroundUploadService.EXTRA_FILE_PATH, filePath);
            serviceIntent.putExtra(BackgroundUploadService.EXTRA_CALL_ID, callId);
            serviceIntent.putExtra(BackgroundUploadService.EXTRA_DATA_ID, dataId);
            serviceIntent.putExtra(BackgroundUploadService.EXTRA_DURATION, duration);
            serviceIntent.putExtra(BackgroundUploadService.EXTRA_API_URL, apiUrl);
            serviceIntent.putExtra(BackgroundUploadService.EXTRA_AUTH_TOKEN, authToken);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.d(TAG, "Starting foreground service (Android O+)");
                getReactApplicationContext().startForegroundService(serviceIntent);
            } else {
                Log.d(TAG, "Starting service (pre-Android O)");
                getReactApplicationContext().startService(serviceIntent);
            }

            Log.d(TAG, "Background upload service started");
            promise.resolve(true);

        } catch (Exception e) {
            Log.e(TAG, "Failed to start upload service: " + e.getMessage(), e);
            promise.reject("UPLOAD_SERVICE_ERROR", "Failed to start upload service: " + e.getMessage());
        }
    }
}
