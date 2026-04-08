/**
 * Sales Forecasting Page
 * Pipeline forecasting, win/loss analysis, and revenue predictions
 */

import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface PipelineData {
  totalLeads: number;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  stages: { stage: string; count: number; totalValue: number; weightedValue: number; probability: number }[];
}

interface MonthlyForecast {
  month: string;
  monthLabel: string;
  leadCount: number;
  forecast: number;
  bestCase: number;
  worstCase: number;
}

interface WinLossData {
  total: { won: number; lost: number; winRate: number };
  bySource: { source: string; won: number; lost: number; winRate: number }[];
  lossReasons: { reason: string; count: number }[];
}

interface AccuracyData {
  avgAccuracy: number;
  months: { month: string; monthLabel: string; forecasted: number; actual: number; accuracy: number }[];
}

interface RevenueTrend {
  month: string;
  monthLabel: string;
  conversions: number;
  revenue: number;
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function SalesForecastingPage() {
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [monthlyForecast, setMonthlyForecast] = useState<MonthlyForecast[]>([]);
  const [winLoss, setWinLoss] = useState<WinLossData | null>(null);
  const [accuracy, setAccuracy] = useState<AccuracyData | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrend[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pipelineRes, forecastRes, winLossRes, accuracyRes, trendRes] = await Promise.all([
        api.get('/sales-forecasting/pipeline'),
        api.get('/sales-forecasting/monthly'),
        api.get('/sales-forecasting/win-loss'),
        api.get('/sales-forecasting/accuracy'),
        api.get('/sales-forecasting/revenue-trend'),
      ]);

      setPipeline(pipelineRes.data.data);
      setMonthlyForecast(forecastRes.data.data);
      setWinLoss(winLossRes.data.data);
      setAccuracy(accuracyRes.data.data);
      setRevenueTrend(trendRes.data.data);
    } catch (error) {
      console.error('Failed to load forecasting data:', error);
      toast.error('Failed to load forecasting data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <ArrowPathIcon className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sales Forecasting</h1>
        <p className="text-slate-500 mt-1">Pipeline analysis, revenue forecasts, and win/loss insights</p>
      </div>

      {/* Summary Cards */}
      {pipeline && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pipeline Leads</p>
                <p className="text-xl font-bold text-slate-900">{pipeline.totalLeads}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Pipeline Value</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(pipeline.totalPipelineValue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Weighted Forecast</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(pipeline.weightedPipelineValue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                {winLoss && winLoss.total.winRate >= 50 ? (
                  <CheckCircleIcon className="w-5 h-5 text-orange-600" />
                ) : (
                  <XCircleIcon className="w-5 h-5 text-orange-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500">Win Rate</p>
                <p className="text-xl font-bold text-slate-900">{winLoss?.total.winRate || 0}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Forecast Chart */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Forecast</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}K`} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value) || 0), '']} />
                <Area type="monotone" dataKey="bestCase" stackId="1" stroke="#10B981" fill="#10B98120" name="Best Case" />
                <Area type="monotone" dataKey="forecast" stackId="2" stroke="#6366F1" fill="#6366F1" name="Forecast" />
                <Area type="monotone" dataKey="worstCase" stackId="3" stroke="#EF4444" fill="#EF444420" name="Worst Case" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline by Stage */}
        {pipeline && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Pipeline by Stage</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipeline.stages} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tickFormatter={(v) => `₹${v / 1000}K`} />
                  <YAxis dataKey="stage" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value) || 0), 'Value']} />
                  <Bar dataKey="weightedValue" fill="#6366F1" radius={[0, 4, 4, 0]} name="Weighted" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Win/Loss by Source */}
        {winLoss && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Win/Loss by Source</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={winLoss.bySource}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="won" fill="#10B981" name="Won" />
                  <Bar dataKey="lost" fill="#EF4444" name="Lost" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Loss Reasons */}
        {winLoss && winLoss.lossReasons.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Loss Reasons</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winLoss.lossReasons}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="count"
                    nameKey="reason"
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {winLoss.lossReasons.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue Trend (12 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}K`} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value) || 0), 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Forecast Accuracy */}
        {accuracy && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Forecast Accuracy
              <span className={`ml-2 text-sm font-medium px-2 py-1 rounded ${
                accuracy.avgAccuracy >= 80 ? 'bg-green-100 text-green-700' :
                accuracy.avgAccuracy >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              }`}>
                {accuracy.avgAccuracy}% avg
              </span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accuracy.months}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}K`} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value) || 0), '']} />
                  <Bar dataKey="forecasted" fill="#94A3B8" name="Forecasted" />
                  <Bar dataKey="actual" fill="#6366F1" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
