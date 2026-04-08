/**
 * Advanced Analytics Dashboard
 * Comprehensive analytics with charts, funnels, and performance metrics
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Phone,
  Target,
  DollarSign,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Award,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import api from '../../services/api';

interface AnalyticsData {
  overview: {
    totalLeads: number;
    totalLeadsChange: number;
    convertedLeads: number;
    conversionRate: number;
    conversionRateChange: number;
    totalCalls: number;
    totalCallsChange: number;
    avgResponseTime: number;
    avgResponseTimeChange: number;
    revenue: number;
    revenueChange: number;
  };
  leadsBySource: { source: string; count: number; converted: number }[];
  leadsByStage: { stage: string; count: number; color: string }[];
  dailyTrend: { date: string; leads: number; conversions: number; calls: number }[];
  telecallerPerformance: {
    id: string;
    name: string;
    avatar?: string;
    calls: number;
    conversions: number;
    revenue: number;
    avgCallDuration: number;
  }[];
  funnelData: { stage: string; count: number; percentage: number }[];
  hourlyDistribution: { hour: number; calls: number; conversions: number }[];
}

const AdvancedAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // In real implementation, fetch from API
      // const response = await api.get(`/analytics/advanced?range=${dateRange}`);
      // setData(response.data.data);

      // Mock data for demonstration
      setData({
        overview: {
          totalLeads: 1247,
          totalLeadsChange: 12.5,
          convertedLeads: 186,
          conversionRate: 14.9,
          conversionRateChange: 2.3,
          totalCalls: 3421,
          totalCallsChange: -5.2,
          avgResponseTime: 4.2,
          avgResponseTimeChange: -15,
          revenue: 2450000,
          revenueChange: 18.7,
        },
        leadsBySource: [
          { source: 'JustDial', count: 342, converted: 48 },
          { source: 'IndiaMART', count: 289, converted: 52 },
          { source: 'Website', count: 198, converted: 31 },
          { source: '99Acres', count: 156, converted: 22 },
          { source: 'Facebook', count: 134, converted: 18 },
          { source: 'Referral', count: 128, converted: 15 },
        ],
        leadsByStage: [
          { stage: 'New', count: 423, color: '#3B82F6' },
          { stage: 'Contacted', count: 312, color: '#8B5CF6' },
          { stage: 'Qualified', count: 198, color: '#F59E0B' },
          { stage: 'Proposal', count: 156, color: '#10B981' },
          { stage: 'Negotiation', count: 89, color: '#EF4444' },
          { stage: 'Won', count: 69, color: '#22C55E' },
        ],
        dailyTrend: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
          leads: Math.floor(Math.random() * 100) + 50,
          conversions: Math.floor(Math.random() * 20) + 5,
          calls: Math.floor(Math.random() * 200) + 100,
        })),
        telecallerPerformance: [
          { id: '1', name: 'Rahul Kumar', calls: 145, conversions: 23, revenue: 345000, avgCallDuration: 4.5 },
          { id: '2', name: 'Priya Sharma', calls: 132, conversions: 21, revenue: 312000, avgCallDuration: 5.2 },
          { id: '3', name: 'Amit Singh', calls: 128, conversions: 19, revenue: 287000, avgCallDuration: 3.8 },
          { id: '4', name: 'Sneha Patel', calls: 118, conversions: 17, revenue: 256000, avgCallDuration: 4.1 },
          { id: '5', name: 'Vikram Reddy', calls: 105, conversions: 15, revenue: 223000, avgCallDuration: 4.8 },
        ],
        funnelData: [
          { stage: 'Visitors', count: 5420, percentage: 100 },
          { stage: 'Leads', count: 1247, percentage: 23 },
          { stage: 'Qualified', count: 512, percentage: 41 },
          { stage: 'Proposal', count: 245, percentage: 48 },
          { stage: 'Won', count: 186, percentage: 76 },
        ],
        hourlyDistribution: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          calls: i >= 9 && i <= 18 ? Math.floor(Math.random() * 50) + 20 : Math.floor(Math.random() * 10),
          conversions: i >= 10 && i <= 17 ? Math.floor(Math.random() * 5) + 1 : 0,
        })),
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    color,
    prefix = '',
    suffix = '',
  }: {
    title: string;
    value: number | string;
    change: number;
    icon: React.ElementType;
    color: string;
    prefix?: string;
    suffix?: string;
  }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-slate-900">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </div>
        <div className="text-sm text-slate-500 mt-1">{title}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Failed to load analytics</p>
          <button onClick={loadAnalytics} className="mt-4 text-primary-600 hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Advanced Analytics</h1>
            <p className="text-sm text-slate-500">Comprehensive insights into your sales performance</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <RefreshCw className={`w-5 h-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Leads"
            value={data.overview.totalLeads}
            change={data.overview.totalLeadsChange}
            icon={Users}
            color="bg-blue-500"
          />
          <StatCard
            title="Conversion Rate"
            value={data.overview.conversionRate}
            change={data.overview.conversionRateChange}
            icon={Target}
            color="bg-green-500"
            suffix="%"
          />
          <StatCard
            title="Total Calls"
            value={data.overview.totalCalls}
            change={data.overview.totalCallsChange}
            icon={Phone}
            color="bg-purple-500"
          />
          <StatCard
            title="Avg Response Time"
            value={data.overview.avgResponseTime}
            change={data.overview.avgResponseTimeChange}
            icon={Clock}
            color="bg-amber-500"
            suffix=" hrs"
          />
          <StatCard
            title="Revenue"
            value={formatCurrency(data.overview.revenue)}
            change={data.overview.revenueChange}
            icon={DollarSign}
            color="bg-emerald-500"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Sources */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Leads by Source</h3>
            <div className="space-y-3">
              {data.leadsBySource.map((source, index) => {
                const maxCount = Math.max(...data.leadsBySource.map((s) => s.count));
                const percentage = (source.count / maxCount) * 100;
                const conversionRate = ((source.converted / source.count) * 100).toFixed(1);

                return (
                  <div key={source.source}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{source.source}</span>
                      <span className="text-slate-500">
                        {source.count} leads • {conversionRate}% conv
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Conversion Funnel</h3>
            <div className="space-y-2">
              {data.funnelData.map((stage, index) => {
                const width = stage.percentage;
                const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500'];

                return (
                  <div key={stage.stage} className="relative">
                    <div
                      className={`${colors[index]} h-12 rounded-lg flex items-center justify-between px-4 text-white transition-all duration-500`}
                      style={{ width: `${width}%`, minWidth: '120px' }}
                    >
                      <span className="font-medium">{stage.stage}</span>
                      <span className="font-bold">{stage.count.toLocaleString()}</span>
                    </div>
                    {index < data.funnelData.length - 1 && (
                      <div className="absolute right-4 -bottom-2 text-xs text-slate-400">
                        ↓ {data.funnelData[index + 1].percentage}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Telecaller Performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Telecaller Performance</h3>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-slate-500">Top performers this period</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                  <th className="pb-3 font-medium">Rank</th>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium text-right">Calls</th>
                  <th className="pb-3 font-medium text-right">Conversions</th>
                  <th className="pb-3 font-medium text-right">Conv. Rate</th>
                  <th className="pb-3 font-medium text-right">Revenue</th>
                  <th className="pb-3 font-medium text-right">Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {data.telecallerPerformance.map((tc, index) => (
                  <tr key={tc.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-slate-200 text-slate-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                          {tc.name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-900">{tc.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-medium text-slate-900">{tc.calls}</td>
                    <td className="py-3 text-right font-medium text-green-600">{tc.conversions}</td>
                    <td className="py-3 text-right text-slate-600">
                      {((tc.conversions / tc.calls) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 text-right font-medium text-slate-900">{formatCurrency(tc.revenue)}</td>
                    <td className="py-3 text-right text-slate-600">{tc.avgCallDuration} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Trend & Hourly Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trend */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Trend</h3>
            <div className="h-64 flex items-end justify-between gap-2">
              {data.dailyTrend.map((day, index) => {
                const maxLeads = Math.max(...data.dailyTrend.map((d) => d.leads));
                const height = (day.leads / maxLeads) * 100;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: '200px' }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500"
                        style={{ height: `${height}%` }}
                      />
                      <div
                        className="absolute bottom-0 left-1/4 right-1/4 bg-green-500 rounded-t transition-all duration-500"
                        style={{ height: `${(day.conversions / maxLeads) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500">{day.date}</div>
                    <div className="text-xs font-medium text-slate-700">{day.leads}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-slate-600">Leads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-slate-600">Conversions</span>
              </div>
            </div>
          </div>

          {/* Lead Stages Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Lead Stages Distribution</h3>
            <div className="space-y-4">
              {data.leadsByStage.map((stage) => {
                const totalLeads = data.leadsByStage.reduce((sum, s) => sum + s.count, 0);
                const percentage = ((stage.count / totalLeads) * 100).toFixed(1);

                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="text-sm font-medium text-slate-700">{stage.stage}</span>
                      </div>
                      <div className="text-sm text-slate-500">
                        {stage.count} ({percentage}%)
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: stage.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Best Time to Call */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Best Time to Call (Hourly Distribution)</h3>
          <div className="h-32 flex items-end gap-1">
            {data.hourlyDistribution.map((hour) => {
              const maxCalls = Math.max(...data.hourlyDistribution.map((h) => h.calls));
              const height = maxCalls > 0 ? (hour.calls / maxCalls) * 100 : 0;
              const isPeakHour = hour.hour >= 10 && hour.hour <= 12 || hour.hour >= 15 && hour.hour <= 17;

              return (
                <div key={hour.hour} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isPeakHour ? 'bg-green-500' : 'bg-blue-400'
                    }`}
                    style={{ height: `${height}%`, minHeight: hour.calls > 0 ? '4px' : '0' }}
                    title={`${hour.hour}:00 - ${hour.calls} calls`}
                  />
                  {hour.hour % 3 === 0 && (
                    <span className="text-[10px] text-slate-400 mt-1">{hour.hour}:00</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-slate-600">Peak Hours (Best time)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-400" />
              <span className="text-slate-600">Regular Hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsPage;
