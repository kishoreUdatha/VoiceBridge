import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ConversationTranscriptProps {
  transcript: string;
  /** Optional title shown above the conversation */
  title?: string;
}

interface Turn {
  speaker: 'agent' | 'customer';
  text: string;
}

/**
 * Parses a labeled transcript like:
 *   "Agent: Hello\nCustomer: Hi\nAgent: ..."
 * into alternating conversation turns. Falls back to a single block
 * if no labels are detected.
 */
const parseTranscript = (raw: string): Turn[] => {
  if (!raw || typeof raw !== 'string') return [];

  // Normalize escaped newlines that come from JSON.stringify-d strings
  const normalized = raw.replace(/\\n/g, '\n');

  // Match speaker label ANYWHERE (not just at line start) so that a sentence
  // mixing both labels like "...okay. Customer: Yes. Agent: Are you..." still
  // gets split correctly into separate turns.
  const splitRegex = /(?:^|\s)(Agent|Telecaller|Assistant|Rep|Customer|User|Caller|Lead)\s*:\s*/gi;

  // Walk every label position. We capture the index AFTER the matched label so
  // the segment text starts at the speaker's actual content, not the label itself.
  const matches: Array<{ start: number; contentStart: number; speaker: 'agent' | 'customer' }> = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(splitRegex.source, 'gi');
  while ((m = re.exec(normalized)) !== null) {
    const label = m[1].toLowerCase();
    const isAgent =
      label === 'agent' ||
      label === 'telecaller' ||
      label === 'assistant' ||
      label === 'rep';
    matches.push({
      start: m.index,
      contentStart: re.lastIndex,
      speaker: isAgent ? 'agent' : 'customer',
    });
  }

  if (matches.length === 0) {
    // No labels — return as a single customer turn so it still displays
    return [{ speaker: 'customer', text: normalized.trim() }];
  }

  const turns: Turn[] = [];
  for (let i = 0; i < matches.length; i++) {
    const contentStart = matches[i].contentStart;
    const end = i + 1 < matches.length ? matches[i + 1].start : normalized.length;
    const segment = normalized.slice(contentStart, end).trim();
    if (segment) {
      // Coalesce consecutive turns from the same speaker (e.g. agent monologue
      // split across multiple lines) into a single bubble for readability.
      const last = turns[turns.length - 1];
      if (last && last.speaker === matches[i].speaker) {
        last.text = `${last.text} ${segment}`.trim();
      } else {
        turns.push({ speaker: matches[i].speaker, text: segment });
      }
    }
  }
  return turns;
};

const ConversationTranscript: React.FC<ConversationTranscriptProps> = ({
  transcript,
  title,
}) => {
  const turns = useMemo(() => parseTranscript(transcript), [transcript]);

  if (turns.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {turns.map((turn, i) => (
        <View
          key={i}
          style={[
            styles.row,
            turn.speaker === 'agent' ? styles.rowAgent : styles.rowCustomer,
          ]}
        >
          <View
            style={[
              styles.bubble,
              turn.speaker === 'agent' ? styles.bubbleAgent : styles.bubbleCustomer,
            ]}
          >
            <Text
              style={[
                styles.label,
                turn.speaker === 'agent' ? styles.labelAgent : styles.labelCustomer,
              ]}
            >
              {turn.speaker === 'agent' ? 'Agent' : 'Customer'}
            </Text>
            <Text style={styles.text} selectable>
              {turn.text}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  rowAgent: {
    justifyContent: 'flex-start',
  },
  rowCustomer: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleAgent: {
    backgroundColor: '#EFF6FF',
    borderTopLeftRadius: 4,
  },
  bubbleCustomer: {
    backgroundColor: '#F0FDF4',
    borderTopRightRadius: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelAgent: {
    color: '#3B82F6',
  },
  labelCustomer: {
    color: '#16A34A',
  },
  text: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 19,
  },
});

export default ConversationTranscript;
