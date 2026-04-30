import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types';
import { telecallerApi, CallAnalysis } from '../api/telecaller';
import { formatDuration, getDisplayName } from '../utils/formatters';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AIAnalysis'>;
type AIAnalysisRouteProp = RouteProp<RootStackParamList, 'AIAnalysis'>;

const AIAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AIAnalysisRouteProp>();
  const callId = route.params?.callId;

  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalysis = useCallback(async () => {
    if (!callId) {
      setIsLoading(false);
      setError('No call selected for analysis');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const data = await telecallerApi.getCallAnalysis(callId);
      setAnalysis(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [callId]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  const handleReanalyze = useCallback(async () => {
    Alert.alert(
      'Re-analyze Call',
      'This will run AI analysis again on the call recording. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-analyze',
          onPress: async () => {
            try {
              setIsReanalyzing(true);
              await telecallerApi.reanalyzeCall(callId);
              Alert.alert('Success', 'Re-analysis started. Please refresh in a few moments.');
            } catch (err) {
              Alert.alert('Error', (err as Error).message);
            } finally {
              setIsReanalyzing(false);
            }
          },
        },
      ]
    );
  }, [callId]);

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return { icon: 'emoticon-happy', color: '#10B981' };
      case 'negative':
        return { icon: 'emoticon-sad', color: '#EF4444' };
      default:
        return { icon: 'emoticon-neutral', color: '#F59E0B' };
    }
  };

  const getOutcomeColor = (outcome: string | null) => {
    switch (outcome) {
      case 'INTERESTED':
      case 'CONVERTED':
        return '#10B981';
      case 'NOT_INTERESTED':
        return '#EF4444';
      case 'CALLBACK':
      case 'BUSY':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#10B981';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A_PLUS':
      case 'A':
        return '#10B981';
      case 'B':
        return '#3B82F6';
      case 'C':
        return '#F59E0B';
      default:
        return '#EF4444';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading AI Analysis...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Error Loading Analysis</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAnalysis}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="file-search" size={64} color="#9CA3AF" />
        <Text style={styles.errorTitle}>No Analysis Found</Text>
      </View>
    );
  }

  const sentimentInfo = getSentimentIcon(analysis.sentiment);
  const leadScore = analysis.lead?.leadScore;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Analysis</Text>
        <TouchableOpacity
          onPress={handleReanalyze}
          style={styles.reanalyzeButton}
          disabled={isReanalyzing}
        >
          {isReanalyzing ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Icon name="refresh" size={24} color="#3B82F6" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadAnalysis} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Analysis Status */}
        <View style={[
          styles.statusBanner,
          { backgroundColor: analysis.aiAnalyzed ? '#D1FAE5' : '#FEF3C7' }
        ]}>
          <Icon
            name={analysis.aiAnalyzed ? 'check-circle' : 'clock-outline'}
            size={20}
            color={analysis.aiAnalyzed ? '#059669' : '#D97706'}
          />
          <Text style={[
            styles.statusText,
            { color: analysis.aiAnalyzed ? '#059669' : '#D97706' }
          ]}>
            {analysis.aiAnalyzed ? 'AI Analysis Complete' : 'Analysis Pending...'}
          </Text>
        </View>

        {/* Lead Score Card */}
        {leadScore && (
          <View style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <Text style={styles.sectionTitle}>Lead Score</Text>
              <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(leadScore.grade) }]}>
                <Text style={styles.gradeText}>
                  {leadScore.grade.replace('_', '+')}
                </Text>
              </View>
            </View>

            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreValue, { color: getScoreColor(leadScore.overallScore) }]}>
                {leadScore.overallScore}
              </Text>
              <Text style={styles.scoreLabel}>/ 100</Text>
            </View>

            <View style={styles.classificationBadge}>
              <Icon
                name={leadScore.aiClassification === 'hot_lead' ? 'fire' :
                      leadScore.aiClassification === 'warm_lead' ? 'thermometer' : 'snowflake'}
                size={16}
                color={leadScore.aiClassification === 'hot_lead' ? '#EF4444' :
                       leadScore.aiClassification === 'warm_lead' ? '#F59E0B' : '#3B82F6'}
              />
              <Text style={styles.classificationText}>
                {leadScore.aiClassification?.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* Sentiment & Outcome */}
        <View style={styles.row}>
          <View style={[styles.halfCard, styles.sentimentCard]}>
            <Text style={styles.cardLabel}>Sentiment</Text>
            <View style={styles.sentimentContent}>
              <Icon name={sentimentInfo.icon} size={48} color={sentimentInfo.color} />
              <Text style={[styles.sentimentText, { color: sentimentInfo.color }]}>
                {analysis.sentiment?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
          </View>

          <View style={[styles.halfCard, styles.outcomeCard]}>
            <Text style={styles.cardLabel}>Outcome</Text>
            <View style={styles.outcomeContent}>
              <View style={[styles.outcomeBadge, { backgroundColor: getOutcomeColor(analysis.outcome) + '20' }]}>
                <Text style={[styles.outcomeText, { color: getOutcomeColor(analysis.outcome) }]}>
                  {analysis.outcome?.replace('_', ' ') || 'PENDING'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Call Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Call Details</Text>
          <View style={styles.detailRow}>
            <Icon name="timer-outline" size={20} color="#6B7280" />
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>
              {analysis.duration ? formatDuration(analysis.duration) : '--:--'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="microphone" size={20} color="#6B7280" />
            <Text style={styles.detailLabel}>Recording</Text>
            <Text style={[styles.detailValue, { color: analysis.recordingUrl ? '#10B981' : '#9CA3AF' }]}>
              {analysis.recordingUrl ? 'Available' : 'Not Available'}
            </Text>
          </View>
          {analysis.lead && (
            <View style={styles.detailRow}>
              <Icon name="account" size={20} color="#6B7280" />
              <Text style={styles.detailLabel}>Lead</Text>
              <Text style={styles.detailValue}>
                {getDisplayName(analysis.lead.firstName, analysis.lead.lastName)}
              </Text>
            </View>
          )}
        </View>

        {/* AI Summary */}
        {analysis.summary && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="robot" size={20} color="#8B5CF6" />
              <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>
                AI Summary
              </Text>
            </View>
            <Text style={styles.summaryText}>{analysis.summary}</Text>
          </View>
        )}

        {/* Qualification Data */}
        {analysis.qualification && Object.keys(analysis.qualification).length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="clipboard-check" size={20} color="#3B82F6" />
              <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>
                Qualification Data
              </Text>
            </View>
            <View style={styles.qualificationGrid}>
              {analysis.qualification.name && (
                <View style={styles.qualificationItem}>
                  <Text style={styles.qualLabel}>Name</Text>
                  <Text style={styles.qualValue}>{analysis.qualification.name}</Text>
                </View>
              )}
              {analysis.qualification.email && (
                <View style={styles.qualificationItem}>
                  <Text style={styles.qualLabel}>Email</Text>
                  <Text style={styles.qualValue}>{analysis.qualification.email}</Text>
                </View>
              )}
              {analysis.qualification.company && (
                <View style={styles.qualificationItem}>
                  <Text style={styles.qualLabel}>Company</Text>
                  <Text style={styles.qualValue}>{analysis.qualification.company}</Text>
                </View>
              )}
              {analysis.qualification.budget && (
                <View style={styles.qualificationItem}>
                  <Text style={styles.qualLabel}>Budget</Text>
                  <Text style={styles.qualValue}>{analysis.qualification.budget}</Text>
                </View>
              )}
              {analysis.qualification.timeline && (
                <View style={styles.qualificationItem}>
                  <Text style={styles.qualLabel}>Timeline</Text>
                  <Text style={styles.qualValue}>{analysis.qualification.timeline}</Text>
                </View>
              )}
              {analysis.qualification.requirements && (
                <View style={styles.qualificationItem}>
                  <Text style={styles.qualLabel}>Requirements</Text>
                  <Text style={styles.qualValue}>{analysis.qualification.requirements}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Buying Signals */}
        {analysis.qualification?.buyingSignals && analysis.qualification.buyingSignals.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="trending-up" size={20} color="#10B981" />
              <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>
                Buying Signals
              </Text>
            </View>
            {analysis.qualification.buyingSignals.map((signal, index) => (
              <View key={index} style={styles.signalItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.signalText}>{signal}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Objections */}
        {analysis.qualification?.objections && analysis.qualification.objections.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="alert-circle" size={20} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>
                Objections Raised
              </Text>
            </View>
            {analysis.qualification.objections.map((objection, index) => (
              <View key={index} style={styles.objectionItem}>
                <Icon name="alert" size={16} color="#F59E0B" />
                <Text style={styles.objectionText}>{objection}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Transcript */}
        {analysis.transcript && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="script-text" size={20} color="#6B7280" />
              <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>
                Transcript
              </Text>
            </View>
            <View style={styles.transcriptContainer}>
              <Text style={styles.transcriptText}>{analysis.transcript}</Text>
            </View>
          </View>
        )}

        {/* Analysis Timestamp */}
        {analysis.qualification?.aiAnalyzedAt && (
          <Text style={styles.timestamp}>
            Analyzed: {new Date(analysis.qualification.aiAnalyzedAt).toLocaleString()}
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  reanalyzeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 20,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  classificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  classificationText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sentimentCard: {},
  outcomeCard: {},
  cardLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  sentimentContent: {
    alignItems: 'center',
  },
  sentimentText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  outcomeContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  outcomeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  outcomeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  summaryText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  qualificationGrid: {
    gap: 12,
  },
  qualificationItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  qualLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  qualValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  signalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  signalText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  objectionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  objectionText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  transcriptContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    maxHeight: 200,
  },
  transcriptText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  timestamp: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
});

export default AIAnalysisScreen;
