package ai.myleadx.app.calllog;

import android.content.ContentResolver;
import android.database.Cursor;
import android.provider.CallLog;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;

public class CallLogModule extends ReactContextBaseJavaModule {
    private static final String TAG = "CallLogModule";
    private final ReactApplicationContext reactContext;

    public CallLogModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "CallLogModule";
    }

    @ReactMethod
    public void getLastCall(String phoneNumber, Promise promise) {
        Log.d(TAG, "========== GET LAST CALL ==========");
        Log.d(TAG, "Input phone number: " + phoneNumber);

        try {
            ContentResolver resolver = reactContext.getContentResolver();

            // Clean phone number - keep only last 10 digits
            String cleanNumber = phoneNumber.replaceAll("[^0-9]", "");
            String lastDigits = cleanNumber.length() > 10
                ? cleanNumber.substring(cleanNumber.length() - 10)
                : cleanNumber;

            Log.d(TAG, "Clean number: " + cleanNumber);
            Log.d(TAG, "Last digits for search: " + lastDigits);

            String[] projection = {
                CallLog.Calls.NUMBER,
                CallLog.Calls.DURATION,
                CallLog.Calls.TYPE,
                CallLog.Calls.DATE
            };

            // First try: Query for recent calls matching this number
            String selection = CallLog.Calls.NUMBER + " LIKE ?";
            String[] selectionArgs = { "%" + lastDigits };
            // Note: Don't use LIMIT in sortOrder - not supported on all Android versions
            String sortOrder = CallLog.Calls.DATE + " DESC";

            Log.d(TAG, "Query selection: " + selection);
            Log.d(TAG, "Selection args: %" + lastDigits);

            Cursor cursor = resolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                sortOrder
            );

            Log.d(TAG, "Cursor returned: " + (cursor != null));

            if (cursor != null && cursor.moveToFirst()) {
                String number = cursor.getString(0);
                int duration = cursor.getInt(1);
                int type = cursor.getInt(2);
                long date = cursor.getLong(3);

                Log.d(TAG, "Found call entry:");
                Log.d(TAG, "  Number: " + number);
                Log.d(TAG, "  Duration: " + duration + " seconds");
                Log.d(TAG, "  Type: " + type + " (1=incoming, 2=outgoing, 3=missed)");
                Log.d(TAG, "  Date: " + date);

                WritableMap result = Arguments.createMap();
                result.putString("phoneNumber", number);
                result.putInt("duration", duration);
                result.putInt("type", type);
                result.putDouble("date", date);
                cursor.close();
                promise.resolve(result);
            } else {
                Log.d(TAG, "No matching call found");

                // Debug: show recent calls
                if (cursor != null) cursor.close();

                Cursor debugCursor = resolver.query(
                    CallLog.Calls.CONTENT_URI,
                    projection,
                    null,
                    null,
                    CallLog.Calls.DATE + " DESC"
                );

                if (debugCursor != null) {
                    Log.d(TAG, "Recent calls in log:");
                    int count = 0;
                    while (debugCursor.moveToNext() && count < 5) {
                        Log.d(TAG, "  - " + debugCursor.getString(0) +
                            " duration=" + debugCursor.getInt(1) +
                            " type=" + debugCursor.getInt(2));
                        count++;
                    }
                    debugCursor.close();
                }

                promise.resolve(null);
            }
        } catch (SecurityException e) {
            Log.e(TAG, "Permission error: " + e.getMessage());
            promise.reject("PERMISSION_ERROR", "READ_CALL_LOG permission required: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Error: " + e.getMessage(), e);
            promise.reject("ERROR", e.getMessage());
        }
    }
}
