/**
 * Smart Call Prep Screen
 * Shows AI-generated suggestions before making a call to a lead
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import api from '../api';

type Props = NativeStackScreenProps<RootStackParamList, 'SmartCallPrep'>;

interface CallPrepSuggestions {
  recommendedOpening: string;
  thingsToAvoid: string[];
  talkingPoints: string[];
  objectionPrep: Array<{
    objection: string;
    suggestedResponse: string;
  }>;
  leadContext: {
    interestLevel: 'low' | 'medium' | 'high';
    mainConcerns: string[];
    decisionMakerStatus: string;
    preferredChannel: string;
    bestTimeToCall: string;
  };
  previousCallsSummary: string;
  confidenceScore: number;
}

type TabType = 'prep' | 'objections' | 'context';

const SmartCallPrepScreen: React.FC<Props> = ({ route, navigation }) => {
  const { lead } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prep, setPrep] = useState<CallPrepSuggestions | null>(null);
  const [hasPreviousCalls, setHasPreviousCalls] = useState(false);
  const [totalPreviousCalls, setTotalPreviousCalls] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('prep');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCallPrep();
  }, []);

  const fetchCallPrep = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(
        `/outbound-calls/call-prep/${encodeURIComponent(lead.phone)}`,
        {
          params: { leadName: lead.name },
        }
      );

      const data = response.data;

      if (data.success) {
        setPrep(data.data.prep);
        setHasPreviousCalls(data.data.hasPreviousCalls);
        setTotalPreviousCalls(data.data.totalPreviousCalls || 0);
      } else {
        setError(data.message || 'Failed to load call prep');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to load call prep';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCallPrep();
  };

  const handleProceedToCall = () => {
    navigation.replace('Call', { lead });
  };

  const handleSkip = () => {
    navigation.replace('Call', { lead });
  };

  const getInterestColor = (level: string) => {
    switch (level) {
      case 'high':
        return { bg: '#D1FAE5', text: '#059669' };
      case 'medium':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'low':
        return { bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 70) return '#10B981';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const renderPrepTab = () => {
    if (!prep) return null;

    return (
      <View style={styles.tabContent}>
        {/* Recommended Opening */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="bullseye-arrow" size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>Recommended Opening</Text>
          </View>
          <View style={styles.openingCard}>
            <Text style={styles.openingText}>"{prep.recommendedOpening}"</Text>
          </View>
        </View>

        {/* Things to Avoid */}
        {prep.thingsToAvoid.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.sectionTitle}>Things to Avoid</Text>
            </View>
            {prep.thingsToAvoid.map((item, idx) => (
              <View key={idx} style={styles.avoidItem}>
                <Icon name="close-circle" size={16} color="#EF4444" />
                <Text style={styles.avoidText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Talking Points */}
        {prep.talkingPoints.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="lightbulb" size={18} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Key Talking Points</Text>
            </View>
            {prep.talkingPoints.map((point, idx) => (
              <View key={idx} style={styles.talkingPointItem}>
                <View style={styles.pointNumber}>
                  <Text style={styles.pointNumberText}>{idx + 1}</Text>
                </View>
                <Text style={styles.talkingPointText}>{point}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderObjectionsTab = () => {
    if (!prep) return null;

    return (
      <View style={styles.tabContent}>
        {prep.objectionPrep.length > 0 ? (
          prep.objectionPrep.map((item, idx) => (
            <View key={idx} style={styles.objectionCard}>
              <View style={styles.objectionHeader}>
                <Icon name="shield-alert" size={16} color="#F59E0B" />
                <Text style={styles.objectionLabel}>If they say:</Text>
              </View>
              <Text style={styles.objectionText}>"{item.objection}"</Text>
              <View style={styles.responseSection}>
                <Icon name="arrow-right-bold" size={14} color="#10B981" />
                <Text style={styles.responseText}>{item.suggestedResponse}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="shield-check" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No specific objections detected</Text>
            <Text style={styles.emptySubtext}>
              Be prepared for common objections like pricing and timing.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderContextTab = () => {
    if (!prep) return null;

    const interestColors = getInterestColor(prep.leadContext.interestLevel);

    return (
      <View style={styles.tabContent}>
        {/* Interest Level */}
        <View style={styles.contextRow}>
          <Text style={styles.contextLabel}>Interest Level</Text>
          <View style={[styles.interestBadge, { backgroundColor: interestColors.bg }]}>
            <Text style={[styles.interestText, { color: interestColors.text }]}>
              {prep.leadContext.interestLevel.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Main Concerns */}
        {prep.leadContext.mainConcerns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.contextLabel}>Main Concerns</Text>
            <View style={styles.concernsContainer}>
              {prep.leadContext.mainConcerns.map((concern, idx) => (
                <View key={idx} style={styles.concernBadge}>
                  <Text style={styles.concernText}>{concern}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Other Context */}
        <View style={styles.contextGrid}>
          <View style={styles.contextCard}>
            <Icon name="account-tie" size={20} color="#6B7280" />
            <Text style={styles.contextCardLabel}>Decision Maker</Text>
            <Text style={styles.contextCardValue}>{prep.leadContext.decisionMakerStatus}</Text>
          </View>
          <View style={styles.contextCard}>
            <Icon name="chat" size={20} color="#6B7280" />
            <Text style={styles.contextCardLabel}>Preferred Channel</Text>
            <Text style={styles.contextCardValue}>{prep.leadContext.preferredChannel}</Text>
          </View>
        </View>

        <View style={styles.contextFullCard}>
          <Icon name="clock-outline" size={20} color="#6B7280" />
          <View style={styles.contextFullContent}>
            <Text style={styles.contextCardLabel}>Best Time to Call</Text>
            <Text style={styles.contextCardValue}>{prep.leadContext.bestTimeToCall}</Text>
          </View>
        </View>

        {/* Confidence Score */}
        <View style={styles.confidenceSection}>
          <View style={styles.confidenceHeader}>
            <Text style={styles.contextLabel}>AI Confidence</Text>
            <Text style={[styles.confidenceValue, { color: getConfidenceColor(prep.confidenceScore) }]}>
              {prep.confidenceScore}%
            </Text>
          </View>
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                {
                  width: `${prep.confidenceScore}%`,
                  backgroundColor: getConfidenceColor(prep.confidenceScore),
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Smart Call Prep</Text>
          <Text style={styles.headerSubtitle}>
            {lead.name} • {totalPreviousCalls} previous call{totalPreviousCalls !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Previous Calls Summary */}
      {hasPreviousCalls && prep && (
        <View style={styles.summaryBanner}>
          <Icon name="information" size={18} color="#1E40AF" />
          <Text style={styles.summaryText}>{prep.previousCallsSummary}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'prep' && styles.tabActive]}
          onPress={() => setActiveTab('prep')}
        >
          <Icon
            name="clipboard-text"
            size={18}
            color={activeTab === 'prep' ? '#3B82F6' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'prep' && styles.tabTextActive]}>
            Prep
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'objections' && styles.tabActive]}
          onPress={() => setActiveTab('objections')}
        >
          <Icon
            name="shield"
            size={18}
            color={activeTab === 'objections' ? '#3B82F6' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'objections' && styles.tabTextActive]}>
            Objections
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'context' && styles.tabActive]}
          onPress={() => setActiveTab('context')}
        >
          <Icon
            name="account-details"
            size={18}
            color={activeTab === 'context' ? '#3B82F6' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'context' && styles.tabTextActive]}>
            Context
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Analyzing previous calls...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchCallPrep}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeTab === 'prep' && renderPrepTab()}
            {activeTab === 'objections' && renderObjectionsTab()}
            {activeTab === 'context' && renderContextTab()}
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.proceedButton} onPress={handleProceedToCall}>
          <Icon name="phone" size={20} color="#FFFFFF" />
          <Text style={styles.proceedText}>Proceed to Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#BFDBFE',
    marginTop: 2,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    color: '#BFDBFE',
    fontWeight: '500',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  openingCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  openingText: {
    fontSize: 14,
    color: '#065F46',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  avoidItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  avoidText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
  },
  talkingPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  pointNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  talkingPointText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  objectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  objectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  objectionLabel: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  objectionText: {
    fontSize: 14,
    color: '#78350F',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  responseSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    padding: 10,
    gap: 8,
  },
  responseText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  contextLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  interestBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interestText: {
    fontSize: 12,
    fontWeight: '600',
  },
  concernsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  concernBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  concernText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  contextGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  contextCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  contextCardLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  contextCardValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  contextFullCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  contextFullContent: {
    flex: 1,
  },
  confidenceSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  confidenceBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  proceedButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proceedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SmartCallPrepScreen;
