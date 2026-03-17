/**
 * Lead Sources Hook
 * Manages state and data fetching for lead sources analytics
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../services/api';
import {
  LeadSourceData,
  PieChartDataItem,
  CombinedTrendDataPoint,
  CategoryFilter,
} from '../lead-sources.types';
import { CATEGORY_COLORS, getMockData } from '../lead-sources.constants';

export function useLeadSources() {
  const [data, setData] = useState<LeadSourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/lead-sources', {
        params: { days: dateRange },
      });
      setData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch lead source data:', error);
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pieChartData = useMemo<PieChartDataItem[]>(() => {
    if (!data) return [];
    return [
      { name: 'Social Media', value: data.socialMedia.total, color: CATEGORY_COLORS.socialMedia.primary },
      { name: 'AI Voice Agent', value: data.aiVoiceAgent.total, color: CATEGORY_COLORS.aiVoice.primary },
      { name: 'Other Sources', value: data.other.total, color: CATEGORY_COLORS.other.primary },
    ];
  }, [data]);

  const trendData = useMemo<CombinedTrendDataPoint[]>(() => {
    if (!data) return [];
    const socialTrend = data.socialMedia.trend;
    const aiTrend = data.aiVoiceAgent.trend;

    return socialTrend.map((item, index) => ({
      date: item.date,
      socialMedia: item.count,
      aiVoice: aiTrend[index]?.count || 0,
    }));
  }, [data]);

  return {
    data,
    loading,
    dateRange,
    selectedCategory,
    pieChartData,
    trendData,
    setDateRange,
    setSelectedCategory,
    fetchData,
  };
}
