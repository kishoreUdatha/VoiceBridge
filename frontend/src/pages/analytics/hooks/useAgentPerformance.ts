/**
 * Agent Performance Hook
 * Manages state and data fetching for agent performance analytics
 */

import { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import {
  LeaderboardEntry,
  AgentPerformance,
  MetricType,
  DateRangeType,
} from '../agent-performance.types';
import { getMockLeaderboard, getMockAgentPerformance } from '../agent-performance.constants';

export function useAgentPerformance() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>('calls');
  const [dateRange, setDateRange] = useState<DateRangeType>('30');

  useEffect(() => {
    fetchLeaderboard();
  }, [metric, dateRange]);

  useEffect(() => {
    if (selectedAgent) {
      fetchAgentPerformance(selectedAgent);
    }
  }, [selectedAgent, dateRange]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const response = await api.get('/call-analytics/agents/leaderboard', {
        params: { metric, startDate: startDate.toISOString(), limit: 10 },
      });

      // Use API data if available, otherwise fall back to mock
      const data = response.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        console.log('[AgentPerformance] Loaded real data:', data.length, 'agents');
        setLeaderboard(data);
      } else {
        console.log('[AgentPerformance] No API data, using mock data');
        setLeaderboard(getMockLeaderboard());
      }
    } catch (error: any) {
      console.error('[AgentPerformance] API error:', error?.response?.status || error.message);
      // Fall back to mock data for demo purposes
      setLeaderboard(getMockLeaderboard());
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentPerformance = async (agentId: string) => {
    try {
      const response = await api.get(`/call-analytics/agents/${agentId}`, {
        params: { days: dateRange },
      });
      setAgentPerformance(response.data.data);
    } catch (error) {
      console.error('Failed to fetch agent performance:', error);
      setAgentPerformance(getMockAgentPerformance(agentId));
    }
  };

  // Calculate radar chart data for selected agent
  const radarData = useMemo(() => {
    if (!selectedAgent || !agentPerformance) return [];
    const entry = leaderboard.find((e) => e.agentId === selectedAgent);
    if (!entry) return [];

    return [
      { subject: 'Calls', value: Math.min(entry.metrics.totalCalls / 10, 100), fullMark: 100 },
      { subject: 'Answer Rate', value: entry.metrics.avgAnswerRate, fullMark: 100 },
      { subject: 'Conversion', value: entry.metrics.avgConversionRate, fullMark: 100 },
      { subject: 'Sentiment', value: entry.metrics.avgSentimentScore * 100, fullMark: 100 },
      { subject: 'Appointments', value: Math.min(entry.metrics.appointmentsBooked * 2, 100), fullMark: 100 },
    ];
  }, [selectedAgent, leaderboard, agentPerformance]);

  const getSelectedAgentEntry = () => leaderboard.find((e) => e.agentId === selectedAgent);

  return {
    // Data
    leaderboard,
    selectedAgent,
    agentPerformance,
    loading,
    radarData,
    // Filters
    metric,
    setMetric,
    dateRange,
    setDateRange,
    // Actions
    setSelectedAgent,
    fetchLeaderboard,
    getSelectedAgentEntry,
  };
}
