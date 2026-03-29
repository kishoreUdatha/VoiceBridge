import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { telecallerApi, CallAnalysis } from '../api/telecaller';
import { formatDuration } from '../utils/formatters';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CallAnalysis'>;
type CallAnalysisRouteProp = RouteProp<RootStackParamList, 'CallAnalysis'>;

const OUTCOME_DISPLAY: Record<string, { label: string; icon: string; color: string }> = {
  INTERESTED: { label: 'Interested', icon: 'thumb-up', color: '#10B981' },
  NOT_INTERESTED: { label: 'Not Interested', icon: 'thumb-down', color: '#EF4444' },
  CALLBACK: { label: 'Callback Requested', icon: 'phone-return', color: '#F59E0B' },
  CONVERTED: { label: 'Converted', icon: 'check-circle', color: '#10B981' },
  NO_ANSWER: { label: 'No Answer', icon: 'phone-missed', color: '#6B7280' },
  BUSY: { label: 'Busy', icon: 'phone-lock', color: '#6B7280' },
  WRONG_NUMBER: { label: 'Wrong Number', icon: 'phone-cancel', color: '#EF4444' },
  VOICEMAIL: { label: 'Voicemail', icon: 'voicemail', color: '#6B7280' },
};

const SENTIMENT_DISPLAY: Record<string, { label: string; icon: string; color: string }> = {
  positive: { label: 'Positive', icon: 'emoticon-happy', color: '#10B981' },
  neutral: { label: 'Neutral', icon: 'emoticon-neutral', color: '#F59E0B' },
  negative: { label: 'Negative', icon: 'emoticon-sad', color: '#EF4444' },
};

const CallAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CallAnalysisRouteProp>();
  const { callId, duration, recordingPath } = route.params;

  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [pollCount, setPollCount] = useState(0);

  // Poll for analysis results
  const fetchAnalysis = useCallback(async () => {
    try {
      const result = await telecallerApi.getCallAnalysis(callId);
      setAnalysis(result);

      if (result.aiAnalyzed) {
        setIsLoading(false);
      } else {
        // Keep polling if not analyzed yet
        setPollCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Error fetching analysis:', err);
      // Don't set error on first few attempts, AI might still be processing
      if (pollCount > 10) {
        setError('Unable to fetch analysis. Please try again later.');
        setIsLoading(false);
      }
    }
  }, [callId, pollCount]);

  // Start polling when screen mounts
  useEffect(() => {
    fetchAnalysis();

    // Poll every 3 seconds until we get results (max 20 attempts = 60 seconds)
    const interval = setInterval(() => {
      if (pollCount < 20 && isLoading) {
        fetchAnalysis();
      } else if (pollCount >= 20) {
        setIsLoading(false);
        if (!analysis?.aiAnalyzed) {
          setError('Analysis is taking longer than expected. Results will be available soon.');
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchAnalysis, pollCount, isLoading, analysis]);

  const handleDone = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  }, [navigation]);

  const outcomeInfo = analysis?.outcome ? OUTCOME_DISPLAY[analysis.outcome] : null;
  const sentimentInfo = analysis?.sentiment ? SENTIMENT_DISPLAY[analysis.sentiment] : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Call Analysis</Text>
        <View style={styles.aiTag}>
          <Icon name="robot" size={14} color="#8B5CF6" />
          <Text style={styles.aiTagText}>AI Powered</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Call Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Icon name="timer-outline" size={20} color="#6B7280" />
            <Text style={styles.summaryLabel}>Call Duration</Text>
            <Text style={styles.summaryValue}>
              {formatDuration(analysis?.duration || duration || 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Icon name="microphone" size={20} color="#6B7280" />
            <Text style={styles.summaryLabel}>Recording</Text>
            <Text style={[styles.summaryValue, { color: analysis?.recordingUrl || recordingPath ? '#10B981' : '#9CA3AF' }]}>
              {analysis?.recordingUrl || recordingPath ? 'Uploaded' : 'Not Available'}
            </Text>
          </View>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingTitle}>Analyzing Call...</Text>
            <Text style={styles.loadingSubtitle}>
              AI is transcribing and analyzing the conversation
            </Text>
            <View style={styles.loadingSteps}>
              <View style={styles.loadingStep}>
                <Icon
                  name={pollCount > 2 ? 'check-circle' : 'loading'}
                  size={20}
                  color={pollCount > 2 ? '#10B981' : '#9CA3AF'}
                />
                <Text style={styles.loadingStepText}>Transcribing audio</Text>
              </View>
              <View style={styles.loadingStep}>
                <Icon
                  name={pollCount > 5 ? 'check-circle' : pollCount > 2 ? 'loading' : 'circle-outline'}
                  size={20}
                  color={pollCount > 5 ? '#10B981' : '#9CA3AF'}
                />
                <Text style={styles.loadingStepText}>Analyzing sentiment</Text>
              </View>
              <View style={styles.loadingStep}>
                <Icon
                  name={pollCount > 8 ? 'check-circle' : pollCount > 5 ? 'loading' : 'circle-outline'}
                  size={20}
                  color={pollCount > 8 ? '#10B981' : '#9CA3AF'}
                />
                <Text style={styles.loadingStepText}>Determining outcome</Text>
              </View>
            </View>
          </View>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color="#F59E0B" />
            <Text style={styles.errorTitle}>Analysis Pending</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchAnalysis}>
              <Icon name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* No Conversation Warning */}
        {!isLoading && analysis?.aiAnalyzed && analysis?.qualification?.noConversation && (
          <View style={styles.noConversationCard}>
            <Icon name="phone-off" size={48} color="#9CA3AF" />
            <Text style={styles.noConversationTitle}>No Conversation Detected</Text>
            <Text style={styles.noConversationText}>
              {analysis.qualification.reason || 'The recording did not contain a meaningful conversation.'}
            </Text>
          </View>
        )}

        {/* Analysis Results */}
        {!isLoading && analysis?.aiAnalyzed && !analysis?.qualification?.noConversation && (
          <>
            {/* AI Outcome */}
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>AI Determined Outcome</Text>
              <View style={[styles.outcomeCard, { borderColor: outcomeInfo?.color || '#E5E7EB' }]}>
                <View style={[styles.outcomeIcon, { backgroundColor: (outcomeInfo?.color || '#6B7280') + '20' }]}>
                  <Icon
                    name={outcomeInfo?.icon || 'phone'}
                    size={32}
                    color={outcomeInfo?.color || '#6B7280'}
                  />
                </View>
                <Text style={[styles.outcomeLabel, { color: outcomeInfo?.color || '#6B7280' }]}>
                  {outcomeInfo?.label || analysis.outcome || 'Unknown'}
                </Text>
              </View>
            </View>

            {/* Sentiment */}
            {sentimentInfo && (
              <View style={styles.resultSection}>
                <Text style={styles.sectionTitle}>Customer Sentiment</Text>
                <View style={styles.sentimentRow}>
                  <Icon name={sentimentInfo.icon} size={28} color={sentimentInfo.color} />
                  <Text style={[styles.sentimentLabel, { color: sentimentInfo.color }]}>
                    {sentimentInfo.label}
                  </Text>
                </View>
              </View>
            )}

            {/* Summary */}
            {analysis.summary && (
              <View style={styles.resultSection}>
                <Text style={styles.sectionTitle}>Call Summary</Text>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryText}>{analysis.summary}</Text>
                </View>
              </View>
            )}

            {/* Transcript Preview */}
            {analysis.transcript && (
              <View style={styles.resultSection}>
                <Text style={styles.sectionTitle}>Transcript Preview</Text>
                <View style={styles.transcriptBox}>
                  <Text style={styles.transcriptText} numberOfLines={5}>
                    {analysis.transcript}
                  </Text>
                </View>
              </View>
            )}

            {/* Key Insights */}
            {analysis.qualification && (
              <View style={styles.resultSection}>
                <Text style={styles.sectionTitle}>Key Insights</Text>
                <View style={styles.insightsContainer}>
                  {analysis.qualification.buyingSignals && analysis.qualification.buyingSignals.length > 0 && (
                    <View style={styles.insightItem}>
                      <Icon name="trending-up" size={20} color="#10B981" />
                      <View style={styles.insightContent}>
                        <Text style={styles.insightLabel}>Buying Signals</Text>
                        <Text style={styles.insightValue}>
                          {analysis.qualification.buyingSignals.join(', ')}
                        </Text>
                      </View>
                    </View>
                  )}
                  {analysis.qualification.objections && analysis.qualification.objections.length > 0 && (
                    <View style={styles.insightItem}>
                      <Icon name="alert" size={20} color="#F59E0B" />
                      <View style={styles.insightContent}>
                        <Text style={styles.insightLabel}>Objections</Text>
                        <Text style={styles.insightValue}>
                          {analysis.qualification.objections.join(', ')}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Notes (Optional) */}
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
              <View style={styles.notesContainer}>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add any additional notes..."
                  placeholderTextColor="#9CA3AF"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </>
        )}

        {/* Done Button */}
        <TouchableOpacity
          style={[styles.doneButton, isLoading && styles.doneButtonDisabled]}
          onPress={handleDone}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Icon name="check" size={20} color="#FFFFFF" />
          <Text style={styles.doneButtonText}>
            {isLoading ? 'Waiting for Analysis...' : 'Done'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingSteps: {
    marginTop: 24,
    gap: 12,
  },
  loadingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingStepText: {
    fontSize: 14,
    color: '#4B5563',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 10,
  },
  outcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
  },
  outcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  outcomeLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  sentimentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sentimentLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  transcriptBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
  },
  transcriptText: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  insightsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  insightItem: {
    flexDirection: 'row',
    gap: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  insightValue: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  notesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesInput: {
    padding: 16,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 80,
  },
  doneButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  doneButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noConversationCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  noConversationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 12,
    marginBottom: 8,
  },
  noConversationText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CallAnalysisScreen;
