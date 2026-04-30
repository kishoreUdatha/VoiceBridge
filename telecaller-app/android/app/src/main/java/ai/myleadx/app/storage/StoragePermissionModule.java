package ai.myleadx.app.storage;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class StoragePermissionModule extends ReactContextBaseJavaModule {
    private static final String TAG = "StoragePermission";

    public StoragePermissionModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "StoragePermission";
    }

    @ReactMethod
    public void hasAllFilesAccess(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            promise.resolve(Environment.isExternalStorageManager());
        } else {
            promise.resolve(true);
        }
    }

    @ReactMethod
    public void requestAllFilesAccess(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (Environment.isExternalStorageManager()) {
                Log.d(TAG, "All files access already granted");
                promise.resolve(true);
                return;
            }

            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                intent.setData(Uri.parse("package:" + getReactApplicationContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getReactApplicationContext().startActivity(intent);
                Log.d(TAG, "Opened all files access settings");
                promise.resolve(false); // User needs to grant manually
            } catch (Exception e) {
                Log.e(TAG, "Failed to open settings: " + e.getMessage());
                // Fallback to general storage settings
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getReactApplicationContext().startActivity(intent);
                    promise.resolve(false);
                } catch (Exception e2) {
                    promise.reject("ERROR", e2.getMessage());
                }
            }
        } else {
            promise.resolve(true);
        }
    }
}
