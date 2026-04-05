import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { TelecallerLeaderboardEntry, TelecallerPerformance, TelecallerMetricType, DateRangeType } from '../telecaller-performance.types';
import { getMockLeaderboard, getMockTelecallerPerformance } from '../telecaller-performance.constants';

export interface DailyReport {
  date: string;
  totals: {
    totalTelecallers: number;
    totalCalls: number;
    answered: number;
    // All call outcomes
    interested: number;
    notInterested: number;
    callback: number;
    converted: number;
    noAnswer: number;
    busy: number;
    wrongNumber: number;
    voicemail: number;
    totalDuration: number;
  };
  telecallers: Array<{
    telecallerId: string;
    telecallerName: string;
    branch: { id: string; name: string; code: string } | null;
    manager: { id: string; firstName: string; lastName: string } | null;
    stats: {
      totalCalls: number;
      answered: number;
      // All call outcomes
      interested: number;
      notInterested: number;
      callback: number;
      converted: number;
      noAnswer: number;
      busy: number;
      wrongNumber: number;
      voicemail: number;
      totalDuration: number;
      answerRate: number;
      conversionRate: number;
    };
  }>;
}

export function useTelecallerPerformance() {
  const [leaderboard, setLeaderboard] = useState<TelecallerLeaderboardEntry[]>([]);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [selectedTelecaller, setSelectedTelecaller] = useState<string | null>(null);
  const [telecallerPerformance, setTelecallerPerformance] = useState<TelecallerPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [metric, setMetric] = useState<TelecallerMetricType>('calls');
  const [dateRange, setDateRange] = useState<DateRangeType>('30');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchLeaderboard();
  }, [metric, dateRange]);

  useEffect(() => {
    if (selectedTelecaller) {
      fetchTelecallerPerformance(selectedTelecaller);
    }
  }, [selectedTelecaller, dateRange]);

  useEffect(() => {
    fetchDailyReport();
  }, [reportDate]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const response = await api.get('/telecaller-analytics/leaderboard', {
        params: { metric, startDate: startDate.toISOString(), limit: 50 },
      });

      const data = response.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        console.log('[TelecallerPerformance] Loaded real data:', data.length, 'telecallers');
        setLeaderboard(data);
      } else {
        console.log('[TelecallerPerformance] No API data, using mock data');
        setLeaderboard(getMockLeaderboard());
      }
    } catch (error: any) {
      console.error('[TelecallerPerformance] API error:', error?.response?.status || error.message);
      setLeaderboard(getMockLeaderboard());
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyReport = async () => {
    try {
      setDailyLoading(true);
      const response = await api.get('/telecaller-analytics/daily-report', {
        params: { date: reportDate },
      });

      const data = response.data?.data;
      if (data) {
        setDailyReport(data);
      }
    } catch (error: any) {
      console.error('[TelecallerPerformance] Daily report error:', error?.response?.status || error.message);
      setDailyReport(null);
    } finally {
      setDailyLoading(false);
    }
  };

  const fetchTelecallerPerformance = async (telecallerId: string) => {
    try {
      const response = await api.get('/telecaller-analytics/telecallers/' + telecallerId, {
        params: { days: dateRange },
      });
      setTelecallerPerformance(response.data.data);
    } catch (error) {
      console.error('Failed to fetch telecaller performance:', error);
      setTelecallerPerformance(getMockTelecallerPerformance(telecallerId));
    }
  };

  const getSelectedTelecallerEntry = () => leaderboard.find((e) => e.telecallerId === selectedTelecaller);

  return {
    leaderboard,
    dailyReport,
    selectedTelecaller,
    telecallerPerformance,
    loading,
    dailyLoading,
    metric,
    setMetric,
    dateRange,
    setDateRange,
    reportDate,
    setReportDate,
    setSelectedTelecaller,
    fetchLeaderboard,
    fetchDailyReport,
    getSelectedTelecallerEntry,
  };
}
