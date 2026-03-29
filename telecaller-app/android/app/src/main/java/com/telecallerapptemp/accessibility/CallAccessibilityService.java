package com.telecallerapptemp.accessibility;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.telephony.TelephonyManager;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Accessibility Service for Call Recording
 *
 * This service uses Android's Accessibility API to detect call states
 * and record calls using MediaRecorder with VOICE_COMMUNICATION source.
 *
 * User must manually enable this service in:
 * Settings -> Accessibility -> Installed Services -> VoiceBridge Call Recording
 */
public class CallAccessibilityService extends AccessibilityService {
    private static final String TAG = "CallAccessibilityService";

    private static CallAccessibilityService instance;
    private static boolean isServiceEnabled = false;

    private MediaRecorder mediaRecorder;
    private boolean isRecording = false;
    private String currentRecordingPath;
    private long recordingStartTime;
    private String currentPhoneNumber;

    // Callback for React Native
    private static RecordingCallback recordingCallback;

    public interface RecordingCallback {
        void onRecordingStarted(String path, String phoneNumber);
        void onRecordingStopped(String path, long duration, String phoneNumber);
        void onRecordingError(String error);
    }

    public static void setRecordingCallback(RecordingCallback callback) {
        recordingCallback = callback;
    }

    public static CallAccessibilityService getInstance() {
        return instance;
    }

    public static boolean isServiceEnabled() {
        return isServiceEnabled && instance != null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        Log.d(TAG, "========== ACCESSIBILITY SERVICE CREATED ==========");
    }

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        isServiceEnabled = true;

        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED |
                         AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED |
                         AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.notificationTimeout = 100;
        info.packageNames = null; // Monitor all packages
        info.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS |
                    AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS |
                    AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS;

        setServiceInfo(info);

        Log.d(TAG, "========== ACCESSIBILITY SERVICE CONNECTED ==========");
        Log.d(TAG, "Call recording via Accessibility Service is now ENABLED");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        String packageName = event.getPackageName() != null ? event.getPackageName().toString() : "";

        // Detect phone/dialer apps
        if (isPhoneApp(packageName)) {
            handlePhoneEvent(event, packageName);
        }
    }

    private boolean isPhoneApp(String packageName) {
        return packageName.contains("dialer") ||
               packageName.contains("phone") ||
               packageName.contains("incallui") ||
               packageName.contains("telecom") ||
               packageName.equals("com.android.server.telecom") ||
               packageName.equals("com.google.android.dialer") ||
               packageName.equals("com.samsung.android.dialer") ||
               packageName.equals("com.miui.phone");
    }

    private void handlePhoneEvent(AccessibilityEvent event, String packageName) {
        int eventType = event.getEventType();
        String className = event.getClassName() != null ? event.getClassName().toString() : "";
        String text = event.getText() != null ? event.getText().toString() : "";

        Log.d(TAG, "Phone event: type=" + eventType + ", package=" + packageName + ", class=" + className);

        // Detect call screen appearing (call started)
        if (className.toLowerCase().contains("incall") ||
            className.toLowerCase().contains("callscreen") ||
            text.toLowerCase().contains("ongoing call") ||
            text.toLowerCase().contains("dialing")) {

            if (!isRecording) {
                Log.d(TAG, "========== CALL DETECTED - STARTING RECORDING ==========");
                startRecording(null); // Phone number extracted separately if needed
            }
        }

        // Detect call ending
        if ((className.toLowerCase().contains("dialer") && !className.toLowerCase().contains("incall")) ||
            text.toLowerCase().contains("call ended") ||
            text.toLowerCase().contains("call disconnected")) {

            if (isRecording) {
                Log.d(TAG, "========== CALL ENDED - STOPPING RECORDING ==========");
                new Handler(Looper.getMainLooper()).postDelayed(this::stopRecording, 500);
            }
        }
    }

    public void startRecording(String phoneNumber) {
        if (isRecording) {
            Log.w(TAG, "Already recording");
            return;
        }

        currentPhoneNumber = phoneNumber;

        try {
            // Create recordings directory
            File recordingsDir = new File(getFilesDir(), "accessibility_recordings");
            if (!recordingsDir.exists()) {
                recordingsDir.mkdirs();
            }

            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            String filename = "call_" + timestamp + ".m4a";
            File recordingFile = new File(recordingsDir, filename);
            currentRecordingPath = recordingFile.getAbsolutePath();

            Log.d(TAG, "Recording to: " + currentRecordingPath);

            mediaRecorder = new MediaRecorder();

            // Try different audio sources
            boolean sourceSet = false;
            int[] sources = {
                MediaRecorder.AudioSource.VOICE_COMMUNICATION,  // Best for calls
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                MediaRecorder.AudioSource.MIC,
                MediaRecorder.AudioSource.DEFAULT
            };
            String[] sourceNames = {"VOICE_COMMUNICATION", "VOICE_RECOGNITION", "MIC", "DEFAULT"};

            for (int i = 0; i < sources.length && !sourceSet; i++) {
                try {
                    if (i > 0) {
                        mediaRecorder = new MediaRecorder();
                    }
                    mediaRecorder.setAudioSource(sources[i]);
                    Log.d(TAG, "Using audio source: " + sourceNames[i]);
                    sourceSet = true;
                } catch (Exception e) {
                    Log.w(TAG, sourceNames[i] + " failed: " + e.getMessage());
                }
            }

            if (!sourceSet) {
                throw new IOException("No audio source available");
            }

            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            mediaRecorder.setAudioSamplingRate(44100);
            mediaRecorder.setAudioEncodingBitRate(128000);
            mediaRecorder.setOutputFile(currentRecordingPath);

            mediaRecorder.prepare();
            mediaRecorder.start();

            isRecording = true;
            recordingStartTime = System.currentTimeMillis();

            Log.d(TAG, "========== RECORDING STARTED (Accessibility Service) ==========");

            if (recordingCallback != null) {
                recordingCallback.onRecordingStarted(currentRecordingPath, currentPhoneNumber);
            }

        } catch (Exception e) {
            Log.e(TAG, "Failed to start recording: " + e.getMessage(), e);
            cleanupRecorder();
            if (recordingCallback != null) {
                recordingCallback.onRecordingError(e.getMessage());
            }
        }
    }

    public void stopRecording() {
        if (!isRecording || mediaRecorder == null) {
            Log.w(TAG, "Not recording");
            return;
        }

        try {
            mediaRecorder.stop();
            mediaRecorder.release();
            mediaRecorder = null;
            isRecording = false;

            long duration = (System.currentTimeMillis() - recordingStartTime) / 1000;

            Log.d(TAG, "========== RECORDING STOPPED ==========");
            Log.d(TAG, "Path: " + currentRecordingPath);
            Log.d(TAG, "Duration: " + duration + " seconds");

            File file = new File(currentRecordingPath);
            Log.d(TAG, "File size: " + file.length() + " bytes");

            if (recordingCallback != null) {
                recordingCallback.onRecordingStopped(currentRecordingPath, duration, currentPhoneNumber);
            }

        } catch (Exception e) {
            Log.e(TAG, "Error stopping recording: " + e.getMessage(), e);
            if (recordingCallback != null) {
                recordingCallback.onRecordingError(e.getMessage());
            }
        } finally {
            cleanupRecorder();
        }
    }

    private void cleanupRecorder() {
        if (mediaRecorder != null) {
            try {
                mediaRecorder.release();
            } catch (Exception e) {
                // Ignore
            }
            mediaRecorder = null;
        }
        isRecording = false;
    }

    public boolean isCurrentlyRecording() {
        return isRecording;
    }

    public String getCurrentRecordingPath() {
        return currentRecordingPath;
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Accessibility service interrupted");
        if (isRecording) {
            stopRecording();
        }
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "========== ACCESSIBILITY SERVICE DESTROYED ==========");
        if (isRecording) {
            stopRecording();
        }
        isServiceEnabled = false;
        instance = null;
        super.onDestroy();
    }
}
