package com.telecallerapptemp.callrecording;

import android.content.Intent;
import android.os.Build;
import android.os.Environment;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.File;
import java.util.Arrays;
import java.util.Comparator;

import javax.annotation.Nullable;

public class CallRecordingModule extends ReactContextBaseJavaModule {
    private static final String TAG = "CallRecordingModule";
    private static final String MODULE_NAME = "CallRecording";

    private Promise startPromise;
    private Promise stopPromise;
    private String lastRecordingPath;
    private long lastDuration;

    public CallRecordingModule(ReactApplicationContext reactContext) {
        super(reactContext);

        // Set up callback from service
        CallRecordingService.setCallback(new CallRecordingService.RecordingCallback() {
            @Override
            public void onRecordingStarted(String path) {
                Log.d(TAG, "Callback: Recording started at " + path);
                lastRecordingPath = path;
                if (startPromise != null) {
                    startPromise.resolve(path);
                    startPromise = null;
                }
            }

            @Override
            public void onRecordingStopped(String path, long duration) {
                Log.d(TAG, "Callback: Recording stopped, duration: " + duration);
                lastRecordingPath = path;
                lastDuration = duration;

                // If there's a pending promise (manual stop), resolve it
                if (stopPromise != null) {
                    WritableMap result = Arguments.createMap();
                    result.putString("path", path);
                    result.putDouble("duration", duration);
                    stopPromise.resolve(result);
                    stopPromise = null;
                } else {
                    // Auto-stop (call ended) - emit event to React Native
                    Log.d(TAG, "Auto-stop detected, emitting event to React Native");
                    WritableMap eventData = Arguments.createMap();
                    eventData.putString("path", path);
                    eventData.putDouble("duration", duration);
                    sendEvent("onRecordingAutoStopped", eventData);
                }
            }

            @Override
            public void onRecordingError(String error) {
                Log.e(TAG, "Callback: Recording error: " + error);
                if (startPromise != null) {
                    startPromise.reject("RECORDING_ERROR", error);
                    startPromise = null;
                }
                if (stopPromise != null) {
                    stopPromise.reject("RECORDING_ERROR", error);
                    stopPromise = null;
                }
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
    public void startRecording(String callId, Promise promise) {
        Log.d(TAG, "========== START RECORDING (via Service) ==========");
        Log.d(TAG, "Call ID: " + callId);

        if (CallRecordingService.isServiceRecording()) {
            Log.w(TAG, "Already recording");
            promise.reject("ALREADY_RECORDING", "A recording is already in progress");
            return;
        }

        startPromise = promise;

        try {
            Intent serviceIntent = new Intent(getReactApplicationContext(), CallRecordingService.class);
            serviceIntent.setAction(CallRecordingService.ACTION_START_RECORDING);
            serviceIntent.putExtra(CallRecordingService.EXTRA_CALL_ID, callId);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.d(TAG, "Starting foreground service (Android O+)");
                getReactApplicationContext().startForegroundService(serviceIntent);
            } else {
                Log.d(TAG, "Starting service (pre-Android O)");
                getReactApplicationContext().startService(serviceIntent);
            }

            Log.d(TAG, "Service start intent sent");

        } catch (Exception e) {
            Log.e(TAG, "Failed to start service: " + e.getMessage(), e);
            startPromise = null;
            promise.reject("SERVICE_ERROR", "Failed to start recording service: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopRecording(Promise promise) {
        Log.d(TAG, "========== STOP RECORDING (via Service) ==========");

        if (!CallRecordingService.isServiceRecording()) {
            Log.w(TAG, "Not recording");
            promise.reject("NOT_RECORDING", "No recording in progress");
            return;
        }

        stopPromise = promise;

        try {
            Intent serviceIntent = new Intent(getReactApplicationContext(), CallRecordingService.class);
            serviceIntent.setAction(CallRecordingService.ACTION_STOP_RECORDING);
            getReactApplicationContext().startService(serviceIntent);

            Log.d(TAG, "Service stop intent sent");

        } catch (Exception e) {
            Log.e(TAG, "Failed to stop service: " + e.getMessage(), e);
            stopPromise = null;
            promise.reject("SERVICE_ERROR", "Failed to stop recording service: " + e.getMessage());
        }
    }

    @ReactMethod
    public void isRecording(Promise promise) {
        promise.resolve(CallRecordingService.isServiceRecording());
    }

    @ReactMethod
    public void getRecordingPath(Promise promise) {
        if (lastRecordingPath != null && CallRecordingService.isServiceRecording()) {
            promise.resolve(lastRecordingPath);
        } else {
            promise.resolve(null);
        }
    }

    /**
     * Find the phone's built-in call recording for a specific phone number.
     * Looks in common locations like MIUI's call_rec folder.
     * Returns the path to the most recent recording matching the phone number.
     */
    @ReactMethod
    public void findSystemCallRecording(String phoneNumber, Promise promise) {
        Log.d(TAG, "========== FINDING SYSTEM CALL RECORDING ==========");
        Log.d(TAG, "Phone number: " + phoneNumber);

        // Normalize phone number - remove spaces, dashes, +91, etc.
        String normalizedPhone = phoneNumber.replaceAll("[^0-9]", "");
        // Get last 10 digits (Indian phone numbers)
        if (normalizedPhone.length() > 10) {
            normalizedPhone = normalizedPhone.substring(normalizedPhone.length() - 10);
        }
        Log.d(TAG, "Normalized phone: " + normalizedPhone);

        // Common call recording directories on different phones
        String[] possiblePaths = {
            // MIUI/Xiaomi
            Environment.getExternalStorageDirectory() + "/MIUI/sound_recorder/call_rec",
            // Samsung
            Environment.getExternalStorageDirectory() + "/Recordings/Call",
            Environment.getExternalStorageDirectory() + "/Call",
            // OnePlus
            Environment.getExternalStorageDirectory() + "/Recordings",
            // Realme/Oppo
            Environment.getExternalStorageDirectory() + "/Music/Recordings/Call Recordings",
            Environment.getExternalStorageDirectory() + "/Record/Call",
            // Vivo
            Environment.getExternalStorageDirectory() + "/Record/Call",
            // Generic Android
            Environment.getExternalStorageDirectory() + "/CallRecordings",
            Environment.getExternalStorageDirectory() + "/Recorder/Call",
            // Google Dialer
            Environment.getExternalStorageDirectory() + "/Recordings/Call recordings",
        };

        File foundRecording = null;
        long latestModified = 0;

        for (String path : possiblePaths) {
            File dir = new File(path);
            Log.d(TAG, "Checking directory: " + path + " (exists: " + dir.exists() + ")");

            if (dir.exists() && dir.isDirectory()) {
                File[] files = dir.listFiles();
                if (files != null) {
                    Log.d(TAG, "Found " + files.length + " files in " + path);

                    // Sort by last modified (newest first)
                    Arrays.sort(files, (f1, f2) -> Long.compare(f2.lastModified(), f1.lastModified()));

                    for (File file : files) {
                        String fileName = file.getName().toLowerCase();
                        // Check if it's an audio file
                        if (file.isFile() && (fileName.endsWith(".mp3") || fileName.endsWith(".m4a") ||
                            fileName.endsWith(".wav") || fileName.endsWith(".amr") || fileName.endsWith(".3gp"))) {

                            // Check if filename contains the phone number
                            // MIUI format: 9885634152(9885634152)_20260304122705.mp3
                            // Samsung format: +919885634152_20260304_122705.m4a
                            // Generic: Call_9885634152_20260304.mp3
                            if (fileName.contains(normalizedPhone) || file.getName().contains(normalizedPhone)) {
                                Log.d(TAG, "Found matching recording: " + file.getAbsolutePath());
                                Log.d(TAG, "File modified: " + file.lastModified() + ", size: " + file.length());

                                // Check if this recording was made in the last 5 minutes
                                long ageMs = System.currentTimeMillis() - file.lastModified();
                                if (ageMs < 300000) { // 5 minutes
                                    if (file.lastModified() > latestModified) {
                                        latestModified = file.lastModified();
                                        foundRecording = file;
                                        Log.d(TAG, "This is the most recent matching recording");
                                    }
                                } else {
                                    Log.d(TAG, "Recording too old: " + (ageMs / 1000) + "s ago");
                                }
                            }
                        }
                    }
                }
            }
        }

        if (foundRecording != null) {
            String resultPath = foundRecording.getAbsolutePath();
            Log.d(TAG, "========== FOUND SYSTEM RECORDING ==========");
            Log.d(TAG, "Path: " + resultPath);
            Log.d(TAG, "Size: " + foundRecording.length() + " bytes");

            WritableMap result = Arguments.createMap();
            result.putString("path", resultPath);
            result.putDouble("size", foundRecording.length());
            result.putDouble("lastModified", foundRecording.lastModified());
            promise.resolve(result);
        } else {
            Log.d(TAG, "No system call recording found for " + phoneNumber);
            promise.resolve(null);
        }
    }
}
