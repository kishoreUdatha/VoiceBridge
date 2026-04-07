package com.telecallerapptemp.callrecording;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.IBinder;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.core.app.NotificationCompat;

import com.crmleads.telecaller.R;

import android.database.Cursor;
import android.provider.CallLog;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.Executor;

public class CallRecordingService extends Service {
    private static final String TAG = "CallRecordingService";
    private static final String CHANNEL_ID = "CallRecordingChannel";
    private static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_START_RECORDING = "START_RECORDING";
    public static final String ACTION_STOP_RECORDING = "STOP_RECORDING";
    public static final String EXTRA_CALL_ID = "CALL_ID";

    private MediaRecorder mediaRecorder;
    private String currentRecordingPath;
    private boolean isRecording = false;
    private long recordingStartTime;

    // Saved audio routing state so we can restore after the call
    private boolean prevSpeakerphoneOn = false;
    private int prevAudioMode = AudioManager.MODE_NORMAL;
    private boolean audioRoutingChanged = false;
    private long conversationStartTime = 0; // When call is actually answered
    private boolean callAnswered = false;

    // Phone state monitoring
    private TelephonyManager telephonyManager;
    private PhoneStateListener phoneStateListener;
    private TelephonyCallback telephonyCallback; // For Android 12+

    // Static references for accessing from module
    private static CallRecordingService instance;
    private static RecordingCallback callback;

    public interface RecordingCallback {
        void onRecordingStarted(String path);
        void onRecordingStopped(String path, long duration);
        void onRecordingError(String error);
    }

    public static void setCallback(RecordingCallback cb) {
        callback = cb;
    }

    public static CallRecordingService getInstance() {
        return instance;
    }

    public static boolean isServiceRecording() {
        return instance != null && instance.isRecording;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createNotificationChannel();
        telephonyManager = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
        Log.d(TAG, "Service created");
    }

    private void startPhoneStateMonitoring() {
        if (telephonyManager == null) {
            Log.e(TAG, "TelephonyManager is null, cannot monitor call state");
            return;
        }

        Log.d(TAG, "Starting phone state monitoring, SDK version: " + Build.VERSION.SDK_INT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ uses TelephonyCallback
            Log.d(TAG, "Using TelephonyCallback for Android 12+");
            startPhoneStateMonitoringS();
        } else {
            // Older versions use PhoneStateListener
            Log.d(TAG, "Using PhoneStateListener for older Android");
            phoneStateListener = new PhoneStateListener() {
                @Override
                public void onCallStateChanged(int state, String phoneNumber) {
                    Log.d(TAG, "PhoneStateListener.onCallStateChanged: state=" + state + ", phone=" + phoneNumber);
                    handleCallStateChange(state);
                }
            };
            try {
                telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
                Log.d(TAG, "PhoneStateListener registered successfully");
            } catch (SecurityException e) {
                Log.e(TAG, "SecurityException - READ_PHONE_STATE permission not granted: " + e.getMessage());
            }
        }
        Log.d(TAG, "Phone state monitoring started");
    }

    @RequiresApi(api = Build.VERSION_CODES.S)
    private void startPhoneStateMonitoringS() {
        Executor executor = getMainExecutor();

        // Create inner class that properly extends TelephonyCallback AND implements CallStateListener
        telephonyCallback = new MyCallStateCallback();

        try {
            Log.d(TAG, "Registering TelephonyCallback for Android 12+");
            telephonyManager.registerTelephonyCallback(executor, telephonyCallback);
            Log.d(TAG, "TelephonyCallback registered successfully");
        } catch (SecurityException e) {
            Log.e(TAG, "SecurityException - READ_PHONE_STATE permission not granted: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Failed to register telephony callback: " + e.getMessage());
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.S)
    private class MyCallStateCallback extends TelephonyCallback implements TelephonyCallback.CallStateListener {
        @Override
        public void onCallStateChanged(int state) {
            Log.d(TAG, "MyCallStateCallback.onCallStateChanged: " + state);
            handleCallStateChange(state);
        }
    }

    // Track if we've ever seen OFFHOOK state (call in progress)
    private boolean hasSeenOffhook = false;
    private boolean pendingRecordingStart = false;
    private String pendingCallId = null;

    private void handleCallStateChange(int state) {
        Log.d(TAG, "========== CALL STATE CHANGED: " + state + " ==========");
        Log.d(TAG, "isRecording=" + isRecording + ", hasSeenOffhook=" + hasSeenOffhook + ", callAnswered=" + callAnswered + ", pendingRecordingStart=" + pendingRecordingStart);

        switch (state) {
            case TelephonyManager.CALL_STATE_OFFHOOK:
                // Call is in progress (dialing or connected)
                hasSeenOffhook = true;
                Log.d(TAG, "OFFHOOK detected - call is in progress");

                // If recording was deferred, start it now that the call is active
                if (pendingRecordingStart && !isRecording) {
                    Log.d(TAG, "========== STARTING DEFERRED RECORDING ==========");
                    // Small delay to let audio routing settle
                    new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                        actuallyStartRecording(pendingCallId);
                        pendingRecordingStart = false;
                    }, 1500);
                }

                if (!callAnswered) {
                    callAnswered = true;
                    conversationStartTime = System.currentTimeMillis();
                    Log.d(TAG, "========== CALL IN PROGRESS - TRACKING STARTED ==========");
                }
                break;
            case TelephonyManager.CALL_STATE_IDLE:
                // Only auto-stop if we've been in OFFHOOK state AND enough time has passed
                // This prevents stopping on spurious IDLE events or quick state transitions
                Log.d(TAG, "IDLE detected - hasSeenOffhook=" + hasSeenOffhook);

                if (hasSeenOffhook && isRecording) {
                    // Check minimum time since recording started (at least 8 seconds)
                    // This prevents false positives from quick OFFHOOK->IDLE transitions
                    long elapsedSinceStart = (System.currentTimeMillis() - recordingStartTime) / 1000;
                    Log.d(TAG, "Time since recording started: " + elapsedSinceStart + "s");

                    if (elapsedSinceStart < 8) {
                        Log.d(TAG, "IGNORING IDLE - too soon (" + elapsedSinceStart + "s < 8s minimum)");
                        Log.d(TAG, "This may be a false IDLE event - waiting for real call end");
                        break;
                    }

                    Log.d(TAG, "========== CALL ENDED (IDLE after OFFHOOK) - AUTO STOPPING ==========");
                    stopRecording();
                    stopSelf();
                } else if (isRecording) {
                    Log.d(TAG, "IDLE but haven't seen OFFHOOK yet - ignoring (call not started)");
                }
                break;
            case TelephonyManager.CALL_STATE_RINGING:
                Log.d(TAG, "RINGING - incoming call or outgoing is ringing");
                break;
        }
    }

    private void stopPhoneStateMonitoring() {
        if (telephonyManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (telephonyCallback != null) {
                try {
                    telephonyManager.unregisterTelephonyCallback(telephonyCallback);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to unregister telephony callback: " + e.getMessage());
                }
                telephonyCallback = null;
            }
        } else {
            if (phoneStateListener != null) {
                telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE);
                phoneStateListener = null;
            }
        }
        Log.d(TAG, "Phone state monitoring stopped");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            Log.w(TAG, "Null intent received");
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        Log.d(TAG, "onStartCommand action: " + action);

        if (ACTION_START_RECORDING.equals(action)) {
            String callId = intent.getStringExtra(EXTRA_CALL_ID);
            startRecording(callId);
        } else if (ACTION_STOP_RECORDING.equals(action)) {
            stopRecording();
            stopSelf();
        }

        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Call Recording",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows when call is being recorded");
            channel.setSound(null, null);
            channel.enableVibration(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        Intent notificationIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Recording Call")
                .setContentText("Tap to return to app")
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();
    }

    private void startRecording(String callId) {
        Log.d(TAG, "========== SERVICE START RECORDING ==========");
        Log.d(TAG, "Call ID: " + callId);

        if (isRecording) {
            Log.w(TAG, "Already recording");
            if (callback != null) {
                callback.onRecordingError("Already recording");
            }
            return;
        }

        // Reset call state tracking
        callAnswered = false;
        conversationStartTime = 0;
        hasSeenOffhook = false;
        pendingRecordingStart = false;
        pendingCallId = callId;

        // Start phone state monitoring to detect when call is answered
        startPhoneStateMonitoring();

        // Start foreground FIRST to prevent being killed
        startForeground(NOTIFICATION_ID, createNotification());
        Log.d(TAG, "Foreground service started");

        // Prepare the recording file path
        try {
            File recordingsDir = new File(getFilesDir(), "recordings");
            if (!recordingsDir.exists()) {
                recordingsDir.mkdirs();
            }

            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            String filename = "call_" + callId + "_" + timestamp + ".m4a";
            File recordingFile = new File(recordingsDir, filename);
            currentRecordingPath = recordingFile.getAbsolutePath();
            Log.d(TAG, "Will record to: " + currentRecordingPath);

            // DEFER actual recording until call is OFFHOOK (connected)
            // This prevents the phone app from stealing the microphone
            pendingRecordingStart = true;

            // Report the path immediately so JS side has it
            if (callback != null) {
                callback.onRecordingStarted(currentRecordingPath);
            }

            // Fallback: if OFFHOOK doesn't fire within 10 seconds, start recording anyway
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                if (pendingRecordingStart && !isRecording) {
                    Log.d(TAG, "========== FALLBACK: Starting recording after 10s timeout ==========");
                    actuallyStartRecording(callId);
                    pendingRecordingStart = false;
                }
            }, 10000);

        } catch (Exception e) {
            Log.e(TAG, "Recording setup failed: " + e.getMessage(), e);
            stopForeground(true);
            if (callback != null) {
                callback.onRecordingError(e.getMessage());
            }
        }
    }

    /**
     * Actually start the MediaRecorder. Called when call is OFFHOOK (connected).
     * Starting recording during an active call gives MIC access since the audio
     * routing is already set up for the call.
     */
    private void actuallyStartRecording(String callId) {
        if (isRecording) {
            Log.d(TAG, "Already recording, skipping actuallyStartRecording");
            return;
        }

        Log.d(TAG, "========== ACTUALLY STARTING RECORDING ==========");
        Log.d(TAG, "Call ID: " + callId);
        Log.d(TAG, "Output path: " + currentRecordingPath);

        // Try audio sources - VOICE_COMMUNICATION first (works during active calls on many devices)
        int[] audioSources = {
            MediaRecorder.AudioSource.VOICE_COMMUNICATION,
            MediaRecorder.AudioSource.VOICE_CALL,
            MediaRecorder.AudioSource.MIC,
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
        };
        String[] sourceNames = {"VOICE_COMMUNICATION", "VOICE_CALL", "MIC", "VOICE_RECOGNITION"};

        boolean recordingStarted = false;
        for (int i = 0; i < audioSources.length && !recordingStarted; i++) {
            try {
                mediaRecorder = new MediaRecorder();
                mediaRecorder.setAudioSource(audioSources[i]);
                mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
                mediaRecorder.setAudioSamplingRate(44100);
                mediaRecorder.setAudioEncodingBitRate(128000);
                mediaRecorder.setOutputFile(currentRecordingPath);
                mediaRecorder.prepare();
                mediaRecorder.start();
                Log.d(TAG, "SUCCESS: Recording started with " + sourceNames[i] + " during active call");
                recordingStarted = true;
            } catch (Exception e) {
                Log.w(TAG, sourceNames[i] + " failed during active call: " + e.getMessage());
                try { mediaRecorder.release(); } catch (Exception ignored) {}
                mediaRecorder = null;
            }
        }

        if (recordingStarted) {
            isRecording = true;
            recordingStartTime = System.currentTimeMillis();
            Log.d(TAG, "========== RECORDING STARTED DURING ACTIVE CALL ==========");
        } else {
            Log.e(TAG, "All audio sources failed during active call");
            // Don't stop the service - we still want to track call state
        }
    }

    private void stopRecording() {
        Log.d(TAG, "========== SERVICE STOP RECORDING ==========");

        // Stop phone state monitoring
        stopPhoneStateMonitoring();

        if (!isRecording || mediaRecorder == null) {
            Log.w(TAG, "Not recording");
            stopForeground(true);
            return;
        }

        try {
            mediaRecorder.stop();
            mediaRecorder.release();
            mediaRecorder = null;
            isRecording = false;

            // Wait for CallLog to be updated (system needs time to write the call record)
            // Use longer delays as some phones are slow to write CallLog
            long duration = -1;
            Log.d(TAG, "========== STARTING CALLLOG QUERY ==========");
            Log.d(TAG, "callAnswered=" + callAnswered + ", conversationStartTime=" + conversationStartTime);

            // Retry with increasing delays: 3s, 2s, 2s, 2s, 2s = 11 seconds total
            int[] delays = {3000, 2000, 2000, 2000, 2000};

            for (int attempt = 1; attempt <= delays.length; attempt++) {
                int delayMs = delays[attempt - 1];
                Log.d(TAG, "CallLog attempt " + attempt + "/" + delays.length + ", waiting " + delayMs + "ms...");

                try {
                    Thread.sleep(delayMs);
                } catch (InterruptedException e) {
                    Log.w(TAG, "Sleep interrupted");
                }

                duration = getLastCallDurationFromCallLog();
                Log.d(TAG, "CallLog attempt " + attempt + " returned: " + duration + "s");

                if (duration > 0) {
                    Log.d(TAG, "SUCCESS: CallLog query succeeded on attempt " + attempt + " with duration " + duration + "s");
                    break;
                }
            }

            Log.d(TAG, "========== CALLLOG QUERY COMPLETE ==========");
            Log.d(TAG, "Final CallLog result: " + duration + "s");

            Log.d(TAG, "========== DETERMINING FINAL DURATION ==========");
            if (duration > 0) {
                Log.d(TAG, "USING CALLLOG DURATION: " + duration + "s (most accurate)");
            } else {
                Log.w(TAG, "CallLog query FAILED - duration was " + duration);
                // For OUTGOING calls, OFFHOOK doesn't help because it triggers at call initiation, not answer
                // So we should NOT use conversationStartTime for outgoing calls
                // Last fallback: use recording duration (this includes ringing time - not ideal)
                long recordingDuration = (System.currentTimeMillis() - recordingStartTime) / 1000;
                Log.w(TAG, "FALLBACK: Using recording duration: " + recordingDuration + "s");
                Log.w(TAG, "NOTE: This includes ringing time which is NOT ideal for outgoing calls");
                Log.w(TAG, "Please check READ_CALL_LOG permission is granted in app settings");
                duration = recordingDuration;
            }

            File file = new File(currentRecordingPath);
            Log.d(TAG, "Recording saved: " + currentRecordingPath);
            Log.d(TAG, "Call answered: " + callAnswered);
            Log.d(TAG, "Final duration: " + duration + "s, Size: " + file.length() + " bytes");

            if (callback != null) {
                callback.onRecordingStopped(currentRecordingPath, duration);
            }

        } catch (Exception e) {
            Log.e(TAG, "Stop failed: " + e.getMessage(), e);
            if (callback != null) {
                callback.onRecordingError(e.getMessage());
            }
        } finally {
            cleanupRecorder();
            stopForeground(true);
        }
    }

    /**
     * Query Android's CallLog to get the accurate duration of the most recent outgoing call.
     * The CallLog always has the correct conversation duration (excluding ringing time).
     */
    private long getLastCallDurationFromCallLog() {
        Log.d(TAG, "getLastCallDurationFromCallLog() called");
        Cursor cursor = null;

        try {
            String[] projection = new String[]{
                CallLog.Calls.DURATION,
                CallLog.Calls.DATE,
                CallLog.Calls.NUMBER,
                CallLog.Calls.TYPE
            };

            // Query only outgoing calls, most recent first
            String selection = CallLog.Calls.TYPE + " = ?";
            String[] selectionArgs = new String[]{ String.valueOf(CallLog.Calls.OUTGOING_TYPE) };

            Log.d(TAG, "Querying CallLog for outgoing calls...");

            cursor = getContentResolver().query(
                CallLog.Calls.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                CallLog.Calls.DATE + " DESC"
            );

            Log.d(TAG, "CallLog query returned cursor: " + (cursor != null ? "not null, count=" + cursor.getCount() : "null"));

            if (cursor != null && cursor.moveToFirst()) {
                int durationIndex = cursor.getColumnIndex(CallLog.Calls.DURATION);
                int dateIndex = cursor.getColumnIndex(CallLog.Calls.DATE);
                int numberIndex = cursor.getColumnIndex(CallLog.Calls.NUMBER);

                long duration = cursor.getLong(durationIndex);
                long date = cursor.getLong(dateIndex);
                String number = cursor.getString(numberIndex);

                // Verify this is a recent call (within last 5 minutes)
                long timeSinceCall = System.currentTimeMillis() - date;
                Log.d(TAG, "CallLog: Found outgoing call:");
                Log.d(TAG, "  - Duration: " + duration + "s");
                Log.d(TAG, "  - Number: " + number);
                Log.d(TAG, "  - Time since call: " + (timeSinceCall/1000) + "s");

                if (timeSinceCall < 300000) { // 5 minutes (extended from 2)
                    Log.d(TAG, "CallLog: Using this call - it's recent enough (" + (timeSinceCall/1000) + "s < 300s)");
                    cursor.close();
                    return duration;
                } else {
                    Log.d(TAG, "CallLog: Call too old (" + (timeSinceCall/1000) + "s >= 300s), skipping");
                }
            } else {
                Log.d(TAG, "CallLog: No outgoing calls found or cursor empty");
            }
        } catch (SecurityException e) {
            Log.e(TAG, "========== CALLLOG PERMISSION ERROR ==========");
            Log.e(TAG, "READ_CALL_LOG permission NOT granted!");
            Log.e(TAG, "Error: " + e.getMessage());
            Log.e(TAG, "Please grant Call Log permission in app settings");
        } catch (Exception e) {
            Log.e(TAG, "========== CALLLOG QUERY ERROR ==========");
            Log.e(TAG, "Error: " + e.getMessage(), e);
        } finally {
            if (cursor != null && !cursor.isClosed()) {
                cursor.close();
            }
        }

        Log.d(TAG, "getLastCallDurationFromCallLog() returning -1 (no valid call found)");
        return -1;
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
        callAnswered = false;
        conversationStartTime = 0;
        hasSeenOffhook = false;
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Service destroyed");
        stopPhoneStateMonitoring();
        cleanupRecorder();
        instance = null;
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
