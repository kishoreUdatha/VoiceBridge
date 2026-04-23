package com.telecallerapptemp.callrecording;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.io.File;

/**
 * Worker that runs at 11 PM IST daily to clean up old call recordings.
 * Deletes recordings older than 12 hours to free up device storage.
 */
public class RecordingCleanupWorker extends Worker {
    private static final String TAG = "RecordingCleanupWorker";
    private static final int HOURS_TO_KEEP = 12; // Keep recordings for 12 hours

    public RecordingCleanupWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "========== NIGHTLY CLEANUP STARTED (11 PM IST) ==========");

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
            File accessibilityDir = new File(getApplicationContext().getFilesDir(), "accessibility_recordings");
            if (accessibilityDir.exists() && accessibilityDir.isDirectory()) {
                File[] files = accessibilityDir.listFiles();
                if (files != null) {
                    Log.d(TAG, "Found " + files.length + " files in accessibility_recordings directory");
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

            Log.d(TAG, "========== CLEANUP COMPLETE ==========");
            Log.d(TAG, "Deleted " + deletedCount + " files");
            Log.d(TAG, "Freed " + (totalFreedBytes / 1024 / 1024) + " MB");

            return Result.success();

        } catch (Exception e) {
            Log.e(TAG, "Cleanup failed: " + e.getMessage(), e);
            return Result.retry();
        }
    }
}
