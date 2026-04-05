import { TelecallerLeaderboardEntry, TelecallerMetricType } from './telecaller-performance.types';

export const TELECALLER_METRIC_OPTIONS: { id: TelecallerMetricType; label: string }[] = [
  { id: 'calls', label: 'Calls' },
  { id: 'conversions', label: 'Converted' },
  { id: 'interested', label: 'Interested' },
  { id: 'sentiment', label: 'Sentiment' },
];

export const DATE_RANGE_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
];

// Warm color themes for telecallers (different from agent cool colors)
export const TELECALLER_COLOR_THEMES = [
  { bg: 'bg-gradient-to-br from-orange-50 to-orange-100', border: 'border-orange-200', accent: 'text-orange-600', hover: 'hover:border-orange-300', ring: 'ring-orange-500', headerBg: 'bg-orange-600', chartColor: '#F97316', chartColorLight: '#FDBA74', metricBg: 'bg-orange-50' },
  { bg: 'bg-gradient-to-br from-rose-50 to-rose-100', border: 'border-rose-200', accent: 'text-rose-600', hover: 'hover:border-rose-300', ring: 'ring-rose-500', headerBg: 'bg-rose-600', chartColor: '#F43F5E', chartColorLight: '#FDA4AF', metricBg: 'bg-rose-50' },
  { bg: 'bg-gradient-to-br from-amber-50 to-amber-100', border: 'border-amber-200', accent: 'text-amber-600', hover: 'hover:border-amber-300', ring: 'ring-amber-500', headerBg: 'bg-amber-600', chartColor: '#F59E0B', chartColorLight: '#FCD34D', metricBg: 'bg-amber-50' },
  { bg: 'bg-gradient-to-br from-fuchsia-50 to-fuchsia-100', border: 'border-fuchsia-200', accent: 'text-fuchsia-600', hover: 'hover:border-fuchsia-300', ring: 'ring-fuchsia-500', headerBg: 'bg-fuchsia-600', chartColor: '#D946EF', chartColorLight: '#F0ABFC', metricBg: 'bg-fuchsia-50' },
  { bg: 'bg-gradient-to-br from-red-50 to-red-100', border: 'border-red-200', accent: 'text-red-600', hover: 'hover:border-red-300', ring: 'ring-red-500', headerBg: 'bg-red-600', chartColor: '#EF4444', chartColorLight: '#FCA5A5', metricBg: 'bg-red-50' },
  { bg: 'bg-gradient-to-br from-pink-50 to-pink-100', border: 'border-pink-200', accent: 'text-pink-600', hover: 'hover:border-pink-300', ring: 'ring-pink-500', headerBg: 'bg-pink-600', chartColor: '#EC4899', chartColorLight: '#F9A8D4', metricBg: 'bg-pink-50' },
  { bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100', border: 'border-yellow-200', accent: 'text-yellow-600', hover: 'hover:border-yellow-300', ring: 'ring-yellow-500', headerBg: 'bg-yellow-600', chartColor: '#EAB308', chartColorLight: '#FDE047', metricBg: 'bg-yellow-50' },
  { bg: 'bg-gradient-to-br from-lime-50 to-lime-100', border: 'border-lime-200', accent: 'text-lime-600', hover: 'hover:border-lime-300', ring: 'ring-lime-500', headerBg: 'bg-lime-600', chartColor: '#84CC16', chartColorLight: '#BEF264', metricBg: 'bg-lime-50' },
];

export const getTelecallerColorTheme = (rank: number) => TELECALLER_COLOR_THEMES[(rank - 1) % TELECALLER_COLOR_THEMES.length];

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return seconds + 's';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return hours + 'h ' + mins + 'm';
};

export const getMetricValue = (entry: TelecallerLeaderboardEntry, metric: TelecallerMetricType): string => {
  switch (metric) {
    case 'calls': return entry.metrics.totalCalls.toString();
    case 'conversions': return entry.metrics.convertedCount.toString();
    case 'interested': return entry.metrics.interestedCount.toString();
    case 'sentiment': return (entry.metrics.avgSentimentScore * 100).toFixed(0) + '%';
    default: return entry.metrics.totalCalls.toString();
  }
};

export const getMetricLabel = (metric: TelecallerMetricType): string => {
  const option = TELECALLER_METRIC_OPTIONS.find(o => o.id === metric);
  return option?.label || 'Calls';
};

export const getMockLeaderboard = (): TelecallerLeaderboardEntry[] => [
  { rank: 1, telecallerId: '1', telecallerName: 'Demo Telecaller 1', metrics: { totalCalls: 50, answeredCalls: 40, interestedCount: 10, convertedCount: 5, callbacksRequested: 8, noAnswerCount: 10, totalTalkTime: 3600, avgConversionRate: 12.5, avgAnswerRate: 80, avgSentimentScore: 0.6 } },
  { rank: 2, telecallerId: '2', telecallerName: 'Demo Telecaller 2', metrics: { totalCalls: 45, answeredCalls: 35, interestedCount: 8, convertedCount: 4, callbacksRequested: 6, noAnswerCount: 10, totalTalkTime: 3200, avgConversionRate: 11.4, avgAnswerRate: 77.8, avgSentimentScore: 0.5 } },
];

export const getMockTelecallerPerformance = (id: string) => ({
  telecallerId: id,
  period: { days: 30, startDate: new Date(), endDate: new Date() },
  totals: { totalCalls: 150, answeredCalls: 120, interestedCount: 30, convertedCount: 15, callbacksRequested: 20, totalTalkTime: 10800 },
  averages: { callsPerDay: 5, conversionRate: 12.5, answerRate: 80 },
  dailyTrend: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
    calls: Math.floor(Math.random() * 10) + 3,
    answered: Math.floor(Math.random() * 8) + 2,
    interested: Math.floor(Math.random() * 3),
    converted: Math.floor(Math.random() * 2),
    conversionRate: Math.random() * 20,
  })),
});
