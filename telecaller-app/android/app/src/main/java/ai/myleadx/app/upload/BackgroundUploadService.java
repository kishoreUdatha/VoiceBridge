package ai.myleadx.app.upload;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.File;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class BackgroundUploadService extends Service {
    private static final String TAG = "BackgroundUploadService";
    private static final String CHANNEL_ID = "BackgroundUploadChannel";
    private static final int NOTIFICATION_ID = 2001;

    public static final String ACTION_UPLOAD = "UPLOAD_RECORDING";
    public static final String EXTRA_FILE_PATH = "FILE_PATH";
    public static final String EXTRA_CALL_ID = "CALL_ID";
    public static final String EXTRA_DATA_ID = "DATA_ID";
    public static final String EXTRA_DURATION = "DURATION";
    public static final String EXTRA_API_URL = "API_URL";
    public static final String EXTRA_AUTH_TOKEN = "AUTH_TOKEN";

    private static BackgroundUploadService instance;
    private static UploadCallback callback;
    private PowerManager.WakeLock wakeLock;
    private OkHttpClient httpClient;

    public interface UploadCallback {
        void onUploadProgress(String callId, int progress);
        void onUploadSuccess(String callId, String recordingUrl);
        void onUploadError(String callId, String error);
    }

    public static void setCallback(UploadCallback cb) {
        callback = cb;
    }

    public static BackgroundUploadService getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createNotificationChannel();

        // Create HTTP client with long timeouts for large files
        httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(120, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .build();

        // Acquire wake lock to keep CPU running during upload
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "TelecallerApp::UploadWakeLock");

        Log.d(TAG, "BackgroundUploadService created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || !ACTION_UPLOAD.equals(intent.getAction())) {
            Log.w(TAG, "Invalid intent received");
            stopSelf();
            return START_NOT_STICKY;
        }

        String filePath = intent.getStringExtra(EXTRA_FILE_PATH);
        String callId = intent.getStringExtra(EXTRA_CALL_ID);
        String dataId = intent.getStringExtra(EXTRA_DATA_ID);
        int duration = intent.getIntExtra(EXTRA_DURATION, 0);
        String apiUrl = intent.getStringExtra(EXTRA_API_URL);
        String authToken = intent.getStringExtra(EXTRA_AUTH_TOKEN);

        Log.d(TAG, "Starting upload for call: " + callId);
        Log.d(TAG, "File: " + filePath);
        Log.d(TAG, "API URL: " + apiUrl);

        // Start foreground service
        startForeground(NOTIFICATION_ID, createNotification("Uploading recording..."));

        // Acquire wake lock
        if (!wakeLock.isHeld()) {
            wakeLock.acquire(5 * 60 * 1000L); // 5 minutes max
        }

        // Run upload in background thread
        new Thread(() -> {
            try {
                uploadRecording(filePath, callId, dataId, duration, apiUrl, authToken);
            } catch (Exception e) {
                Log.e(TAG, "Upload failed: " + e.getMessage(), e);
                if (callback != null) {
                    callback.onUploadError(callId, e.getMessage());
                }
            } finally {
                releaseWakeLock();
                stopForeground(true);
                stopSelf();
            }
        }).start();

        return START_STICKY;
    }

    private void uploadRecording(String filePath, String callId, String dataId, int duration, String apiUrl, String authToken) throws IOException {
        File file = new File(filePath);
        if (!file.exists()) {
            throw new IOException("Recording file not found: " + filePath);
        }

        Log.d(TAG, "File size: " + file.length() + " bytes");

        // Build multipart request
        RequestBody fileBody = RequestBody.create(file, MediaType.parse("audio/m4a"));

        MultipartBody.Builder builder = new MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("recording", "call_" + callId + "_recording.m4a", fileBody);

        if (duration > 0) {
            builder.addFormDataPart("duration", String.valueOf(duration));
        }

        RequestBody requestBody = builder.build();

        // Build URL - use assigned-data endpoint if dataId is provided, otherwise use calls endpoint
        String uploadUrl;
        if (dataId != null && !dataId.isEmpty()) {
            uploadUrl = apiUrl + "/telecaller/assigned-data/" + dataId + "/recording";
        } else {
            uploadUrl = apiUrl + "/telecaller/calls/" + callId + "/recording";
        }

        Log.d(TAG, "Upload URL: " + uploadUrl);

        Request request = new Request.Builder()
            .url(uploadUrl)
            .addHeader("Authorization", "Bearer " + authToken)
            .post(requestBody)
            .build();

        // Retry up to 3 times
        int maxRetries = 3;
        Exception lastError = null;

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                Log.d(TAG, "Upload attempt " + attempt + "/" + maxRetries);
                updateNotification("Uploading... (attempt " + attempt + ")");

                Response response = httpClient.newCall(request).execute();
                String responseBody = response.body() != null ? response.body().string() : "";

                Log.d(TAG, "Response code: " + response.code());
                Log.d(TAG, "Response body: " + responseBody);

                if (response.isSuccessful()) {
                    Log.d(TAG, "Upload successful!");
                    updateNotification("Upload complete!");

                    // Extract recordingUrl from response
                    String recordingUrl = extractRecordingUrl(responseBody);

                    if (callback != null) {
                        callback.onUploadSuccess(callId, recordingUrl);
                    }
                    return;
                } else {
                    throw new IOException("Server returned " + response.code() + ": " + responseBody);
                }
            } catch (IOException e) {
                Log.e(TAG, "Attempt " + attempt + " failed: " + e.getMessage());
                lastError = e;

                if (attempt < maxRetries) {
                    try {
                        // Wait before retry (exponential backoff)
                        Thread.sleep(attempt * 2000L);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            }
        }

        // All retries failed
        throw new IOException("Upload failed after " + maxRetries + " attempts: " +
            (lastError != null ? lastError.getMessage() : "Unknown error"));
    }

    private String extractRecordingUrl(String jsonResponse) {
        // Simple JSON parsing - extract recordingUrl
        try {
            int startIndex = jsonResponse.indexOf("\"recordingUrl\"");
            if (startIndex == -1) return null;

            int colonIndex = jsonResponse.indexOf(":", startIndex);
            int quoteStart = jsonResponse.indexOf("\"", colonIndex);
            int quoteEnd = jsonResponse.indexOf("\"", quoteStart + 1);

            if (quoteStart != -1 && quoteEnd != -1) {
                return jsonResponse.substring(quoteStart + 1, quoteEnd);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse recordingUrl: " + e.getMessage());
        }
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Recording Upload",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows upload progress for call recordings");
            channel.setSound(null, null);
            channel.enableVibration(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification(String text) {
        Intent notificationIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Uploading Call Recording")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }

    private void updateNotification(String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, createNotification(text));
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "BackgroundUploadService destroyed");
        releaseWakeLock();
        instance = null;
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
