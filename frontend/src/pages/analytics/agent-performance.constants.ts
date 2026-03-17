/**
 * Agent Performance Constants
 */

import {
  PhoneIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { RankConfig, MetricOption, LeaderboardEntry, AgentPerformance } from './agent-performance.types';

export const RANK_CONFIGS: RankConfig[] = [
  { bg: 'from-yellow-400 to-amber-500', shadow: 'shadow-yellow-500/30', text: 'text-yellow-600', badge: 'Gold' },
  { bg: 'from-slate-300 to-slate-400', shadow: 'shadow-slate-400/30', text: 'text-slate-600', badge: 'Silver' },
  { bg: 'from-orange-400 to-orange-500', shadow: 'shadow-orange-400/30', text: 'text-orange-600', badge: 'Bronze' },
];

export const METRIC_OPTIONS: MetricOption[] = [
  { id: 'calls', label: 'Total Calls', icon: PhoneIcon },
  { id: 'conversions', label: 'Conversions', icon: ArrowTrendingUpIcon },
  { id: 'appointments', label: 'Appointments', icon: CalendarIcon },
  { id: 'payments', label: 'Payments', icon: CurrencyDollarIcon },
  { id: 'sentiment', label: 'Sentiment', icon: HeartIcon },
];

export const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const getMetricValue = (entry: LeaderboardEntry, metric: string): string | number => {
  switch (metric) {
    case 'calls':
      return entry.metrics.totalCalls;
    case 'conversions':
      return entry.metrics.interestedCount;
    case 'appointments':
      return entry.metrics.appointmentsBooked;
    case 'payments':
      return entry.metrics.paymentsCollected;
    case 'sentiment':
      return (entry.metrics.avgSentimentScore * 100).toFixed(0) + '%';
    default:
      return entry.metrics.totalCalls;
  }
};

export const getMetricLabel = (metric: string): string => {
  return METRIC_OPTIONS.find((m) => m.id === metric)?.label || 'Total Calls';
};

export const getMockLeaderboard = (): LeaderboardEntry[] => [
  { rank: 1, agentId: 'agent-001', agentName: 'Sales Pro Max', metrics: { totalCalls: 542, answeredCalls: 487, interestedCount: 156, appointmentsBooked: 89, paymentsCollected: 45, paymentsAmount: 125000, totalTalkTime: 86400, avgConversionRate: 28.8, avgAnswerRate: 89.9, avgSentimentScore: 0.85 } },
  { rank: 2, agentId: 'agent-002', agentName: 'Lead Converter', metrics: { totalCalls: 478, answeredCalls: 412, interestedCount: 134, appointmentsBooked: 76, paymentsCollected: 38, paymentsAmount: 98000, totalTalkTime: 72000, avgConversionRate: 28.0, avgAnswerRate: 86.2, avgSentimentScore: 0.82 } },
  { rank: 3, agentId: 'agent-003', agentName: 'Appointment Setter', metrics: { totalCalls: 423, answeredCalls: 356, interestedCount: 112, appointmentsBooked: 95, paymentsCollected: 32, paymentsAmount: 78000, totalTalkTime: 64800, avgConversionRate: 26.5, avgAnswerRate: 84.2, avgSentimentScore: 0.79 } },
  { rank: 4, agentId: 'agent-004', agentName: 'Cold Caller', metrics: { totalCalls: 398, answeredCalls: 312, interestedCount: 89, appointmentsBooked: 45, paymentsCollected: 22, paymentsAmount: 56000, totalTalkTime: 54000, avgConversionRate: 22.4, avgAnswerRate: 78.4, avgSentimentScore: 0.75 } },
  { rank: 5, agentId: 'agent-005', agentName: 'Follow-up Agent', metrics: { totalCalls: 356, answeredCalls: 298, interestedCount: 78, appointmentsBooked: 42, paymentsCollected: 19, paymentsAmount: 48000, totalTalkTime: 48600, avgConversionRate: 21.9, avgAnswerRate: 83.7, avgSentimentScore: 0.78 } },
  { rank: 6, agentId: 'agent-006', agentName: 'Premium Agent', metrics: { totalCalls: 312, answeredCalls: 267, interestedCount: 67, appointmentsBooked: 38, paymentsCollected: 17, paymentsAmount: 42000, totalTalkTime: 42300, avgConversionRate: 21.5, avgAnswerRate: 85.6, avgSentimentScore: 0.81 } },
];

export const getMockAgentPerformance = (agentId: string): AgentPerformance => ({
  agentId,
  period: {
    days: 30,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  },
  totals: {
    totalCalls: 542,
    answeredCalls: 487,
    interestedCount: 156,
    appointmentsBooked: 89,
    paymentsCollected: 45,
    totalTalkTime: 86400,
  },
  averages: { callsPerDay: 18.1, conversionRate: 28.8, answerRate: 89.9 },
  dailyTrend: Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const baseCalls = 30 + Math.sin(i * 0.5) * 10;
    return {
      date: date.toISOString().split('T')[0],
      calls: Math.floor(baseCalls + Math.random() * 15),
      answered: Math.floor(baseCalls * 0.85 + Math.random() * 10),
      interested: Math.floor(baseCalls * 0.25 + Math.random() * 5),
      appointments: Math.floor(Math.random() * 6) + 2,
      conversionRate: Math.floor(Math.random() * 15) + 18,
    };
  }),
});
