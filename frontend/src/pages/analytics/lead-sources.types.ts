/**
 * Lead Sources Types
 */

export interface LeadSourceStats {
  source: string;
  count: number;
  converted: number;
  conversionRate: number;
  avgResponseTime: number;
  revenue: number;
}

export interface LeadSourceData {
  period: string;
  socialMedia: {
    total: number;
    converted: number;
    byPlatform: Record<string, number>;
    trend: TrendDataPoint[];
  };
  aiVoiceAgent: {
    total: number;
    converted: number;
    inbound: number;
    outbound: number;
    trend: TrendDataPoint[];
  };
  other: {
    total: number;
    converted: number;
    bySource: Record<string, number>;
  };
  comparison: LeadSourceStats[];
}

export interface TrendDataPoint {
  date: string;
  count: number;
}

export interface PieChartDataItem {
  name: string;
  value: number;
  color: string;
}

export interface CombinedTrendDataPoint {
  date: string;
  socialMedia: number;
  aiVoice: number;
}

export type CategoryFilter = 'all' | 'socialMedia' | 'aiVoice';
