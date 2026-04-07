package com.telecallerapptemp.audioplayer;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.IOException;

public class AudioPlayerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "AudioPlayerModule";
    // Static reference prevents garbage collection
    private static MediaPlayer sMediaPlayer;
    private static String sCurrentUrl;
    private static boolean sIsPlaying = false;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public AudioPlayerModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "AudioPlayer";
    }

    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(Integer count) {}

    @ReactMethod
    public void play(String url, Promise promise) {
        Log.d(TAG, "Play requested: " + url);

        mainHandler.post(() -> {
            try {
                // Stop any existing playback
                stopInternal();

                sMediaPlayer = new MediaPlayer();
                sMediaPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                );

                // Try to set wake mode (requires WAKE_LOCK permission)
                try {
                    sMediaPlayer.setWakeMode(getReactApplicationContext(), android.os.PowerManager.PARTIAL_WAKE_LOCK);
                } catch (Exception e) {
                    Log.w(TAG, "Wake lock not available, continuing without it");
                }

                sMediaPlayer.setDataSource(url);
                sCurrentUrl = url;

                sMediaPlayer.setOnPreparedListener(mp -> {
                    Log.d(TAG, "Prepared, duration: " + mp.getDuration() + "ms");
                    // Force speaker output and max media volume
                    try {
                        AudioManager am = (AudioManager) getReactApplicationContext()
                            .getSystemService(Context.AUDIO_SERVICE);
                        if (am != null) {
                            am.setMode(AudioManager.MODE_NORMAL);
                            am.setSpeakerphoneOn(false);
                            int maxVol = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                            int curVol = am.getStreamVolume(AudioManager.STREAM_MUSIC);
                            Log.d(TAG, "Media volume: " + curVol + "/" + maxVol);
                            if (curVol < maxVol / 2) {
                                am.setStreamVolume(AudioManager.STREAM_MUSIC, maxVol, 0);
                                Log.d(TAG, "Raised media volume to max");
                            }
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "AudioManager setup failed: " + e.getMessage());
                    }
                    mp.setVolume(1.0f, 1.0f);
                    mp.start();
                    sIsPlaying = true;
                    Log.d(TAG, "Playback started, duration: " + mp.getDuration() + "ms");
                    try {
                        promise.resolve(mp.getDuration() / 1000.0);
                    } catch (Exception e) {
                        Log.w(TAG, "Promise already resolved: " + e.getMessage());
                    }
                });

                sMediaPlayer.setOnErrorListener((mp, what, extra) -> {
                    Log.e(TAG, "MediaPlayer error: what=" + what + ", extra=" + extra);
                    sIsPlaying = false;
                    try {
                        promise.reject("PLAY_ERROR", "MediaPlayer error: " + what);
                    } catch (Exception e) {
                        Log.w(TAG, "Promise already resolved: " + e.getMessage());
                    }
                    return true;
                });

                sMediaPlayer.setOnCompletionListener(mp -> {
                    Log.d(TAG, "Playback completed naturally");
                    sIsPlaying = false;
                    // Emit event to JS
                    try {
                        WritableMap params = Arguments.createMap();
                        params.putBoolean("completed", true);
                        getReactApplicationContext()
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("onPlaybackComplete", params);
                    } catch (Exception e) {
                        Log.w(TAG, "Failed to emit completion event: " + e.getMessage());
                    }
                    // Don't release here - let JS call stop when ready
                });

                sMediaPlayer.setOnBufferingUpdateListener((mp, percent) -> {
                    Log.d(TAG, "Buffering: " + percent + "%");
                });

                sMediaPlayer.prepareAsync();

            } catch (Exception e) {
                Log.e(TAG, "Failed to play: " + e.getMessage(), e);
                sIsPlaying = false;
                try {
                    promise.reject("PLAY_ERROR", e.getMessage());
                } catch (Exception ex) {
                    Log.w(TAG, "Promise already resolved");
                }
            }
        });
    }

    @ReactMethod
    public void pause(Promise promise) {
        mainHandler.post(() -> {
            if (sMediaPlayer != null && sIsPlaying) {
                try {
                    sMediaPlayer.pause();
                    sIsPlaying = false;
                    Log.d(TAG, "Paused");
                    promise.resolve(true);
                } catch (Exception e) {
                    promise.resolve(false);
                }
            } else {
                promise.resolve(false);
            }
        });
    }

    @ReactMethod
    public void resume(Promise promise) {
        mainHandler.post(() -> {
            if (sMediaPlayer != null && !sIsPlaying) {
                try {
                    sMediaPlayer.start();
                    sIsPlaying = true;
                    Log.d(TAG, "Resumed");
                    promise.resolve(true);
                } catch (Exception e) {
                    promise.resolve(false);
                }
            } else {
                promise.resolve(false);
            }
        });
    }

    @ReactMethod
    public void stop(Promise promise) {
        mainHandler.post(() -> {
            stopInternal();
            promise.resolve(true);
        });
    }

    @ReactMethod
    public void isPlaying(Promise promise) {
        promise.resolve(sIsPlaying && sMediaPlayer != null);
    }

    @ReactMethod
    public void getDuration(Promise promise) {
        if (sMediaPlayer != null) {
            try {
                promise.resolve(sMediaPlayer.getDuration() / 1000.0);
            } catch (Exception e) {
                promise.resolve(0);
            }
        } else {
            promise.resolve(0);
        }
    }

    @ReactMethod
    public void getCurrentPosition(Promise promise) {
        if (sMediaPlayer != null) {
            try {
                promise.resolve(sMediaPlayer.getCurrentPosition() / 1000.0);
            } catch (Exception e) {
                promise.resolve(0);
            }
        } else {
            promise.resolve(0);
        }
    }

    /**
     * Seek to a specific position in seconds. Resolves with the actual position
     * (clamped to 0..duration). If the player is paused, playback resumes from
     * the new position; if the player is stopped, this is a no-op resolving 0.
     */
    @ReactMethod
    public void seekTo(double seconds, Promise promise) {
        mainHandler.post(() -> {
            if (sMediaPlayer == null) {
                promise.resolve(0.0);
                return;
            }
            try {
                int target = Math.max(0, (int) (seconds * 1000));
                int duration = 0;
                try { duration = sMediaPlayer.getDuration(); } catch (Exception ignored) {}
                if (duration > 0 && target > duration - 200) target = Math.max(0, duration - 200);
                sMediaPlayer.seekTo(target);
                if (!sIsPlaying) {
                    try {
                        sMediaPlayer.start();
                        sIsPlaying = true;
                    } catch (Exception ignored) {}
                }
                promise.resolve(target / 1000.0);
            } catch (Exception e) {
                Log.w(TAG, "seekTo failed: " + e.getMessage());
                promise.resolve(0.0);
            }
        });
    }

    private void stopInternal() {
        sIsPlaying = false;
        if (sMediaPlayer != null) {
            try {
                if (sMediaPlayer.isPlaying()) {
                    sMediaPlayer.stop();
                }
            } catch (Exception e) {
                Log.w(TAG, "Error stopping: " + e.getMessage());
            }
            try {
                sMediaPlayer.reset();
                sMediaPlayer.release();
            } catch (Exception e) {
                Log.w(TAG, "Error releasing: " + e.getMessage());
            }
            sMediaPlayer = null;
            sCurrentUrl = null;
            Log.d(TAG, "Player stopped and released");
        }
    }
}
