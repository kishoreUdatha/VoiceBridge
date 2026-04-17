import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, NativeModules, NativeEventEmitter } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { Call, CallOutcome } from '../types';
import { formatDuration, formatDateTime } from '../utils/formatters';
import { API_URL } from '../config';

// Simple audio player using Android's MediaPlayer via a minimal native bridge
// Falls back to downloading and opening the file if native player isn't available
const AudioPlayer = {
  currentUrl: null as string | null,
  isPlaying: false,

  getFullUrl(recordingUrl: string): string {
    // If already absolute URL (S3), use as-is
    if (recordingUrl.startsWith('http://') || recordingUrl.startsWith('https://')) {
      return recordingUrl;
    }
    const baseUrl = API_URL.replace(/\/api$/, '');
    return `${baseUrl}${recordingUrl}`;
  },
};

interface Props {
  call: Call;
  onPress?: () => void;
}

const OUTCOME_CONFIG: Record<CallOutcome, { icon: string; color: string; label: string }> = {
  INTERESTED: { icon: 'thumb-up', color: '#10B981', label: 'Interested' },
  NOT_INTERESTED: { icon: 'thumb-down', color: '#EF4444', label: 'Not Interested' },
  CALLBACK: { icon: 'phone-return', color: '#F59E0B', label: 'Callback' },
  CONVERTED: { icon: 'star', color: '#8B5CF6', label: 'Converted' },
  NO_ANSWER: { icon: 'phone-missed', color: '#6B7280', label: 'No Answer' },
  BUSY: { icon: 'phone-hangup', color: '#F97316', label: 'Busy' },
  WRONG_NUMBER: { icon: 'phone-off', color: '#EF4444', label: 'Wrong Number' },
  VOICEMAIL: { icon: 'voicemail', color: '#3B82F6', label: 'Voicemail' },
};

const CallHistoryItem: React.FC<Props> = ({ call, onPress }) => {
  const outcome = call.outcome ? OUTCOME_CONFIG[call.outcome] : null;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const playerRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(call.duration || 0);

  // Cleanup on unmount and listen for playback completion
  useEffect(() => {
    // Listen for playback completion from native
    let completionListener: { remove: () => void } | null = null;
    if (NativeModules.AudioPlayer) {
      try {
        const emitter = new NativeEventEmitter(NativeModules.AudioPlayer);
        completionListener = emitter.addListener('onPlaybackComplete', () => {
          console.log('[Audio] Playback completed');
          setIsPlaying(false);
          setPlaybackTime(0);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          playerRef.current = null;
        });
      } catch (e) {
        console.warn('[Audio] Could not set up completion listener:', e);
      }
    }

    return () => {
      if (completionListener) {
        completionListener.remove();
      }
      if (playerRef.current && NativeModules.AudioPlayer) {
        try {
          NativeModules.AudioPlayer.stop();
        } catch (e) {}
        playerRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!call.recordingUrl) return;

    const url = AudioPlayer.getFullUrl(call.recordingUrl);

    if (isPlaying && playerRef.current) {
      // Pause
      try {
        if (NativeModules.AudioPlayer) {
          await NativeModules.AudioPlayer.pause();
        }
      } catch (e) {}
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    try {
      setIsLoading(true);

      // Try using the NativeModules.AudioPlayer if available
      if (NativeModules.AudioPlayer) {
        if (playerRef.current === 'loaded') {
          await NativeModules.AudioPlayer.resume();
          setIsPlaying(true);
          setIsLoading(false);

          // Resume tracking playback time with actual position
          timerRef.current = setInterval(async () => {
            try {
              const pos = await NativeModules.AudioPlayer.getCurrentPosition();
              setPlaybackTime(Math.floor(pos));
            } catch (e) {
              setPlaybackTime(prev => prev + 1);
            }
          }, 1000);
        } else {
          // Play returns duration in seconds
          const duration = await NativeModules.AudioPlayer.play(url);
          playerRef.current = 'loaded';
          setIsPlaying(true);
          setIsLoading(false);

          // Set total duration from audio file
          if (duration > 0) {
            setTotalDuration(Math.floor(duration));
          }

          // Track playback time with actual position
          setPlaybackTime(0);
          timerRef.current = setInterval(async () => {
            try {
              const pos = await NativeModules.AudioPlayer.getCurrentPosition();
              setPlaybackTime(Math.floor(pos));
            } catch (e) {
              setPlaybackTime(prev => prev + 1);
            }
          }, 1000);
        }
        return;
      }

      // Fallback: Download file and open with system player
      const RNFS = require('react-native-fs');
      const localPath = `${RNFS.CachesDirectoryPath}/recording_${call.id}.m4a`;

      // Check if already downloaded
      const exists = await RNFS.exists(localPath);
      if (!exists) {
        console.log('[Audio] Downloading recording from:', url);
        await RNFS.downloadFile({
          fromUrl: url,
          toFile: localPath,
        }).promise;
        console.log('[Audio] Downloaded to:', localPath);
      }

      // Use Android MediaPlayer via FileViewer or intent
      const { Linking } = require('react-native');

      // Try to play using Android's built-in audio player
      const fileUri = `file://${localPath}`;

      // Use Android intent to play audio
      if (NativeModules.IntentLauncher) {
        await NativeModules.IntentLauncher.startActivity({
          action: 'android.intent.action.VIEW',
          data: fileUri,
          type: 'audio/mp4',
        });
      } else {
        // Last resort: open the URL directly in browser
        await Linking.openURL(url);
      }

      setIsLoading(false);
      setIsPlaying(true);

      // Track time with simple timer for external player
      setPlaybackTime(0);
      timerRef.current = setInterval(() => {
        setPlaybackTime(prev => {
          if (prev >= (call.duration || 30)) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('[Audio] Playback error:', error);
      setIsLoading(false);
      setIsPlaying(false);

      // Final fallback: open URL in browser
      try {
        const { Linking } = require('react-native');
        await Linking.openURL(url);
      } catch (e) {
        console.error('[Audio] Cannot open URL:', e);
      }
    }
  }, [call, isPlaying]);

  const handleStop = useCallback(async () => {
    if (NativeModules.AudioPlayer) {
      try {
        await NativeModules.AudioPlayer.stop();
      } catch (e) {
        console.warn('[Audio] Stop error:', e);
      }
    }
    playerRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackTime(0);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.iconContainer}>
        {outcome ? (
          <Icon name={outcome.icon} size={20} color={outcome.color} />
        ) : (
          <Icon name="phone" size={20} color="#9CA3AF" />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.outcomeText}>
            {outcome?.label || 'In Progress'}
          </Text>
          <Text style={styles.dateText}>
            {formatDateTime(call.createdAt)}
          </Text>
        </View>

        {call.leadName && (
          <Text style={styles.leadName}>{call.leadName}</Text>
        )}

        <View style={styles.details}>
          {call.duration !== undefined && call.duration > 0 && (
            <View style={styles.detailItem}>
              <Icon name="timer-outline" size={14} color="#9CA3AF" />
              <Text style={styles.detailText}>
                {formatDuration(call.duration)}
              </Text>
            </View>
          )}

          {call.sentimentScore !== undefined && (
            <View style={styles.detailItem}>
              <Icon
                name={call.sentimentScore > 0.5 ? 'emoticon-happy' : 'emoticon-neutral'}
                size={14}
                color={call.sentimentScore > 0.5 ? '#10B981' : '#F59E0B'}
              />
              <Text style={styles.detailText}>
                {Math.round(call.sentimentScore * 100)}%
              </Text>
            </View>
          )}
        </View>

        {/* Recording Playback Button */}
        {call.recordingUrl && (
          <View style={styles.playbackContainer}>
            {isLoading ? (
              <View style={styles.playButton}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.playButtonText}>Loading...</Text>
              </View>
            ) : (
              <View style={styles.playbackRow}>
                <TouchableOpacity
                  style={[styles.playButton, isPlaying && styles.playButtonActive]}
                  onPress={handlePlayPause}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={isPlaying ? 'pause' : 'play'}
                    size={18}
                    color={isPlaying ? '#FFFFFF' : '#3B82F6'}
                  />
                  <Text style={[styles.playButtonText, isPlaying && styles.playButtonTextActive]}>
                    {isPlaying
                      ? `${formatTime(playbackTime)} / ${formatTime(totalDuration)}`
                      : totalDuration > 0
                        ? `Play (${formatTime(totalDuration)})`
                        : 'Play Recording'}
                  </Text>
                </TouchableOpacity>
                {isPlaying && (
                  <TouchableOpacity
                    style={styles.stopButton}
                    onPress={handleStop}
                    activeOpacity={0.7}
                  >
                    <Icon name="stop" size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {call.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {call.notes}
          </Text>
        )}
      </View>

      {onPress && (
        <Icon name="chevron-right" size={20} color="#D1D5DB" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  outcomeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  leadName: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  playbackContainer: {
    marginTop: 8,
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  playButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  playButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  playButtonTextActive: {
    color: '#FFFFFF',
  },
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  notes: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 18,
  },
});

export default CallHistoryItem;
