package ai.myleadx.app.callrecording;

import android.content.Context;
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
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Calendar;
import java.util.TimeZone;
import java.util.concurrent.TimeUnit;

import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;

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

            @Override
            public void onCallAnswered() {
                Log.d(TAG, "Callback: Call answered (OFFHOOK) - emitting onCallAnswered");
                sendEvent("onCallAnswered", Arguments.createMap());
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
            // iQOO/Vivo/Funtouch OS (FOUND ON THIS DEVICE)
            Environment.getExternalStorageDirectory() + "/Recordings/Record/Call",
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
            // Vivo alternate
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

                            // Check if this recording was made in the last 5 minutes
                            long ageMs = System.currentTimeMillis() - file.lastModified();
                            if (ageMs > 300000) { // older than 5 minutes, skip
                                continue;
                            }

                            // Match by phone number in filename OR by being the most recent file
                            // iQOO/Vivo uses contact name in filename (e.g., "Baaji ( vertilink) 2026-04-03 17-23-57.m4a")
                            // Other phones use phone number (e.g., "+919885634152_20260304_122705.m4a")
                            boolean matches = false;

                            // Check phone number match
                            if (fileName.contains(normalizedPhone) || file.getName().contains(normalizedPhone)) {
                                matches = true;
                                Log.d(TAG, "Phone number match: " + file.getName());
                            }

                            // If no phone match, use the MOST RECENT recording (within 5 min)
                            // This handles devices that use contact names instead of phone numbers
                            if (!matches && file.lastModified() > latestModified) {
                                matches = true;
                                Log.d(TAG, "Using most recent recording (no phone match): " + file.getName());
                            }

                            if (matches) {
                                Log.d(TAG, "Found matching recording: " + file.getAbsolutePath());
                                Log.d(TAG, "File modified: " + file.lastModified() + ", size: " + file.length() + ", age: " + (ageMs / 1000) + "s");

                                if (file.lastModified() > latestModified) {
                                    latestModified = file.lastModified();
                                    foundRecording = file;
                                    Log.d(TAG, "This is the most recent matching recording");
                                }
                            }
                        }
                    }
                }
            }
        }

        // If direct file search didn't find anything, try MediaStore API
        // (required for Android 11+ scoped storage)
        if (foundRecording == null) {
            Log.d(TAG, "Direct file search failed, trying MediaStore API...");
            try {
                foundRecording = findViaMediaStore(normalizedPhone);
            } catch (Exception e) {
                Log.e(TAG, "MediaStore search failed: " + e.getMessage());
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

    /**
     * Search for call recordings using MediaStore API (works on Android 11+ with scoped storage)
     * Finds the most recent audio file in call recording directories within the last 5 minutes
     */
    private File findViaMediaStore(String normalizedPhone) {
        ContentResolver resolver = getReactApplicationContext().getContentResolver();
        Uri audioUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;

        // Query for recent audio files (last 5 minutes)
        long fiveMinAgo = (System.currentTimeMillis() / 1000) - 300;

        String selection = MediaStore.Audio.Media.DATE_MODIFIED + " > ?";
        String[] selectionArgs = { String.valueOf(fiveMinAgo) };
        String sortOrder = MediaStore.Audio.Media.DATE_MODIFIED + " DESC";

        String[] projection = {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.DATA,
            MediaStore.Audio.Media.DATE_MODIFIED,
            MediaStore.Audio.Media.SIZE,
            MediaStore.Audio.Media.RELATIVE_PATH,
        };

        Cursor cursor = null;
        try {
            cursor = resolver.query(audioUri, projection, selection, selectionArgs, sortOrder);
            if (cursor != null) {
                Log.d(TAG, "MediaStore: found " + cursor.getCount() + " recent audio files");

                while (cursor.moveToNext()) {
                    String displayName = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME));
                    String data = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA));
                    long dateModified = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED));
                    long size = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE));
                    String relativePath = "";
                    try {
                        relativePath = cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.RELATIVE_PATH));
                    } catch (Exception e) {}

                    Log.d(TAG, "MediaStore file: " + displayName + " path=" + relativePath + " data=" + data + " size=" + size);

                    // Check if this is a call recording (by path or name)
                    String lowerPath = (relativePath + "/" + displayName).toLowerCase();
                    boolean isCallRecording = lowerPath.contains("call") || lowerPath.contains("record/call") ||
                                              lowerPath.contains("recordings/record");

                    if (isCallRecording && data != null) {
                        File file = new File(data);
                        if (file.exists() && file.length() > 1000) {
                            Log.d(TAG, "MediaStore: FOUND call recording: " + data);
                            return file;
                        } else if (!file.exists()) {
                            // Scoped storage: copy via ContentResolver
                            Log.d(TAG, "MediaStore: File not directly accessible, copying via URI...");
                            long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID));
                            Uri contentUri = Uri.withAppendedPath(audioUri, String.valueOf(id));

                            File outputDir = new File(getReactApplicationContext().getFilesDir(), "recordings");
                            if (!outputDir.exists()) outputDir.mkdirs();
                            File outputFile = new File(outputDir, "system_" + displayName);

                            try (InputStream in = resolver.openInputStream(contentUri);
                                 FileOutputStream out = new FileOutputStream(outputFile)) {
                                byte[] buffer = new byte[8192];
                                int len;
                                while ((len = in.read(buffer)) != -1) {
                                    out.write(buffer, 0, len);
                                }
                                Log.d(TAG, "MediaStore: Copied to " + outputFile.getAbsolutePath() + " (" + outputFile.length() + " bytes)");
                                return outputFile;
                            } catch (Exception e) {
                                Log.e(TAG, "MediaStore: Failed to copy: " + e.getMessage());
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "MediaStore query failed: " + e.getMessage());
        } finally {
            if (cursor != null) cursor.close();
        }

        return null;
    }

    /**
     * Clean up old recordings from device storage.
     * Deletes recordings older than specified hours.
     * Call this to free up storage space after recordings are uploaded.
     */
    @ReactMethod
    public void cleanupOldRecordings(int hoursOld, Promise promise) {
        Log.d(TAG, "========== CLEANING UP OLD RECORDINGS ==========");
        Log.d(TAG, "Deleting recordings older than " + hoursOld + " hours");

        int deletedCount = 0;
        long totalFreedBytes = 0;
        long cutoffTime = System.currentTimeMillis() - (hoursOld * 60 * 60 * 1000L);

        // Clean app recordings directory
        File recordingsDir = new File(getReactApplicationContext().getFilesDir(), "recordings");
        if (recordingsDir.exists() && recordingsDir.isDirectory()) {
            File[] files = recordingsDir.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.isFile() && file.lastModified() < cutoffTime) {
                        long fileSize = file.length();
                        String fileName = file.getName();
                        if (file.delete()) {
                            deletedCount++;
                            totalFreedBytes += fileSize;
                            Log.d(TAG, "Deleted: " + fileName + " (" + fileSize + " bytes)");
                        }
                    }
                }
            }
        }

        // Clean accessibility recordings directory
        File accessibilityDir = new File(getReactApplicationContext().getFilesDir(), "accessibility_recordings");
        if (accessibilityDir.exists() && accessibilityDir.isDirectory()) {
            File[] files = accessibilityDir.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.isFile() && file.lastModified() < cutoffTime) {
                        long fileSize = file.length();
                        String fileName = file.getName();
                        if (file.delete()) {
                            deletedCount++;
                            totalFreedBytes += fileSize;
                            Log.d(TAG, "Deleted: " + fileName + " (" + fileSize + " bytes)");
                        }
                    }
                }
            }
        }

        Log.d(TAG, "Cleanup complete: " + deletedCount + " files deleted, " + (totalFreedBytes / 1024 / 1024) + " MB freed");

        WritableMap result = Arguments.createMap();
        result.putInt("deletedCount", deletedCount);
        result.putDouble("freedBytes", totalFreedBytes);
        result.putDouble("freedMB", totalFreedBytes / 1024.0 / 1024.0);
        promise.resolve(result);
    }

    /**
     * Get storage info for recordings directories
     */
    @ReactMethod
    public void getRecordingsStorageInfo(Promise promise) {
        long totalSize = 0;
        int fileCount = 0;

        // Check app recordings directory
        File recordingsDir = new File(getReactApplicationContext().getFilesDir(), "recordings");
        if (recordingsDir.exists() && recordingsDir.isDirectory()) {
            File[] files = recordingsDir.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.isFile()) {
                        totalSize += file.length();
                        fileCount++;
                    }
                }
            }
        }

        // Check accessibility recordings directory
        File accessibilityDir = new File(getReactApplicationContext().getFilesDir(), "accessibility_recordings");
        if (accessibilityDir.exists() && accessibilityDir.isDirectory()) {
            File[] files = accessibilityDir.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.isFile()) {
                        totalSize += file.length();
                        fileCount++;
                    }
                }
            }
        }

        WritableMap result = Arguments.createMap();
        result.putInt("fileCount", fileCount);
        result.putDouble("totalBytes", totalSize);
        result.putDouble("totalMB", totalSize / 1024.0 / 1024.0);
        promise.resolve(result);
    }

    /**
     * Schedule automatic cleanup at 11 PM IST daily
     */
    @ReactMethod
    public void scheduleNightlyCleanup(Promise promise) {
        Log.d(TAG, "========== SCHEDULING NIGHTLY CLEANUP ==========");

        try {
            // Calculate initial delay to 11 PM IST
            Calendar now = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
            Calendar target = (Calendar) now.clone();
            target.set(Calendar.HOUR_OF_DAY, 23); // 11 PM
            target.set(Calendar.MINUTE, 0);
            target.set(Calendar.SECOND, 0);

            // If it's already past 11 PM, schedule for tomorrow
            if (now.after(target)) {
                target.add(Calendar.DAY_OF_MONTH, 1);
            }

            long initialDelayMs = target.getTimeInMillis() - now.getTimeInMillis();
            long initialDelayMinutes = initialDelayMs / (60 * 1000);

            Log.d(TAG, "Current time (IST): " + now.getTime());
            Log.d(TAG, "Target time (IST): " + target.getTime());
            Log.d(TAG, "Initial delay: " + initialDelayMinutes + " minutes");

            // Create periodic work request (every 24 hours)
            PeriodicWorkRequest cleanupWork = new PeriodicWorkRequest.Builder(
                    RecordingCleanupWorker.class,
                    24, TimeUnit.HOURS
                )
                .setInitialDelay(initialDelayMinutes, TimeUnit.MINUTES)
                .addTag("recording_cleanup")
                .build();

            // Schedule with WorkManager
            WorkManager.getInstance(getReactApplicationContext())
                .enqueueUniquePeriodicWork(
                    "nightly_recording_cleanup",
                    ExistingPeriodicWorkPolicy.UPDATE,
                    cleanupWork
                );

            Log.d(TAG, "Nightly cleanup scheduled successfully");

            WritableMap result = Arguments.createMap();
            result.putString("status", "scheduled");
            result.putDouble("initialDelayMinutes", initialDelayMinutes);
            result.putString("nextRunTime", target.getTime().toString());
            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule cleanup: " + e.getMessage(), e);
            promise.reject("SCHEDULE_ERROR", "Failed to schedule cleanup: " + e.getMessage());
        }
    }

    /**
     * Cancel scheduled nightly cleanup
     */
    @ReactMethod
    public void cancelNightlyCleanup(Promise promise) {
        try {
            WorkManager.getInstance(getReactApplicationContext())
                .cancelUniqueWork("nightly_recording_cleanup");
            Log.d(TAG, "Nightly cleanup cancelled");
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CANCEL_ERROR", e.getMessage());
        }
    }

    /**
     * Schedule hourly cleanup that runs every 1 hour and reports to server
     */
    @ReactMethod
    public void scheduleHourlyCleanup(String apiUrl, String authToken, Promise promise) {
        Log.d(TAG, "========== SCHEDULING HOURLY CLEANUP ==========");
        Log.d(TAG, "API URL: " + apiUrl);

        try {
            // Store API credentials for the worker to use
            getReactApplicationContext()
                .getSharedPreferences("cleanup_prefs", Context.MODE_PRIVATE)
                .edit()
                .putString("api_url", apiUrl)
                .putString("auth_token", authToken)
                .apply();

            // Create periodic work request (every 1 hour)
            PeriodicWorkRequest cleanupWork = new PeriodicWorkRequest.Builder(
                    HourlyCleanupWorker.class,
                    1, TimeUnit.HOURS
                )
                .addTag("hourly_recording_cleanup")
                .build();

            // Schedule with WorkManager
            WorkManager.getInstance(getReactApplicationContext())
                .enqueueUniquePeriodicWork(
                    "hourly_recording_cleanup",
                    ExistingPeriodicWorkPolicy.UPDATE,
                    cleanupWork
                );

            Log.d(TAG, "Hourly cleanup scheduled successfully");

            WritableMap result = Arguments.createMap();
            result.putString("status", "scheduled");
            result.putString("interval", "1 hour");
            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule hourly cleanup: " + e.getMessage(), e);
            promise.reject("SCHEDULE_ERROR", "Failed to schedule cleanup: " + e.getMessage());
        }
    }

    /**
     * Cancel scheduled hourly cleanup
     */
    @ReactMethod
    public void cancelHourlyCleanup(Promise promise) {
        try {
            WorkManager.getInstance(getReactApplicationContext())
                .cancelUniqueWork("hourly_recording_cleanup");
            Log.d(TAG, "Hourly cleanup cancelled");
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CANCEL_ERROR", e.getMessage());
        }
    }
}
