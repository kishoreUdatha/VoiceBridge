/**
 * Agent Performance Types
 */

export interface AgentMetrics {
  totalCalls: number;
  answeredCalls: number;
  interestedCount: number;
  appointmentsBooked: number;
  paymentsCollected: number;
  paymentsAmount: number;
  totalTalkTime: number;
  avgConversionRate: number;
  avgAnswerRate: number;
  avgSentimentScore: number;
}

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string | null;
  metrics: AgentMetrics;
}

export interface DailyTrend {
  date: string;
  calls: number;
  answered: number;
  interested: number;
  appointments: number;
  conversionRate: number;
}

export interface AgentPerformance {
  agentId: string;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  totals: {
    totalCalls: number;
    answeredCalls: number;
    interestedCount: number;
    appointmentsBooked: number;
    paymentsCollected: number;
    totalTalkTime: number;
  };
  averages: {
    callsPerDay: number;
    conversionRate: number;
    answerRate: number;
  };
  dailyTrend: DailyTrend[];
}

export interface RankConfig {
  bg: string;
  shadow: string;
  text: string;
  badge: string;
}

export interface MetricOption {
  id: MetricType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export type MetricType = 'calls' | 'conversions' | 'appointments' | 'payments' | 'sentiment';
export type DateRangeType = '7' | '30' | '90';
