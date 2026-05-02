package ai.myleadx.app.callrecording;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Worker that runs every hour to clean up old call recordings.
 * Deletes recordings older than 1 hour and reports to the server.
 */
public class HourlyCleanupWorker extends Worker {
    private static final String TAG = "HourlyCleanupWorker";
    private static final int HOURS_TO_KEEP = 1; // Delete recordings older than 1 hour

    public HourlyCleanupWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "========== HOURLY CLEANUP STARTED ==========");

        List<DeletedFile> deletedFiles = new ArrayList<>();
        int deletedCount = 0;
        long totalFreedBytes = 0;
        long cutoffTime = System.currentTimeMillis() - (HOURS_TO_KEEP * 60 * 60 * 1000L);

        try {
            // Clean app recordings directory
            File recordingsDir = new File(getApplicationContext().getFilesDir(), "recordings");
            if (recordingsDir.exists() && recordingsDir.isDirectory()) {
                File[] files = recordingsDir.listFiles();
                if (files != null) {
                    Log.d(TAG, "Found " + files.length + " files in recordings directory");
                    for (File file : files) {
                        if (file.isFile() && file.lastModified() < cutoffTime) {
                            long fileSize = file.length();
                            String fileName = file.getName();
                            long ageHours = (System.currentTimeMillis() - file.lastModified()) / (60 * 60 * 1000);

                            if (file.delete()) {
                                deletedCount++;
                                totalFreedBytes += fileSize;
                                deletedFiles.add(new DeletedFile(fileName, "recordings", fileSize, ageHours));
                                Log.d(TAG, "Deleted: " + fileName + " (" + fileSize + " bytes, " + ageHours + "h old)");
                            }
                        }
                    }
                }
            }

            // Clean accessibility recordings directory
            File accessibilityDir = new File(getApplicationContext().getFilesDir(), "accessibility_recordings");
            if (accessibilityDir.exists() && accessibilityDir.isDirectory()) {
                File[] files = accessibilityDir.listFiles();
                if (files != null) {
                    Log.d(TAG, "Found " + files.length + " files in accessibility_recordings directory");
                    for (File file : files) {
                        if (file.isFile() && file.lastModified() < cutoffTime) {
                            long fileSize = file.length();
                            String fileName = file.getName();
                            long ageHours = (System.currentTimeMillis() - file.lastModified()) / (60 * 60 * 1000);

                            if (file.delete()) {
                                deletedCount++;
                                totalFreedBytes += fileSize;
                                deletedFiles.add(new DeletedFile(fileName, "accessibility_recordings", fileSize, ageHours));
                                Log.d(TAG, "Deleted: " + fileName + " (" + fileSize + " bytes, " + ageHours + "h old)");
                            }
                        }
                    }
                }
            }

            Log.d(TAG, "========== CLEANUP COMPLETE ==========");
            Log.d(TAG, "Deleted " + deletedCount + " files");
            Log.d(TAG, "Freed " + (totalFreedBytes / 1024) + " KB (" + (totalFreedBytes / 1024 / 1024) + " MB)");

            // Report to server if any files were deleted
            if (deletedCount > 0) {
                reportToServer(deletedFiles, deletedCount, totalFreedBytes);
            }

            return Result.success();

        } catch (Exception e) {
            Log.e(TAG, "Cleanup failed: " + e.getMessage(), e);
            return Result.retry();
        }
    }

    /**
     * Report cleanup results to the backend server
     */
    private void reportToServer(List<DeletedFile> deletedFiles, int totalFiles, long totalFreedBytes) {
        try {
            SharedPreferences prefs = getApplicationContext()
                .getSharedPreferences("cleanup_prefs", Context.MODE_PRIVATE);
            String apiUrl = prefs.getString("api_url", "");
            String authToken = prefs.getString("auth_token", "");

            if (apiUrl.isEmpty() || authToken.isEmpty()) {
                Log.w(TAG, "No API credentials stored, skipping server report");
                return;
            }

            // Build the JSON payload
            JSONObject payload = new JSONObject();
            payload.put("deletedAt", System.currentTimeMillis());
            payload.put("totalFiles", totalFiles);
            payload.put("totalFreedBytes", totalFreedBytes);
            payload.put("totalFreedMB", totalFreedBytes / 1024.0 / 1024.0);
            payload.put("deviceBrand", Build.BRAND);
            payload.put("deviceModel", Build.MODEL);

            JSONArray filesArray = new JSONArray();
            for (DeletedFile file : deletedFiles) {
                JSONObject fileObj = new JSONObject();
                fileObj.put("fileName", file.fileName);
                fileObj.put("directory", file.directory);
                fileObj.put("sizeBytes", file.sizeBytes);
                fileObj.put("ageHours", file.ageHours);
                filesArray.put(fileObj);
            }
            payload.put("files", filesArray);

            // Send to server
            String endpoint = apiUrl + "/telecaller-analytics/recording-cleanup";
            Log.d(TAG, "Reporting to server: " + endpoint);

            URL url = new URL(endpoint);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + authToken);
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = payload.toString().getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int responseCode = conn.getResponseCode();
            Log.d(TAG, "Server response: " + responseCode);

            if (responseCode >= 200 && responseCode < 300) {
                Log.d(TAG, "Cleanup report sent successfully");
            } else {
                Log.w(TAG, "Server returned error: " + responseCode);
            }

            conn.disconnect();

        } catch (Exception e) {
            Log.e(TAG, "Failed to report to server: " + e.getMessage(), e);
        }
    }

    /**
     * Helper class to track deleted files
     */
    private static class DeletedFile {
        String fileName;
        String directory;
        long sizeBytes;
        long ageHours;

        DeletedFile(String fileName, String directory, long sizeBytes, long ageHours) {
            this.fileName = fileName;
            this.directory = directory;
            this.sizeBytes = sizeBytes;
            this.ageHours = ageHours;
        }
    }
}
