import { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Users,
  Zap,
  BarChart3
} from 'lucide-react';
import { predictiveAnalyticsService, PredictiveDashboard } from '../../services/predictive-analytics.service';

export default function PredictiveAnalyticsDashboard() {
  const [dashboard, setDashboard] = useState<PredictiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await predictiveAnalyticsService.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load predictive analytics dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCalculate = async () => {
    try {
      setCalculating(true);
      await predictiveAnalyticsService.batchCalculate(100);
      await loadDashboard();
    } catch (error) {
      console.error('Failed to batch calculate:', error);
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary-600" />
            Predictive Analytics
          </h1>
          <p className="text-gray-500 mt-1">AI-powered lead scoring, conversion prediction, and lifetime value analysis</p>
        </div>
        <button
          onClick={handleBatchCalculate}
          disabled={calculating}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
          {calculating ? 'Calculating...' : 'Recalculate All'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Predictions"
          value={dashboard?.totalPredictions || 0}
          color="blue"
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="Avg Conversion Score"
          value={`${(dashboard?.avgConversionScore || 0).toFixed(1)}%`}
          color="green"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Avg Churn Risk"
          value={`${(dashboard?.avgChurnRisk || 0).toFixed(1)}%`}
          color="red"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Predicted Value"
          value={`₹${((dashboard?.totalPredictedValue || 0) / 100000).toFixed(1)}L`}
          color="purple"
        />
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Score Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Conversion Score Distribution
          </h3>
          <div className="space-y-4">
            <DistributionBar
              label="High (70-100%)"
              value={dashboard?.conversionDistribution?.high || 0}
              total={dashboard?.totalPredictions || 1}
              color="bg-green-500"
            />
            <DistributionBar
              label="Medium (40-70%)"
              value={dashboard?.conversionDistribution?.medium || 0}
              total={dashboard?.totalPredictions || 1}
              color="bg-amber-500"
            />
            <DistributionBar
              label="Low (0-40%)"
              value={dashboard?.conversionDistribution?.low || 0}
              total={dashboard?.totalPredictions || 1}
              color="bg-red-500"
            />
          </div>
        </div>

        {/* Churn Risk Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            Churn Risk Distribution
          </h3>
          <div className="space-y-4">
            <DistributionBar
              label="High Risk (70-100%)"
              value={dashboard?.churnRiskDistribution?.high || 0}
              total={dashboard?.totalPredictions || 1}
              color="bg-red-500"
            />
            <DistributionBar
              label="Medium Risk (40-70%)"
              value={dashboard?.churnRiskDistribution?.medium || 0}
              total={dashboard?.totalPredictions || 1}
              color="bg-amber-500"
            />
            <DistributionBar
              label="Low Risk (0-40%)"
              value={dashboard?.churnRiskDistribution?.low || 0}
              total={dashboard?.totalPredictions || 1}
              color="bg-green-500"
            />
          </div>
        </div>
      </div>

      {/* Top Leads Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Conversion Leads */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            Top Conversion Prospects
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Lead</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-500">Score</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-500">Est. Value</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.topConversionLeads || []).map((lead, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-3 text-sm font-medium text-gray-900">{lead.leadName}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {lead.conversionScore.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 text-right text-sm text-gray-600">
                      ₹{lead.estimatedValue?.toLocaleString() || '0'}
                    </td>
                  </tr>
                ))}
                {(!dashboard?.topConversionLeads || dashboard.topConversionLeads.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-500">No data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* At-Risk Leads */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            At-Risk Leads
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Lead</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-500">Churn Risk</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.atRiskLeads || []).map((lead, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-3 text-sm font-medium text-gray-900">{lead.leadName}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        {lead.churnRisk.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-600 truncate max-w-[150px]">
                      {lead.nextBestAction || 'Schedule follow-up'}
                    </td>
                  </tr>
                ))}
                {(!dashboard?.atRiskLeads || dashboard.atRiskLeads.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-500">No at-risk leads</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color as keyof typeof colors]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DistributionBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
