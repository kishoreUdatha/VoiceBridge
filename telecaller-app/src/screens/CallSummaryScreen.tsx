import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  NativeModules,
  DeviceEventEmitter,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { telecallerApi, CallAnalysis } from '../api/telecaller';
import { formatDuration, formatDateTime } from '../utils/formatters';
import { RootStackParamList } from '../types';
import ConversationTranscript from '../components/ConversationTranscript';
import TimedTranscript, { TimedTurn } from '../components/TimedTranscript';
import { API_URL } from '../config';

type Route = RouteProp<RootStackParamList, 'CallAnalysis'>;

const OUTCOME_DISPLAY: Record<string, { label: string; icon: string; color: string }> = {
  INTERESTED: { label: 'Interested', icon: 'thumb-up', color: '#10B981' },
  NOT_INTERESTED: { label: 'Not Interested', icon: 'thumb-down', color: '#EF4444' },
  CALLBACK: { label: 'Callback', icon: 'phone-return', color: '#F59E0B' },
  CONVERTED: { label: 'Converted', icon: 'check-circle', color: '#10B981' },
  NO_ANSWER: { label: 'No Answer', icon: 'phone-missed', color: '#6B7280' },
  BUSY: { label: 'Busy', icon: 'phone-lock', color: '#6B7280' },
  WRONG_NUMBER: { label: 'Wrong Number', icon: 'phone-cancel', color: '#EF4444' },
};

const SENTIMENT_EMOJI: Record<string, { emoji: string; color: string; label: string }> = {
  positive: { emoji: '😊', color: '#10B981', label: 'Positive' },
  neutral: { emoji: '😐', color: '#F59E0B', label: 'Neutral' },
  negative: { emoji: '😞', color: '#EF4444', label: 'Negative' },
};

const qualityColor = (score: number | null | undefined) => {
  if (score == null) return '#9CA3AF';
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
};

const qualityLabel = (score: number | null | undefined) => {
  if (score == null) return 'Pending';
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
};

/**
 * Safely coerce a list item that might be a string or an object like
 * {issue, suggestion, timestamp} or {question, ...} into a single readable line.
 */
const itemToText = (item: any): string => {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'number' || typeof item === 'boolean') return String(item);
  if (typeof item === 'object') {
    // Common key names in this project's analysis output
    const primary =
      item.text ||
      item.issue ||
      item.question ||
      item.title ||
      item.label ||
      item.value ||
      item.summary ||
      item.description ||
      item.point ||
      item.tip;
    if (primary && typeof primary === 'string') return primary;
    // Fallback: stringify but skip noisy keys
    try {
      return Object.entries(item)
        .filter(([k]) => !['timestamp', 'time', 'index', 'sentiment'].includes(k))
        .map(([_, v]) => (typeof v === 'string' ? v : ''))
        .filter(Boolean)
        .join(' — ') || JSON.stringify(item);
    } catch {
      return '[object]';
    }
  }
  return String(item);
};

const toStringArray = (arr: any): string[] => {
  if (!arr) return [];
  if (!Array.isArray(arr)) return [];
  return arr.map(itemToText).filter((s) => s && s.length > 0);
};

type MainTab = 'overview' | 'insights' | 'transcript';

const CallSummaryScreen: React.FC = () => {
  const route = useRoute<Route>();
  const { callId } = route.params;

  const [a, setA] = useState<CallAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>('overview');
  const [coachTab, setCoachTab] = useState<'feedback' | 'scores'>('feedback');
  const [polls, setPolls] = useState(0);

  // Audio playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAnalysis = useCallback(async () => {
    try {
      const result = await telecallerApi.getCallAnalysis(callId);
      setA(result);
      if (result?.aiAnalyzed) setLoading(false);
      return result;
    } catch (e) {
      return null;
    }
  }, [callId]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const max = 30;
    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      setPolls(attempts);
      const r = await fetchAnalysis();
      const done = !!r?.aiAnalyzed || !!(r?.transcript && r.transcript.length > 0);
      if (!done && attempts < max && !cancelled) {
        setTimeout(tick, 4000);
      } else {
        setLoading(false);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [fetchAnalysis]);

  // Audio cleanup
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('onPlaybackComplete', () => {
      setIsPlaying(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });
    return () => {
      sub.remove();
      if (timerRef.current) clearInterval(timerRef.current);
      try {
        NativeModules.AudioPlayer?.stop();
      } catch {}
    };
  }, []);

  const recordingFullUrl = useCallback(() => {
    if (!a?.recordingUrl) return null;
    // If already absolute URL (S3), use as-is; otherwise prepend base URL
    if (a.recordingUrl.startsWith('http://') || a.recordingUrl.startsWith('https://')) {
      return a.recordingUrl;
    }
    const base = API_URL.replace(/\/api$/, '');
    return `${base}${a.recordingUrl}`;
  }, [a?.recordingUrl]);

  // Poll the native player's actual position so transcript highlighting stays
  // in sync even if audio drifts from a JS-side timer.
  const startPositionPolling = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      try {
        const pos = await NativeModules.AudioPlayer?.getCurrentPosition?.();
        if (typeof pos === 'number') {
          setPlayTime(pos);
        }
      } catch {}
    }, 250);
  }, []);

  const stopPositionPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePlay = async () => {
    if (isPlaying) {
      try {
        await NativeModules.AudioPlayer?.pause();
      } catch {}
      setIsPlaying(false);
      stopPositionPolling();
      return;
    }
    const url = recordingFullUrl();
    if (!url) return;
    setIsAudioLoading(true);
    try {
      await NativeModules.AudioPlayer.play(url);
      setIsPlaying(true);
      setPlayTime(0);
      startPositionPolling();
    } catch (e) {
      console.error('[CallSummary] Play failed:', e);
    }
    setIsAudioLoading(false);
  };

  const handleSeek = useCallback(
    async (seconds: number) => {
      try {
        if (!isPlaying) {
          // If nothing is playing yet, start fresh from this position
          const url = recordingFullUrl();
          if (!url) return;
          await NativeModules.AudioPlayer.play(url);
          setIsPlaying(true);
          startPositionPolling();
        }
        const actual = await NativeModules.AudioPlayer?.seekTo?.(seconds);
        if (typeof actual === 'number') setPlayTime(actual);
      } catch (e) {
        console.warn('[CallSummary] Seek failed:', e);
      }
    },
    [isPlaying, recordingFullUrl, startPositionPolling]
  );

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ===== Loading state =====
  if (loading && !a) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingTitle}>Loading call summary…</Text>
      </View>
    );
  }

  if (!a) {
    return (
      <View style={styles.loadingScreen}>
        <Icon name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.loadingTitle}>Call not found</Text>
      </View>
    );
  }

  const outcomeInfo = a.outcome ? OUTCOME_DISPLAY[a.outcome] : null;
  const sentimentInfo = a.sentiment ? SENTIMENT_EMOJI[a.sentiment] : null;

  // Timed transcript turns from enhancedTranscript (if backend provided them)
  const timedTurns: TimedTurn[] = Array.isArray(a.enhancedTranscript)
    ? (a.enhancedTranscript as any[]).map((t) => ({
        role: t?.role === 'assistant' || t?.role === 'agent' ? 'assistant' : 'user',
        content: typeof t?.content === 'string' ? t.content : itemToText(t?.content),
        startTimeSeconds:
          typeof t?.startTimeSeconds === 'number'
            ? t.startTimeSeconds
            : typeof t?.start === 'number'
            ? t.start
            : undefined,
        sentiment: typeof t?.sentiment === 'string' ? t.sentiment : undefined,
      })).filter((t) => t.content)
    : [];

  // Coerce all list-like fields to plain string arrays so we can safely render
  const keyQuestions = toStringArray(a.keyQuestionsAsked);
  const keyIssues = toStringArray(a.keyIssuesDiscussed);
  const positives = toStringArray(a.coachingPositiveHighlights);
  const improvements = toStringArray(a.coachingAreasToImprove);
  const nextTips = toStringArray(a.coachingNextCallTips);
  const buyingSignals = toStringArray(a.qualification?.buyingSignals);
  const objections = toStringArray(a.qualification?.objections);

  // Speaking time percentages
  const agentTime = a.agentSpeakingTime || 0;
  const customerTime = a.customerSpeakingTime || 0;
  const totalSpoken = agentTime + customerTime;
  const agentPct = totalSpoken > 0 ? Math.round((agentTime / totalSpoken) * 100) : 0;
  const customerPct = totalSpoken > 0 ? 100 - agentPct : 0;

  const qScore = a.callQualityScore;
  const qColor = qualityColor(qScore);

  // Captured information items - safely string-coerced
  const captured: Array<{ label: string; value: string; icon: string }> = [];
  const pushIfString = (label: string, value: any, icon: string) => {
    const s = itemToText(value);
    if (s) captured.push({ label, value: s, icon });
  };
  const q = a.qualification || {};
  const joinList = (v: any): string => {
    if (Array.isArray(v)) return v.filter(Boolean).map((x) => itemToText(x)).filter(Boolean).join(', ');
    return itemToText(v);
  };
  const fullName =
    itemToText(q.fullName) ||
    itemToText(q.name) ||
    [itemToText(q.firstName), itemToText(q.lastName)].filter(Boolean).join(' ').trim();
  pushIfString('Full Name', fullName, 'account');
  pushIfString('Phone', q.phone, 'phone');
  pushIfString('Email', q.email, 'email');
  pushIfString('Current Class', q.currentClass, 'school-outline');
  pushIfString('Board', q.board, 'book-open-variant');
  pushIfString('Course Interested', q.courseInterested, 'school');
  pushIfString('Specialization', q.specialization, 'book-education');
  pushIfString('Colleges Interested', joinList(q.collegesInterested), 'town-hall');
  pushIfString('Other Colleges Considered', joinList(q.otherCollegesConsidered), 'domain');
  pushIfString('Preferred Location', q.preferredLocation, 'map-marker');
  pushIfString('Budget / Fee Range', q.budget, 'currency-inr');
  pushIfString('Fee Structure', q.feeStructure, 'cash-multiple');
  pushIfString('Interest Level', q.interestLevel, 'star');
  pushIfString('Timeline', q.timeline, 'calendar-clock');
  pushIfString('Entrance Exam Score', q.entranceExamScore, 'trophy-outline');
  pushIfString('Hostel Required', q.hostelRequired, 'home-city');
  pushIfString('Parent/Guardian Name', q.parentName, 'account-group');
  pushIfString('Parent/Guardian Phone', q.parentPhone, 'phone-classic');
  pushIfString('Decision Maker', q.decisionMaker, 'account-check');
  pushIfString('Reason for Interest', q.reasonForInterest, 'lightbulb-on-outline');
  pushIfString('Specific Requirements', q.requirements, 'clipboard-text');
  pushIfString('Company', q.company, 'domain');
  // Also pull items from extractedData — skip labels already captured from qualification
  // so the same field (e.g. "Full Name") doesn't appear twice in the Overview list.
  if (Array.isArray(a.extractedData?.items)) {
    const seenLabels = new Set(captured.map((c) => c.label.trim().toLowerCase()));
    a.extractedData!.items!.forEach((it: any) => {
      const label = itemToText(it?.label);
      const value = itemToText(it?.value);
      if (label && value && !seenLabels.has(label.trim().toLowerCase())) {
        captured.push({ label, value, icon: typeof it?.icon === 'string' ? it.icon : 'tag' });
        seenLabels.add(label.trim().toLowerCase());
      }
    });
  }

  // Counts for tab badges
  const insightsCount =
    keyQuestions.length +
    keyIssues.length +
    positives.length +
    improvements.length +
    nextTips.length +
    (a.coachingSummary ? 1 : 0);

  return (
    <View style={styles.container}>
      {/* ===== Contact header (always visible) ===== */}
      <View style={styles.headerSticky}>
        <View style={styles.contactHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(a.lead?.firstName?.[0] || a.contactName?.[0] || a.phoneNumber?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.contactName}>
            {a.lead ? `${a.lead.firstName} ${a.lead.lastName || ''}`.trim() : a.contactName || 'Unknown'}
          </Text>
          <View style={styles.contactRow}>
            <Icon name="phone" size={12} color="#6B7280" />
            <Text style={styles.contactSub}>{a.phoneNumber || a.lead?.phone}</Text>
          </View>
          <View style={styles.contactRow}>
            <Icon name="arrow-top-right" size={12} color="#3B82F6" />
            <Text style={styles.contactMeta}>
              Outgoing · {formatDuration(a.duration || 0)} ·{' '}
              {a.startedAt ? formatDateTime(a.startedAt) : a.createdAt ? formatDateTime(a.createdAt) : ''}
            </Text>
          </View>
        </View>
        {outcomeInfo && (
          <View
            style={[
              styles.outcomePill,
              { backgroundColor: outcomeInfo.color + '15', borderColor: outcomeInfo.color },
            ]}
          >
            <Icon name={outcomeInfo.icon} size={14} color={outcomeInfo.color} />
            <Text style={[styles.outcomePillText, { color: outcomeInfo.color }]}>
              {outcomeInfo.label}
            </Text>
          </View>
        )}
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          <TabButton
            active={mainTab === 'overview'}
            label="Overview"
            icon="view-dashboard-outline"
            onPress={() => setMainTab('overview')}
          />
          <TabButton
            active={mainTab === 'insights'}
            label="Insights"
            icon="head-lightbulb-outline"
            badge={insightsCount > 0 ? insightsCount : undefined}
            onPress={() => setMainTab('insights')}
          />
          <TabButton
            active={mainTab === 'transcript'}
            label="Transcript"
            icon="text-box-outline"
            onPress={() => setMainTab('transcript')}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      {/* ===== OVERVIEW TAB ===== */}
      {mainTab === 'overview' && (
        <>
      {/* ===== Quality + Sentiment + Speaking time row ===== */}
      <View style={styles.metricsCard}>
        {/* Quality score */}
        <View style={styles.metricsBlock}>
          <Text style={styles.metricLabel}>Call Quality</Text>
          <View style={[styles.scoreCircle, { borderColor: qColor }]}>
            <Text style={[styles.scoreValue, { color: qColor }]}>
              {qScore != null ? qScore : '–'}
            </Text>
          </View>
          <Text style={[styles.scoreCaption, { color: qColor }]}>{qualityLabel(qScore)}</Text>
        </View>

        {/* Sentiment */}
        <View style={styles.metricsBlock}>
          <Text style={styles.metricLabel}>Sentiment</Text>
          <View style={styles.sentimentRow}>
            <View style={styles.sentimentItem}>
              <Text style={styles.sentimentEmoji}>{sentimentInfo?.emoji || '😐'}</Text>
              <Text style={styles.sentimentSubLabel}>Customer</Text>
            </View>
          </View>
          {sentimentInfo && (
            <Text style={[styles.scoreCaption, { color: sentimentInfo.color }]}>
              {sentimentInfo.label}
              {a.sentimentIntensity ? ` · ${a.sentimentIntensity}` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* ===== Speaking time bar ===== */}
      {totalSpoken > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Speaking Time</Text>
          <View style={styles.speakingBar}>
            <View style={[styles.speakingBarAgent, { flex: agentPct }]} />
            <View style={[styles.speakingBarCustomer, { flex: customerPct }]} />
          </View>
          <View style={styles.speakingLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>
                Agent {agentPct}% · {fmtTime(agentTime)}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>
                Customer {customerPct}% · {fmtTime(customerTime)}
              </Text>
            </View>
          </View>
          {a.nonSpeechTime != null && a.nonSpeechTime > 0 && (
            <Text style={styles.nonSpeech}>Silence: {fmtTime(a.nonSpeechTime)}</Text>
          )}
        </View>
      )}

      {/* ===== Captured Information ===== */}
      {captured.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="clipboard-list" size={16} color="#3B82F6" />
            <Text style={styles.cardTitle}>Captured Information</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{captured.length}</Text>
            </View>
          </View>
          <View style={styles.capturedGrid}>
            {captured.map((item, i) => (
              <View key={i} style={styles.capturedItem}>
                <View style={styles.capturedHeader}>
                  <Icon name={item.icon} size={14} color="#3B82F6" />
                  <Text style={styles.capturedLabel}>{item.label}</Text>
                </View>
                <Text style={styles.capturedValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ===== Call Summary ===== */}
      {a.summary && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Call Summary</Text>
          <Text style={styles.summaryText}>{a.summary}</Text>
        </View>
      )}
        </>
      )}

      {/* ===== INSIGHTS TAB ===== */}
      {mainTab === 'insights' && (
        <>
      {/* ===== Key Questions ===== */}
      {keyQuestions.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="comment-question" size={16} color="#8B5CF6" />
            <Text style={styles.cardTitle}>Key Questions Asked</Text>
          </View>
          {keyQuestions.map((q, i) => (
            <View key={i} style={styles.numberedRow}>
              <Text style={styles.numberedDigit}>{i + 1}.</Text>
              <Text style={styles.numberedText}>{q}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ===== Key Issues ===== */}
      {keyIssues.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="alert-circle-outline" size={16} color="#F59E0B" />
            <Text style={styles.cardTitle}>Key Issues Discussed</Text>
          </View>
          {keyIssues.map((issue, i) => (
            <View key={i} style={styles.numberedRow}>
              <Text style={styles.numberedDigit}>{i + 1}.</Text>
              <Text style={styles.numberedText}>{issue}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ===== AI Coaching ===== */}
      {(a.coachingSummary || positives.length > 0 || improvements.length > 0 || nextTips.length > 0) && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="head-lightbulb" size={16} color="#10B981" />
            <Text style={styles.cardTitle}>AI Coaching</Text>
          </View>
          {a.coachingSummary && (
            <View style={styles.coachSummaryBox}>
              <Text style={styles.coachSummaryText}>{a.coachingSummary}</Text>
            </View>
          )}
          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              onPress={() => setCoachTab('feedback')}
              style={[styles.tab, coachTab === 'feedback' && styles.tabActive]}
            >
              <Text style={[styles.tabText, coachTab === 'feedback' && styles.tabTextActive]}>
                Feedback
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCoachTab('scores')}
              style={[styles.tab, coachTab === 'scores' && styles.tabActive]}
            >
              <Text style={[styles.tabText, coachTab === 'scores' && styles.tabTextActive]}>
                Scores
              </Text>
            </TouchableOpacity>
          </View>

          {coachTab === 'feedback' && (
            <View>
              {positives.length > 0 && (
                <View style={styles.coachSection}>
                  <View style={styles.coachSectionHeader}>
                    <Icon name="check-circle" size={16} color="#10B981" />
                    <Text style={[styles.coachSectionTitle, { color: '#10B981' }]}>
                      What You Did Well
                    </Text>
                  </View>
                  {positives.map((p, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
              {improvements.length > 0 && (
                <View style={[styles.coachSection, { backgroundColor: '#FEF3C7' }]}>
                  <View style={styles.coachSectionHeader}>
                    <Icon name="alert" size={16} color="#D97706" />
                    <Text style={[styles.coachSectionTitle, { color: '#D97706' }]}>
                      Areas to Improve
                    </Text>
                  </View>
                  {improvements.map((p, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Text style={[styles.bulletDot, { color: '#D97706' }]}>•</Text>
                      <Text style={styles.bulletText}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
              {nextTips.length > 0 && (
                <View style={[styles.coachSection, { backgroundColor: '#EFF6FF' }]}>
                  <View style={styles.coachSectionHeader}>
                    <Icon name="phone-forward" size={16} color="#3B82F6" />
                    <Text style={[styles.coachSectionTitle, { color: '#3B82F6' }]}>
                      For Next Call
                    </Text>
                  </View>
                  {nextTips.map((p, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Text style={[styles.bulletDot, { color: '#3B82F6' }]}>→</Text>
                      <Text style={styles.bulletText}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {coachTab === 'scores' && (
            <View style={styles.scoresGrid}>
              <ScoreBar label="Empathy" value={a.coachingEmpathyScore} />
              <ScoreBar label="Objection Handling" value={a.coachingObjectionScore} />
              <ScoreBar label="Closing" value={a.coachingClosingScore} />
              {a.coachingTalkListenFeedback && (
                <Text style={styles.talkListenText}>{a.coachingTalkListenFeedback}</Text>
              )}
            </View>
          )}
        </View>
      )}

      {keyQuestions.length === 0 &&
        keyIssues.length === 0 &&
        positives.length === 0 &&
        improvements.length === 0 &&
        nextTips.length === 0 && (
          <View style={styles.emptyTab}>
            <Icon name="head-question-outline" size={42} color="#D1D5DB" />
            <Text style={styles.emptyTabText}>No insights available yet</Text>
            <Text style={styles.emptyTabSub}>AI analysis will populate this once the call is processed.</Text>
          </View>
        )}
        </>
      )}

      {/* ===== TRANSCRIPT TAB ===== */}
      {mainTab === 'transcript' && (
        <>
      {/* ===== Captured fields summary (mirrored from Overview) ===== */}
      {captured.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="clipboard-list" size={16} color="#3B82F6" />
            <Text style={styles.cardTitle}>Captured Information</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{captured.length}</Text>
            </View>
          </View>
          <View style={styles.capturedGrid}>
            {captured.map((item, i) => (
              <View key={`tx-${i}`} style={styles.capturedItem}>
                <View style={styles.capturedHeader}>
                  <Icon name={item.icon} size={14} color="#3B82F6" />
                  <Text style={styles.capturedLabel}>{item.label}</Text>
                </View>
                <Text style={styles.capturedValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ===== Audio Player ===== */}
      {a.recordingUrl && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="play-circle" size={16} color="#3B82F6" />
            <Text style={styles.cardTitle}>Recording</Text>
          </View>
          <TouchableOpacity
            style={[styles.playBtn, isPlaying && { backgroundColor: '#059669' }]}
            onPress={handlePlay}
          >
            {isAudioLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name={isPlaying ? 'pause' : 'play'} size={22} color="#FFFFFF" />
            )}
            <Text style={styles.playBtnText}>
              {isPlaying ? `Playing ${fmtTime(playTime)}` : 'Play Recording'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ===== Transcript (timed if available, plain otherwise) ===== */}
      {(timedTurns.length > 0 || a.transcript) && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="text-box-outline" size={16} color="#6366F1" />
            <Text style={styles.cardTitle}>Transcript</Text>
            {timedTurns.length > 0 && isPlaying && (
              <Text style={styles.liveTag}>● LIVE</Text>
            )}
          </View>
          {timedTurns.length > 0 ? (
            <TimedTranscript
              turns={timedTurns}
              currentTime={playTime}
              isPlaying={isPlaying}
              onSeek={handleSeek}
            />
          ) : (
            <ConversationTranscript transcript={a.transcript!} />
          )}
        </View>
      )}

      {/* ===== English Translation ===== */}
      {a.qualification?.englishTranscript && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="translate" size={16} color="#0EA5E9" />
            <Text style={styles.cardTitle}>English Translation</Text>
          </View>
          <ConversationTranscript transcript={a.qualification.englishTranscript} />
        </View>
      )}

      {!a.transcript && !a.recordingUrl && (
        <View style={styles.emptyTab}>
          <Icon name="text-box-remove-outline" size={42} color="#D1D5DB" />
          <Text style={styles.emptyTabText}>No transcript available</Text>
          <Text style={styles.emptyTabSub}>Recording or AI transcription was not produced for this call.</Text>
        </View>
      )}
        </>
      )}

      {loading && (
        <View style={styles.pollingHint}>
          <ActivityIndicator size="small" color="#8B5CF6" />
          <Text style={styles.pollingText}>AI analysis in progress… ({polls})</Text>
        </View>
      )}
      </ScrollView>
    </View>
  );
};

const TabButton: React.FC<{
  active: boolean;
  label: string;
  icon: string;
  badge?: number;
  onPress: () => void;
}> = ({ active, label, icon, badge, onPress }) => (
  <TouchableOpacity
    style={[styles.tabButton, active && styles.tabButtonActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Icon name={icon} size={18} color={active ? '#3B82F6' : '#9CA3AF'} />
    <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    {badge != null && (
      <View style={styles.tabBadge}>
        <Text style={styles.tabBadgeText}>{badge}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const ScoreBar: React.FC<{ label: string; value?: number | null }> = ({ label, value }) => {
  const v = value || 0;
  const color = v >= 75 ? '#10B981' : v >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <View style={styles.scoreBarRow}>
      <Text style={styles.scoreBarLabel}>{label}</Text>
      <View style={styles.scoreBarTrack}>
        <View style={[styles.scoreBarFill, { width: `${v}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.scoreBarValue, { color }]}>{v}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  content: { padding: 12, paddingBottom: 32 },
  headerSticky: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: 8,
  },
  outcomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  outcomePillText: { fontSize: 11, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#3B82F6',
  },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  tabButtonTextActive: { color: '#3B82F6' },
  tabBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyTabSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: { marginTop: 12, fontSize: 16, color: '#4B5563' },

  // Contact header
  contactHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#3B82F6', fontSize: 20, fontWeight: '700' },
  contactName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  contactSub: { fontSize: 12, color: '#6B7280' },
  contactMeta: { fontSize: 11, color: '#3B82F6' },

  // Metrics row
  metricsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  metricsBlock: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: { fontSize: 24, fontWeight: '700' },
  scoreCaption: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  sentimentRow: { flexDirection: 'row', gap: 16 },
  sentimentItem: { alignItems: 'center' },
  sentimentEmoji: { fontSize: 44 },
  sentimentSubLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  countBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#3B82F6' },
  summaryText: { fontSize: 13, color: '#374151', lineHeight: 19 },

  // Speaking time
  speakingBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  speakingBarAgent: { backgroundColor: '#3B82F6' },
  speakingBarCustomer: { backgroundColor: '#10B981' },
  speakingLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#4B5563' },
  nonSpeech: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },

  // Outcome chip
  outcomeChipBig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  outcomeChipText: { fontSize: 13, fontWeight: '700' },

  // Captured
  capturedGrid: { gap: 8 },
  capturedItem: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  capturedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  capturedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  capturedValue: { fontSize: 14, color: '#1F2937', fontWeight: '500' },

  // Numbered list
  numberedRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  numberedDigit: { fontSize: 13, color: '#6B7280', fontWeight: '600', minWidth: 18 },
  numberedText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },

  // Coach tabs
  coachSummaryBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  coachSummaryText: { fontSize: 13, color: '#1E40AF', lineHeight: 19 },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#3B82F6' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },
  coachSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  coachSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  coachSectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  bulletDot: { fontSize: 14, color: '#10B981', fontWeight: '700' },
  bulletText: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 },

  scoresGrid: { gap: 10 },
  scoreBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreBarLabel: { fontSize: 12, color: '#4B5563', width: 110 },
  scoreBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: { height: '100%' },
  scoreBarValue: { fontSize: 12, fontWeight: '700', width: 30, textAlign: 'right' },
  talkListenText: { fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginTop: 6 },

  // Audio
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
  },
  playBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  pollingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  pollingText: { fontSize: 12, color: '#8B5CF6' },
  liveTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
});

export default CallSummaryScreen;
