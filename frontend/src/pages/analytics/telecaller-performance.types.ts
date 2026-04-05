export interface TelecallerMetrics {
  totalCalls: number;
  answeredCalls: number;
  interestedCount: number;
  convertedCount: number;
  callbacksRequested: number;
  noAnswerCount: number;
  totalTalkTime: number;
  avgConversionRate: number;
  avgAnswerRate: number;
  avgSentimentScore: number;
}

export interface TelecallerLeaderboardEntry {
  rank: number;
  telecallerId: string;
  telecallerName: string;
  metrics: TelecallerMetrics;
}

export interface TelecallerDailyTrend {
  date: string;
  calls: number;
  answered: number;
  interested: number;
  converted: number;
  conversionRate: number;
}

export interface TelecallerPerformance {
  telecallerId: string;
  period: { days: number; startDate: Date; endDate: Date };
  totals: {
    totalCalls: number;
    answeredCalls: number;
    interestedCount: number;
    convertedCount: number;
    callbacksRequested: number;
    totalTalkTime: number;
  };
  averages: {
    callsPerDay: number;
    conversionRate: number;
    answerRate: number;
  };
  dailyTrend: TelecallerDailyTrend[];
}

export type TelecallerMetricType = 'calls' | 'conversions' | 'interested' | 'sentiment';
export type DateRangeType = '7' | '14' | '30' | '60' | '90';
