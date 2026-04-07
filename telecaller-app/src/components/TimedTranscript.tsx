import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export interface TimedTurn {
  role: 'assistant' | 'user' | string;
  content: string;
  startTimeSeconds?: number;
  sentiment?: string;
}

interface Props {
  /** Array of timestamped turns from enhancedTranscript */
  turns: TimedTurn[];
  /** Current playback time in seconds */
  currentTime: number;
  /** Whether the audio is currently playing (controls auto-scroll) */
  isPlaying: boolean;
  /** Optional title rendered above the conversation */
  title?: string;
  /** Tap a turn to seek the audio to that timestamp */
  onSeek?: (seconds: number) => void;
}

const TimedTranscript: React.FC<Props> = ({
  turns,
  currentTime,
  isPlaying,
  title,
  onSeek,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const turnYsRef = useRef<Record<number, number>>({});

  // Find the active turn index based on currentTime
  const activeIdx = useMemo(() => {
    if (!turns || turns.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < turns.length; i++) {
      const start = turns[i].startTimeSeconds ?? 0;
      if (start <= currentTime) idx = i;
      else break;
    }
    return idx;
  }, [turns, currentTime]);

  // Auto-scroll active turn into view while playing
  useEffect(() => {
    if (!isPlaying || activeIdx < 0) return;
    const y = turnYsRef.current[activeIdx];
    if (y != null && scrollRef.current) {
      // Leave a bit of headroom so the active bubble isn't pinned to the top edge
      const target = Math.max(0, y - 60);
      scrollRef.current.scrollTo({ y: target, animated: true });
    }
  }, [activeIdx, isPlaying]);

  const fmtTs = (s?: number) => {
    if (s == null) return '';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!turns || turns.length === 0) return null;

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {turns.map((turn, i) => {
          const isAgent = turn.role === 'assistant';
          const isActive = i === activeIdx;
          const Wrapper: React.ComponentType<any> = onSeek ? TouchableOpacity : View;
          return (
            <Wrapper
              key={i}
              activeOpacity={0.7}
              onPress={onSeek ? () => onSeek(turn.startTimeSeconds || 0) : undefined}
              onLayout={(e: any) => {
                turnYsRef.current[i] = e.nativeEvent.layout.y;
              }}
              style={[styles.row, isAgent ? styles.rowAgent : styles.rowCustomer]}
            >
              <View
                style={[
                  styles.bubble,
                  isAgent ? styles.bubbleAgent : styles.bubbleCustomer,
                  isActive && (isAgent ? styles.bubbleAgentActive : styles.bubbleCustomerActive),
                ]}
              >
                <View style={styles.bubbleHeader}>
                  <Text
                    style={[
                      styles.label,
                      isAgent ? styles.labelAgent : styles.labelCustomer,
                    ]}
                  >
                    {isAgent ? 'Agent' : 'Customer'}
                  </Text>
                  <Text style={styles.timestamp}>{fmtTs(turn.startTimeSeconds)}</Text>
                </View>
                <Text
                  selectable
                  style={[styles.text, isActive && styles.textActive]}
                >
                  {turn.content}
                </Text>
              </View>
            </Wrapper>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scroll: { maxHeight: 480 },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  rowAgent: { justifyContent: 'flex-start' },
  rowCustomer: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  bubbleAgent: {
    backgroundColor: '#EFF6FF',
    borderTopLeftRadius: 4,
  },
  bubbleCustomer: {
    backgroundColor: '#F0FDF4',
    borderTopRightRadius: 4,
  },
  bubbleAgentActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bubbleCustomerActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelAgent: { color: '#3B82F6' },
  labelCustomer: { color: '#16A34A' },
  timestamp: {
    fontSize: 10,
    color: '#9CA3AF',
    fontVariant: ['tabular-nums'],
  },
  text: { fontSize: 13, color: '#1F2937', lineHeight: 19 },
  textActive: { color: '#0F172A', fontWeight: '500' },
});

export default TimedTranscript;
